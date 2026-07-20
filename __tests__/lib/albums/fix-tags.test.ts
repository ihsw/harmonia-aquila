import { parseFile } from 'music-metadata'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { writeAudioTagFix } from '../../../src/lib/albums/audio-tags.js'
import { fixAlbumTags } from '../../../src/lib/albums/fix-tags.js'
import { createTempDir, createTempFile, makeAudioMetadata, removeTempDir } from '../../test-helpers.js'

vi.mock('music-metadata', () => ({
  parseFile: vi.fn(),
}))

vi.mock('../../../src/lib/albums/audio-tags.js', () => ({
  writeAudioTagFix: vi.fn(),
}))

const mockParseFile = vi.mocked(parseFile)
const mockWriteAudioTagFix = vi.mocked(writeAudioTagFix)

describe('fixAlbumTags', () => {
  let destDir: string
  let sourceDir: string

  beforeEach(async () => {
    sourceDir = await createTempDir('lib-fix-tags-src-')
    destDir = await createTempDir('lib-fix-tags-dst-')
    mockParseFile.mockReset()
    mockWriteAudioTagFix.mockReset()
  })

  afterEach(async () => {
    await removeTempDir(sourceDir)
    await removeTempDir(destDir)
    vi.restoreAllMocks()
  })

  it('plans album-artist and producer aggregation by grouping', async () => {
    await createTempFile(sourceDir, 'track01.flac')
    await createTempFile(sourceDir, 'track02.flac')
    mockParseFile
      .mockResolvedValueOnce(makeAudioMetadata({
        album: 'Old',
        artist: 'Artist B',
        grouping: 'Group',
        producer: ['Producer B'],
        title: 'Track 1',
      }))
      .mockResolvedValueOnce(makeAudioMetadata({
        album: 'Old',
        artist: 'Artist A',
        grouping: 'Group',
        producer: ['Producer A'],
        title: 'Track 2',
      }))

    const rows = await fixAlbumTags({
      albumArtistsStrategy: 'aggregate',
      destDir,
      producerStrategy: 'aggregate',
      sourceDir,
    })

    expect(rows).toEqual([
      expect.objectContaining({
        newAlbumartists: ['Artist A', 'Artist B'],
        newProducers: ['Producer A', 'Producer B'],
      }),
      expect.objectContaining({
        newAlbumartists: ['Artist A', 'Artist B'],
        newProducers: ['Producer A', 'Producer B'],
      }),
    ])
  })

  it('writes planned tag fixes during execute', async () => {
    await createTempFile(sourceDir, 'track01.flac')
    mockParseFile.mockResolvedValue(makeAudioMetadata({
      album: 'Old',
      artist: 'Artist',
      title: 'Title',
      track: { no: 9, of: null },
    }))

    await fixAlbumTags({
      destDir,
      execute: true,
      resetTrack: true,
      sourceDir,
    })

    const destinationPath = mockWriteAudioTagFix.mock.calls[0]?.[0]
    expect(destinationPath).toContain('track01.flac')
    expect(mockWriteAudioTagFix.mock.calls[0]?.[1]).toEqual({ trackNumber: 1 })
  })
})
