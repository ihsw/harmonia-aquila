import { parseFile } from 'music-metadata'
import { mkdir, readdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { writeAudioTagFix } from '../../../src/lib/albums/audio-tags.js'
import { organizeAlbumFiles } from '../../../src/lib/albums/organize-files.js'
import { createTempDir, createTempFile, makeAudioMetadata, removeTempDir } from '../../test-helpers.js'

vi.mock('music-metadata', () => ({ parseFile: vi.fn() }))
vi.mock('../../../src/lib/albums/audio-tags.js', () => ({ writeAudioTagFix: vi.fn() }))

describe('organize-files album-art execution', () => {
  let destDir: string
  let sourceDir: string

  beforeEach(async () => {
    sourceDir = await createTempDir('organize-art-exec-src-')
    destDir = await createTempDir('organize-art-exec-dst-')
    await createTempFile(sourceDir, 'track.flac', 'audio bytes')
    await createTempFile(sourceDir, 'cover.jpg', 'image bytes')
    vi.mocked(parseFile).mockReset().mockResolvedValue(makeAudioMetadata({
      album: 'Album', artist: 'Artist', title: 'Song', track: { no: 1, of: null },
    }))
    vi.mocked(writeAudioTagFix).mockReset()
  })

  afterEach(async () => {
    await removeTempDir(sourceDir)
    await removeTempDir(destDir)
    vi.restoreAllMocks()
  })

  it('copies image bytes without metadata writes and preserves both sources', async () => {
    const rows = await organizeAlbumFiles({ destDir, execute: true, sourceDir })

    expect(rows.map(row => [row.fileType, row.action])).toEqual([
      ['audio', 'copied'], ['albumArt', 'copied'],
    ])
    expect(await readFile(join(destDir, 'Artist/Album/cover.jpg'), 'utf8')).toBe('image bytes')
    expect(await readFile(join(sourceDir, 'cover.jpg'), 'utf8')).toBe('image bytes')
    expect(await readFile(join(sourceDir, 'track.flac'), 'utf8')).toBe('audio bytes')
    expect(writeAudioTagFix).not.toHaveBeenCalled()
  })

  it('applies ignore and overwrite semantics to image destinations', async () => {
    const albumDir = join(destDir, 'Artist/Album')
    await mkdir(albumDir, { recursive: true })
    await createTempFile(albumDir, 'cover.jpg', 'old image')
    await createTempFile(albumDir, 'notes.txt', 'unrelated')

    const ignored = await organizeAlbumFiles({
      destDir, destinationStrategy: 'ignore', sourceDir,
    })
    expect(ignored.at(-1)).toMatchObject({ action: 'would ignore', fileType: 'albumArt' })

    const overwritten = await organizeAlbumFiles({
      destDir, destinationStrategy: 'overwrite', execute: true, sourceDir,
    })
    expect(overwritten.at(-1)).toMatchObject({ action: 'overwritten', fileType: 'albumArt' })
    expect(await readFile(join(albumDir, 'cover.jpg'), 'utf8')).toBe('image bytes')
    expect(await readFile(join(albumDir, 'notes.txt'), 'utf8')).toBe('unrelated')
  })

  it('preflights the whole plan before writing when an album exists', async () => {
    const albumDir = join(destDir, 'Artist/Album')
    await mkdir(albumDir, { recursive: true })
    await createTempFile(albumDir, 'cover.jpg', 'existing')

    await expect(organizeAlbumFiles({ destDir, execute: true, sourceDir }))
      .rejects.toThrow('Destination album directories already exist')
    expect(await readdir(albumDir)).toEqual(['cover.jpg'])
  })

  it('cleans staged image files after publication failure without deleting content', async () => {
    const albumDir = join(destDir, 'Artist/Album')
    await mkdir(join(albumDir, 'cover.jpg'), { recursive: true })
    await createTempFile(albumDir, 'notes.txt', 'unrelated')

    await expect(organizeAlbumFiles({
      destDir, destinationStrategy: 'overwrite', execute: true, sourceDir,
    })).rejects.toThrow('Failed to organize album art "cover.jpg"')

    expect((await readdir(albumDir)).filter(name => name.startsWith('.cover.'))).toEqual([])
    expect(await readFile(join(albumDir, 'notes.txt'), 'utf8')).toBe('unrelated')
    expect(await readFile(join(sourceDir, 'cover.jpg'), 'utf8')).toBe('image bytes')
  })
})
