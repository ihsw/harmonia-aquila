import { parseFile } from 'music-metadata'
import { readdir } from 'node:fs/promises'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { writeAudioTagFix } from '../../../src/lib/albums/audio-tags.js'
import { organizeAlbumFiles } from '../../../src/lib/albums/organize-files.js'
import { createTempDir, createTempFile, makeAudioMetadata, removeTempDir } from '../../test-helpers.js'

vi.mock('music-metadata', () => ({ parseFile: vi.fn() }))
vi.mock('../../../src/lib/albums/audio-tags.js', () => ({ writeAudioTagFix: vi.fn() }))

type DiscTag = { no: number | null, of: number | null }

describe('organize-files allowMultipleAlbums', () => {
  let destDir: string
  let sourceDir: string

  beforeEach(async () => {
    sourceDir = await createTempDir('allow-multiple-src-')
    destDir = await createTempDir('allow-multiple-dst-')
    vi.mocked(parseFile).mockReset()
    vi.mocked(writeAudioTagFix).mockReset()
  })

  afterEach(async () => {
    await removeTempDir(sourceDir)
    await removeTempDir(destDir)
    vi.restoreAllMocks()
  })

  async function createFiles(...filenames: string[]): Promise<void> {
    await Promise.all(filenames.map(filename => createTempFile(sourceDir, filename, filename)))
  }

  function mockTrack(
    album: string,
    artist: string,
    track: number,
    disk: DiscTag = { no: null, of: null },
  ): void {
    vi.mocked(parseFile).mockResolvedValueOnce(makeAudioMetadata({
      album,
      artist,
      disk,
      title: `Track ${String(track)}`,
      track: { no: track, of: null },
    }))
  }

  it('organizes two albums whose track numbers both start at 1', async () => {
    await createFiles('a.flac', 'b.flac')
    mockTrack('Album A', 'Artist A', 1)
    mockTrack('Album B', 'Artist B', 1)

    const rows = await organizeAlbumFiles({ allowMultipleAlbums: true, destDir, sourceDir })

    expect(rows.map(row => row.destination)).toEqual([
      join('Artist A', 'Album A', '01 - Track 1.flac'),
      join('Artist B', 'Album B', '01 - Track 1.flac'),
    ])
  })

  it('rejects the repeated track numbers without the flag', async () => {
    await createFiles('a.flac', 'b.flac')
    mockTrack('Album A', 'Artist A', 1)
    mockTrack('Album B', 'Artist B', 1)

    await expect(organizeAlbumFiles({ destDir, sourceDir }))
      .rejects.toThrow('Duplicate track numbers were detected:')
  })

  it('organizes one album title held by two artists', async () => {
    await createFiles('a.mp3', 'b.mp3')
    mockTrack('ocremix.org', 'AmIEviL', 127)
    mockTrack('ocremix.org', 'The Fat Man', 741)

    const rows = await organizeAlbumFiles({ allowMultipleAlbums: true, destDir, sourceDir })

    expect(rows.map(row => row.destination)).toEqual([
      join('AmIEviL', 'ocremix.org', '127 - Track 127.mp3'),
      join('The Fat Man', 'ocremix.org', '741 - Track 741.mp3'),
    ])
  })

  it('keeps the multiple-album guard when the flag is absent', async () => {
    await createFiles('a.flac', 'b.flac')
    mockTrack('Album A', 'Artist', 1)
    mockTrack('Album B', 'Artist', 2)

    await expect(organizeAlbumFiles({ destDir, sourceDir }))
      .rejects.toThrow('Multiple albums found: Album A, Album B')
  })

  it('keeps the multiple-artist guard when the flag is absent', async () => {
    await createFiles('a.flac', 'b.flac')
    mockTrack('Album', 'Artist B', 1)
    mockTrack('Album', 'Artist A', 2)

    await expect(organizeAlbumFiles({ destDir, sourceDir }))
      .rejects.toThrow('Multiple artists resolve to the same album directory: Album (Artist A, Artist B)')
  })

  it('still rejects a repeated track number inside one destination album', async () => {
    await createFiles('a.flac', 'b.flac', 'c.flac')
    mockTrack('Album A', 'Artist A', 1)
    mockTrack('Album A', 'Artist A', 1)
    mockTrack('Album B', 'Artist B', 1)

    await expect(organizeAlbumFiles({ allowMultipleAlbums: true, destDir, sourceDir }))
      .rejects.toThrow('Duplicate track numbers were detected:')
  })

  it('decides multi-disc filename prefixes per destination album', async () => {
    await createFiles('a.flac', 'b.flac', 'c.flac')
    mockTrack('Album A', 'Artist A', 1, { no: 1, of: 2 })
    mockTrack('Album A', 'Artist A', 1, { no: 2, of: 2 })
    mockTrack('Album B', 'Artist B', 5)

    const rows = await organizeAlbumFiles({ allowMultipleAlbums: true, destDir, sourceDir })

    expect(rows.map(row => row.destination)).toEqual([
      join('Artist A', 'Album A', '101 - Track 1.flac'),
      join('Artist A', 'Album A', '201 - Track 1.flac'),
      join('Artist B', 'Album B', '05 - Track 5.flac'),
    ])
  })

  it('excludes album art when more than one album resolves', async () => {
    await createFiles('a.flac', 'b.flac', 'cover.jpg')
    mockTrack('Album A', 'Artist A', 1)
    mockTrack('Album B', 'Artist B', 1)

    const rows = await organizeAlbumFiles({ allowMultipleAlbums: true, destDir, sourceDir })

    expect(rows.at(-1)).toEqual({
      action: 'would exclude',
      destination: '',
      fileType: 'albumArt',
      filename: 'cover.jpg',
    })
  })

  it('keeps album art when the flag resolves only one album', async () => {
    await createFiles('a.flac', 'b.flac', 'cover.jpg')
    mockTrack('Album', 'Artist', 1)
    mockTrack('Album', 'Artist', 2)

    const rows = await organizeAlbumFiles({ allowMultipleAlbums: true, destDir, sourceDir })

    expect(rows.at(-1)).toEqual({
      action: 'would copy',
      destination: join('Artist', 'Album', 'cover.jpg'),
      fileType: 'albumArt',
      filename: 'cover.jpg',
    })
  })

  it('rejects the flag with sourceDirs before reading any file', async () => {
    const otherDir = await createTempDir('allow-multiple-other-')

    await expect(organizeAlbumFiles({
      allowMultipleAlbums: true,
      destDir,
      discStrategy: 'concatenate',
      sourceDirs: [sourceDir, otherDir],
    })).rejects.toThrow('--allow-multiple-albums requires sourceDir')
    expect(parseFile).not.toHaveBeenCalled()
    await removeTempDir(otherDir)
  })

  it('writes one tree per album and no art when executing', async () => {
    await createFiles('a.flac', 'b.flac', 'cover.jpg')
    mockTrack('Album A', 'Artist A', 1)
    mockTrack('Album B', 'Artist B', 1)

    await organizeAlbumFiles({ allowMultipleAlbums: true, destDir, execute: true, sourceDir })

    expect(await readdir(destDir)).toEqual(['Artist A', 'Artist B'])
    expect(await readdir(join(destDir, 'Artist A', 'Album A'))).toEqual(['01 - Track 1.flac'])
    expect(await readdir(join(destDir, 'Artist B', 'Album B'))).toEqual(['01 - Track 1.flac'])
    expect(writeAudioTagFix).not.toHaveBeenCalled()
  })
})
