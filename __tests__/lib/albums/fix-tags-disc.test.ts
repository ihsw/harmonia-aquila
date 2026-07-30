import { parseFile } from 'music-metadata'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { writeAudioTagFix } from '../../../src/lib/albums/audio-tags.js'
import { fixAlbumTags } from '../../../src/lib/albums/fix-tags.js'
import { createTempDir, createTempFile, makeAudioMetadata, removeTempDir } from '../../test-helpers.js'

vi.mock('music-metadata', () => ({ parseFile: vi.fn() }))
vi.mock('../../../src/lib/albums/audio-tags.js', () => ({ writeAudioTagFix: vi.fn() }))

describe('fixAlbumTags disc metadata', () => {
  let destDir: string
  let sourceDir: string

  beforeEach(async () => {
    sourceDir = await createTempDir('fix-disc-src-')
    destDir = await createTempDir('fix-disc-dst-')
    vi.mocked(parseFile).mockReset()
    vi.mocked(writeAudioTagFix).mockReset()
  })

  afterEach(async () => {
    await removeTempDir(sourceDir)
    await removeTempDir(destDir)
    vi.restoreAllMocks()
  })

  async function addTrack(filename: string): Promise<void> {
    await createTempFile(sourceDir, filename)
  }

  it('infers increasing filename-ordered runs in dry-run output', async () => {
    await Promise.all(['01.flac', '02.flac', '03.flac', '04.flac'].map(addTrack))
    vi.mocked(parseFile)
      .mockResolvedValueOnce(makeAudioMetadata({ album: 'A', artist: 'B', title: '1', track: { no: 1, of: null } }))
      .mockResolvedValueOnce(makeAudioMetadata({ album: 'A', artist: 'B', title: '2', track: { no: 2, of: null } }))
      .mockResolvedValueOnce(makeAudioMetadata({ album: 'A', artist: 'B', title: '3', track: { no: 1, of: null } }))
      .mockResolvedValueOnce(makeAudioMetadata({ album: 'A', artist: 'B', title: '4', track: { no: 2, of: null } }))

    const rows = await fixAlbumTags({ destDir, discStrategy: 'infer', sourceDir })

    expect(rows.map(row => [row.newDiscNumber, row.newDiscTotal])).toEqual([
      [1, 2],
      [1, 2],
      [2, 2],
      [2, 2],
    ])
  })

  it('rejects reset-track and contradictory existing metadata', async () => {
    await addTrack('a.flac')
    await addTrack('b.flac')
    await expect(fixAlbumTags({
      destDir,
      discStrategy: 'infer',
      resetTrack: true,
      sourceDir,
    })).rejects.toThrow('--reset-track')

    vi.mocked(parseFile)
      .mockResolvedValueOnce(makeAudioMetadata({ disk: { no: 2, of: 2 }, track: { no: 1, of: null } }))
      .mockResolvedValueOnce(makeAudioMetadata({ disk: { no: 2, of: 2 }, track: { no: 1, of: null } }))
    await expect(fixAlbumTags({ destDir, discStrategy: 'infer', sourceDir }))
      .rejects.toThrow('contradictory existing disc metadata')
  })

  it('writes and verifies inferred disc metadata in execute mode', async () => {
    await addTrack('a.flac')
    await addTrack('b.flac')
    vi.mocked(parseFile)
      .mockResolvedValueOnce(makeAudioMetadata({ title: 'A', track: { no: 1, of: null } }))
      .mockResolvedValueOnce(makeAudioMetadata({ title: 'B', track: { no: 1, of: null } }))
      .mockResolvedValueOnce(makeAudioMetadata({ disk: { no: 1, of: 2 } }))
      .mockResolvedValueOnce(makeAudioMetadata({ disk: { no: 2, of: 2 } }))

    await fixAlbumTags({ destDir, discStrategy: 'infer', execute: true, sourceDir })

    expect(vi.mocked(writeAudioTagFix).mock.calls.map(call => call[1])).toEqual([
      { discNumber: 1, discTotal: 2 },
      { discNumber: 2, discTotal: 2 },
    ])
  })

  it('fails execute when normalized metadata does not persist', async () => {
    await addTrack('a.flac')
    await addTrack('b.flac')
    vi.mocked(parseFile)
      .mockResolvedValueOnce(makeAudioMetadata({ title: 'A', track: { no: 1, of: null } }))
      .mockResolvedValueOnce(makeAudioMetadata({ title: 'B', track: { no: 1, of: null } }))
      .mockResolvedValue(makeAudioMetadata())

    await expect(fixAlbumTags({ destDir, discStrategy: 'infer', execute: true, sourceDir }))
      .rejects.toThrow('Failed to copy/fix tags')
  })
})
