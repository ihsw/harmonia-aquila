import { parseFile } from 'music-metadata'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { organizeAlbumFiles } from '../../../src/lib/albums/organize-files.js'
import { createTempDir, createTempFile, makeAudioMetadata, removeTempDir } from '../../test-helpers.js'

vi.mock('music-metadata', () => ({ parseFile: vi.fn() }))

describe('organize-files repaired disc metadata', () => {
  let destDir: string
  let sourceDir: string

  beforeEach(async () => {
    sourceDir = await createTempDir('organize-repaired-disc-src-')
    destDir = await createTempDir('organize-repaired-disc-dst-')
    await Promise.all(['01.flac', '02.flac', '03.flac', '04.flac']
      .map(filename => createTempFile(sourceDir, filename)))
    vi.mocked(parseFile).mockReset()
  })

  afterEach(async () => {
    await removeTempDir(sourceDir)
    await removeTempDir(destDir)
    vi.restoreAllMocks()
  })

  it('infers discs before deriving collision-free destinations', async () => {
    vi.mocked(parseFile)
      .mockResolvedValueOnce(metadata('One', 1))
      .mockResolvedValueOnce(metadata('Two', 2))
      .mockResolvedValueOnce(metadata('Three', 1))
      .mockResolvedValueOnce(metadata('Four', 2))

    const rows = (await organizeAlbumFiles({ destDir, discStrategy: 'infer', sourceDir }))
      .filter(row => row.fileType === 'audio')

    expect(rows.map(row => [row.destination, row.tagChanges.newDiscNumber, row.tagChanges.newDiscTotal]))
      .toEqual([
        ['Artist/Album/Disc 01/01 - One.flac', 1, 2],
        ['Artist/Album/Disc 01/02 - Two.flac', 1, 2],
        ['Artist/Album/Disc 02/01 - Three.flac', 2, 2],
        ['Artist/Album/Disc 02/02 - Four.flac', 2, 2],
      ])
  })

  it('rejects reset-track and contradictory existing metadata', async () => {
    await expect(organizeAlbumFiles({ destDir, discStrategy: 'infer', resetTrack: true, sourceDir }))
      .rejects.toThrow('--reset-track')

    vi.mocked(parseFile).mockResolvedValue(makeAudioMetadata({
      album: 'Album', artist: 'Artist', disk: { no: 2, of: 2 },
      title: 'Title', track: { no: 1, of: null },
    }))
    await expect(organizeAlbumFiles({ destDir, discStrategy: 'infer', sourceDir }))
      .rejects.toThrow('contradictory existing disc metadata')
  })

  function metadata(title: string, track: number) {
    return makeAudioMetadata({
      album: 'Album', artist: 'Artist', title, track: { no: track, of: null },
    })
  }
})
