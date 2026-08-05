import { parseFile } from 'music-metadata'
import { readdir } from 'node:fs/promises'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { organizeAlbumFiles } from '../../../src/lib/albums/organize-files.js'
import { createTempDir, createTempFile, makeAudioMetadata, removeTempDir } from '../../test-helpers.js'

vi.mock('music-metadata', () => ({ parseFile: vi.fn() }))

describe('organize-files disc metadata', () => {
  let sourceDir: string
  let destDir: string

  beforeEach(async () => {
    sourceDir = await createTempDir('organize-disc-src-')
    destDir = await createTempDir('organize-disc-dst-')
    await createTempFile(sourceDir, 'disc1.flac')
    await createTempFile(sourceDir, 'disc2.flac')
    vi.mocked(parseFile).mockReset()
  })

  afterEach(async () => {
    await removeTempDir(sourceDir)
    await removeTempDir(destDir)
    vi.restoreAllMocks()
  })

  it('embeds disc numbers in filenames for repeated tracks on distinct discs', async () => {
    vi.mocked(parseFile)
      .mockResolvedValueOnce(makeAudioMetadata({
        album: 'Album',
        artist: 'Artist',
        disk: { no: 1, of: 2 },
        title: 'First',
        track: { no: 1, of: null },
      }))
      .mockResolvedValueOnce(makeAudioMetadata({
        album: 'Album',
        artist: 'Artist',
        disk: { no: 2, of: 2 },
        title: 'Second',
        track: { no: 1, of: null },
      }))

    const rows = (await organizeAlbumFiles({ destDir, sourceDir }))
      .filter(row => row.fileType === 'audio')

    expect(rows.map(row => [row.destination, row.discNumber, row.discTotal])).toEqual([
      ['Artist/Album/101 - First.flac', '01', '02'],
      ['Artist/Album/201 - Second.flac', '02', '02'],
    ])
  })

  it('rejects repeated tracks without discs before writing', async () => {
    vi.mocked(parseFile).mockResolvedValue(makeAudioMetadata({
      album: 'Album',
      artist: 'Artist',
      title: 'Track',
      track: { no: 1, of: null },
    }))

    await expect(organizeAlbumFiles({ destDir, execute: true, sourceDir }))
      .rejects.toThrow('missing disc number')
    expect(await readdir(destDir)).toEqual([])
  })
})
