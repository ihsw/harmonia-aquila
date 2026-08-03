import { parseFile } from 'music-metadata'
import { mkdir, readdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { writeAudioTagFix } from '../../../src/lib/albums/audio-tags.js'
import { organizeAlbumFiles } from '../../../src/lib/albums/organize-files.js'
import { createTempDir, createTempFile, makeAudioMetadata, removeTempDir } from '../../test-helpers.js'

vi.mock('music-metadata', () => ({ parseFile: vi.fn() }))
vi.mock('../../../src/lib/albums/audio-tags.js', () => ({ writeAudioTagFix: vi.fn() }))

const BASE = { album: 'Album', artist: 'Artist' }

function meta(title: string, track: number, disc?: { no: number, of: number }) {
  return makeAudioMetadata({ ...BASE, disk: disc ?? { no: null, of: null }, title, track: { no: track, of: null } })
}

describe('organize-files concatenate execution', () => {
  let destDir: string
  let firstDir: string
  let secondDir: string

  beforeEach(async () => {
    destDir = await createTempDir('concat-exec-dst-')
    firstDir = await createTempDir('concat-exec-first-')
    secondDir = await createTempDir('concat-exec-second-')
    vi.mocked(parseFile).mockReset()
    vi.mocked(writeAudioTagFix).mockReset()
  })

  afterEach(async () => {
    await Promise.all([removeTempDir(destDir), removeTempDir(firstDir), removeTempDir(secondDir)])
    vi.restoreAllMocks()
  })

  it('passes clear disc intent and global tracks to tag writer, leaves sources intact', async () => {
    await Promise.all([
      createTempFile(firstDir, 'track1.flac', 'src-1'),
      createTempFile(secondDir, 'track1.flac', 'src-2'),
    ])
    vi.mocked(parseFile)
      // source reads (2 files)
      .mockResolvedValueOnce(meta('One', 1, { no: 1, of: 2 }))
      .mockResolvedValueOnce(meta('Two', 1, { no: 2, of: 2 }))
      // verifyTagFix reads after writeAudioTagFix (2 files)
      .mockResolvedValueOnce(meta('One', 1)) // disc cleared → disk defaults null
      .mockResolvedValueOnce(meta('Two', 2)) // global track 2, disc null

    const rows = await organizeAlbumFiles({
      destDir, discStrategy: 'concatenate', execute: true, sourceDirs: [firstDir, secondDir],
    })

    const audioRows = rows.filter(r => r.fileType === 'audio')
    expect(audioRows.map(r => r.destination)).toEqual([
      'Artist/Album/01 - One.flac',
      'Artist/Album/02 - Two.flac',
    ])
    expect(audioRows.every(r => !r.destination.includes('Disc'))).toBe(true)
    expect(audioRows.map(r => [r.discNumber, r.discTotal])).toEqual([['', ''], ['', '']])

    const calls = vi.mocked(writeAudioTagFix).mock.calls
    expect(calls[0]?.[1]).toMatchObject({ discNumber: { kind: 'clear' }, discTotal: { kind: 'clear' }, trackNumber: 1 })
    expect(calls[1]?.[1]).toMatchObject({ discNumber: { kind: 'clear' }, discTotal: { kind: 'clear' }, trackNumber: 2 })

    expect(await readFile(join(firstDir, 'track1.flac'), 'utf8')).toBe('src-1')
    expect(await readFile(join(secondDir, 'track1.flac'), 'utf8')).toBe('src-2')
  })

  it('atomically rejects art collision before any write when strategy is missing', async () => {
    await Promise.all([
      createTempFile(firstDir, 'track1.flac'),
      createTempFile(firstDir, 'cover.jpg'),
      createTempFile(secondDir, 'track1.flac'),
      createTempFile(secondDir, 'cover.jpg'),
    ])
    vi.mocked(parseFile)
      .mockResolvedValueOnce(meta('One', 1))
      .mockResolvedValueOnce(meta('Two', 1))

    await expect(organizeAlbumFiles({
      destDir, discStrategy: 'concatenate', execute: true, sourceDirs: [firstDir, secondDir],
    })).rejects.toThrow('--album-art-strategy')

    expect(await readdir(destDir)).toEqual([])
    expect(writeAudioTagFix).not.toHaveBeenCalled()
  })

  it('atomically rejects on destination conflict, writing nothing', async () => {
    await Promise.all([
      createTempFile(firstDir, 'track1.flac', 'src-1'),
      createTempFile(secondDir, 'track1.flac', 'src-2'),
    ])
    vi.mocked(parseFile)
      .mockResolvedValueOnce(meta('One', 1))
      .mockResolvedValueOnce(meta('Two', 1))

    const albumDir = join(destDir, 'Artist/Album')
    await mkdir(albumDir, { recursive: true })

    await expect(organizeAlbumFiles({
      destDir, discStrategy: 'concatenate', execute: true, sourceDirs: [firstDir, secondDir],
    })).rejects.toThrow('Destination album directories already exist')

    expect(await readdir(albumDir)).toEqual([])
    expect(writeAudioTagFix).not.toHaveBeenCalled()
  })

  it('selects last-strategy art, keeps unique non-colliding art, and neither excludes all collision members', async () => {
    await Promise.all([
      createTempFile(firstDir, 'track1.flac'),
      createTempFile(firstDir, 'cover.jpg'),
      createTempFile(secondDir, 'track1.flac'),
      createTempFile(secondDir, 'cover.jpg'),
      createTempFile(secondDir, 'unique.png'),
    ])
    vi.mocked(parseFile)
      .mockResolvedValueOnce(meta('One', 1))
      .mockResolvedValueOnce(meta('Two', 1))

    const lastRows = await organizeAlbumFiles({
      albumArtStrategy: 'last',
      destDir, discStrategy: 'concatenate', sourceDirs: [firstDir, secondDir],
    })

    const artRows = lastRows.filter(r => r.fileType === 'albumArt')
    expect(artRows.map(r => [r.filename, r.action, r.sourceDirectory?.endsWith('first-') ?? r.sourceDirectory?.endsWith('second-')])).toMatchObject([
      ['cover.jpg', 'would exclude', expect.anything()],
      ['cover.jpg', 'would copy', expect.anything()],
      ['unique.png', 'would copy', expect.anything()],
    ])
    expect(artRows[0]?.sourceDirectory).toContain('first')
    expect(artRows[1]?.sourceDirectory).toContain('second')

    vi.mocked(parseFile)
      .mockResolvedValueOnce(meta('One', 1))
      .mockResolvedValueOnce(meta('Two', 1))

    const neitherRows = await organizeAlbumFiles({
      albumArtStrategy: 'neither',
      destDir, discStrategy: 'concatenate', sourceDirs: [firstDir, secondDir],
    })

    const neitherArt = neitherRows.filter(r => r.fileType === 'albumArt')
    const collisionRows = neitherArt.filter(r => r.filename === 'cover.jpg')
    expect(collisionRows.map(r => r.action)).toEqual(['would exclude', 'would exclude'])
    expect(neitherArt.find(r => r.filename === 'unique.png')?.action).toBe('would copy')
  })

  it('singular mode: sourceDirectory absent, existing art and audio behavior unchanged', async () => {
    await Promise.all([
      createTempFile(firstDir, 'track1.flac'),
      createTempFile(firstDir, 'cover.jpg'),
    ])
    vi.mocked(parseFile).mockResolvedValue(meta('Song', 1))

    const rows = await organizeAlbumFiles({ destDir, sourceDir: firstDir })

    for (const row of rows) {
      expect(row.sourceDirectory).toBeUndefined()
    }
    expect(rows.map(r => r.fileType)).toEqual(['audio', 'albumArt'])
    expect(rows[0]).toMatchObject({ action: 'would copy', discNumber: '', discTotal: '' })
  })
})
