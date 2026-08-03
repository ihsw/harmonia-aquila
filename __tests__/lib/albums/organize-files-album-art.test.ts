import { parseFile } from 'music-metadata'
import { readdir, readFile } from 'node:fs/promises'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { writeAudioTagFix } from '../../../src/lib/albums/audio-tags.js'
import { organizeAlbumFiles } from '../../../src/lib/albums/organize-files.js'
import { createTempDir, createTempFile, makeAudioMetadata, removeTempDir } from '../../test-helpers.js'

vi.mock('music-metadata', () => ({ parseFile: vi.fn() }))
vi.mock('../../../src/lib/albums/audio-tags.js', () => ({ writeAudioTagFix: vi.fn() }))

describe('organize-files album-art plans', () => {
  let destDir: string
  let sourceDir: string

  beforeEach(async () => {
    sourceDir = await createTempDir('organize-art-src-')
    destDir = await createTempDir('organize-art-dst-')
    vi.mocked(parseFile).mockReset()
    vi.mocked(writeAudioTagFix).mockReset()
  })

  afterEach(async () => {
    await removeTempDir(sourceDir)
    await removeTempDir(destDir)
    vi.restoreAllMocks()
  })

  it('places sorted art after repaired audio rows at the album root', async () => {
    await Promise.all([
      createTempFile(sourceDir, 'track.flac', 'audio'),
      createTempFile(sourceDir, 'z.JPG', 'z'),
      createTempFile(sourceDir, 'A.png', 'a'),
      createTempFile(sourceDir, 'a.PNG', 'lower'),
    ])
    vi.mocked(parseFile).mockResolvedValue(makeAudioMetadata({
      album: 'Old', artist: 'Artist', disk: { no: 1, of: 2 }, title: 'Song', track: { no: 1, of: null },
    }))

    const rows = await organizeAlbumFiles({ destDir, setAlbum: 'New', sourceDir })

    expect(rows.map(row => [row.fileType, row.destination])).toEqual([
      ['audio', 'Artist/New/Disc 01/01 - Song.flac'],
      ['albumArt', 'Artist/New/A.png'],
      ['albumArt', 'Artist/New/a.PNG'],
      ['albumArt', 'Artist/New/z.JPG'],
    ])
    expect(rows[1]).toEqual({
      action: 'would copy', destination: 'Artist/New/A.png', fileType: 'albumArt', filename: 'A.png',
    })
    expect(await readFile(`${sourceDir}/A.png`, 'utf8')).toBe('a')
    expect(await readdir(destDir)).toEqual([])
    expect(writeAudioTagFix).not.toHaveBeenCalled()
  })

  it('does not plan art when the audio limit selects nothing', async () => {
    await createTempFile(sourceDir, 'track.flac')
    await createTempFile(sourceDir, 'cover.jpg')

    const rows = await organizeAlbumFiles({ destDir, limit: '0', sourceDir })

    expect(rows).toEqual([])
    expect(parseFile).not.toHaveBeenCalled()
  })

  it('keeps unsupported sidecars strict while accepting recognized art', async () => {
    await createTempFile(sourceDir, 'track.mp3')
    await createTempFile(sourceDir, 'cover.webp')
    await createTempFile(sourceDir, 'booklet.pdf')

    await expect(organizeAlbumFiles({ destDir, sourceDir })).rejects.toThrow('booklet.pdf')
    vi.mocked(parseFile).mockResolvedValue(makeAudioMetadata({
      album: 'Album', artist: 'Artist', title: 'Song', track: { no: 1, of: null },
    }))
    const rows = await organizeAlbumFiles({ destDir, ignoreNonAudioFiles: true, sourceDir })

    expect(rows.at(-1)).toMatchObject({ fileType: 'albumArt', filename: 'cover.webp' })
  })

  it('singular mode preserves exact filenames without sanitization or collision grouping', async () => {
    await Promise.all([
      createTempFile(sourceDir, 'track.flac'),
      createTempFile(sourceDir, 'cover<A>.jpg'),
      createTempFile(sourceDir, 'cover-A-.jpg'),
    ])
    vi.mocked(parseFile).mockResolvedValue(makeAudioMetadata({
      album: 'Album', artist: 'Artist', title: 'Song', track: { no: 1, of: null },
    }))

    const rows = await organizeAlbumFiles({ destDir, sourceDir })

    const artRows = rows.filter(r => r.fileType === 'albumArt')
    expect(artRows.map(r => r.filename).sort()).toEqual(['cover-A-.jpg', 'cover<A>.jpg'])
    expect(artRows.map(r => r.destination)).toContain('Artist/Album/cover<A>.jpg')
    expect(artRows.map(r => r.destination)).toContain('Artist/Album/cover-A-.jpg')
    expect(artRows.every(r => r.action === 'would copy')).toBe(true)
  })
})
