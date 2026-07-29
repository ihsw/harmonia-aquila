import { parseFile } from 'music-metadata'
import { readdir } from 'node:fs/promises'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { pathExists } from '../../../src/command-utils.js'
import { organizeAlbumFiles } from '../../../src/lib/albums/organize-files.js'
import { validateAlbumSourceDir } from '../../../src/lib/albums/validate.js'
import { createTempDir, createTempFile, makeAudioMetadata, removeTempDir } from '../../test-helpers.js'

vi.mock('music-metadata', () => ({
  parseFile: vi.fn(),
}))
vi.mock('../../../src/command-utils.js', () => ({
  pathExists: vi.fn().mockResolvedValue(false),
}))

describe('single album organization guard', () => {
  let sourceDir: string
  let destDir: string

  beforeEach(async () => {
    sourceDir = await createTempDir('multiple-album-source-')
    destDir = await createTempDir('multiple-album-dest-')
    vi.mocked(parseFile).mockReset()
    vi.mocked(pathExists).mockClear()
  })

  afterEach(async () => {
    await removeTempDir(sourceDir)
    await removeTempDir(destDir)
    vi.restoreAllMocks()
  })

  async function createTracks(...filenames: string[]): Promise<void> {
    await Promise.all(filenames.map(filename => createTempFile(sourceDir, filename)))
  }

  function mockTrack(album: string, artist: string, track: number, title = `Track ${String(track)}`): void {
    vi.mocked(parseFile).mockResolvedValueOnce(makeAudioMetadata({
      album,
      artist,
      title,
      track: { no: track, of: null },
    }))
  }

  it('allows empty and single album selections', async () => {
    await expect(validateAlbumSourceDir({ dirName: sourceDir })).resolves.toEqual([])
    await createTracks('a.flac')
    mockTrack('Album', 'Artist', 1)
    await expect(validateAlbumSourceDir({ dirName: sourceDir })).resolves.toHaveLength(1)
  })

  it('rejects multiple normalized albums during validation', async () => {
    await createTracks('a.flac', 'b.flac')
    mockTrack('Album B', 'Artist', 1)
    mockTrack('Album A', 'Artist', 2)

    await expect(validateAlbumSourceDir({ dirName: sourceDir }))
      .rejects.toThrow('Multiple albums found: Album A, Album B')
  })

  it.each([false, true])('rejects before destination inspection or writes when execute is %s', async (execute) => {
    await createTracks('a.flac', 'b.flac')
    mockTrack('Album B', 'Artist', 1)
    mockTrack('Album A', 'Artist', 2)

    await expect(organizeAlbumFiles({ destDir, execute, sourceDir }))
      .rejects.toThrow('Multiple albums found: Album A, Album B')
    expect(pathExists).not.toHaveBeenCalled()
    expect(await readdir(destDir)).toEqual([])
  })

  it('treats raw album values that sanitize alike as one album', async () => {
    await createTracks('a.flac', 'b.flac')
    mockTrack('Same/Album', 'Artist', 1)
    mockTrack('Same:Album', 'Artist', 2)

    await expect(validateAlbumSourceDir({ dirName: sourceDir })).resolves.toHaveLength(2)
    vi.mocked(parseFile).mockReset()
    mockTrack('Same/Album', 'Artist', 1)
    mockTrack('Same:Album', 'Artist', 2)
    await expect(organizeAlbumFiles({ destDir, sourceDir })).resolves.toHaveLength(2)
  })

  it('applies limit before the album guard', async () => {
    await createTracks('a.flac', 'b.flac')
    mockTrack('Album A', 'Artist', 1)

    await expect(validateAlbumSourceDir({ dirName: sourceDir, limit: '1' })).resolves.toHaveLength(1)
    expect(parseFile).toHaveBeenCalledTimes(1)
  })

  it('allows multiple distinct tracks from one album', async () => {
    await createTracks('a.flac', 'b.flac')
    mockTrack('Album', 'Artist', 1)
    mockTrack('Album', 'Artist', 2)

    await expect(organizeAlbumFiles({ destDir, sourceDir })).resolves.toHaveLength(2)
  })

  it('gives multiple albums precedence over multiple artists', async () => {
    await createTracks('a.flac', 'b.flac', 'c.flac')
    mockTrack('Album A', 'Artist A', 1)
    mockTrack('Album A', 'Artist B', 2)
    mockTrack('Album B', 'Artist C', 3)

    await expect(organizeAlbumFiles({ destDir, sourceDir }))
      .rejects.toThrow('Multiple albums found: Album A, Album B')
  })

  it('preserves the existing one-album multiple-artist error', async () => {
    await createTracks('a.flac', 'b.flac')
    mockTrack('Album', 'Artist B', 1)
    mockTrack('Album', 'Artist A', 2)

    await expect(validateAlbumSourceDir({ dirName: sourceDir })).rejects.toThrow(
      'Multiple artists resolve to the same album directory: Album (Artist A, Artist B)',
    )
  })

  it('does not create album identities from invalid validation rows', async () => {
    await createTracks('a.flac', 'b.flac')
    mockTrack('Album A', 'Artist', 1)
    vi.mocked(parseFile).mockResolvedValueOnce(makeAudioMetadata({
      album: 'Album B',
      artist: 'Artist',
      title: 'Missing track',
    }))

    const rows = await validateAlbumSourceDir({ dirName: sourceDir })

    expect(rows.map(row => row.status)).toEqual(['valid', 'invalid'])
  })
})
