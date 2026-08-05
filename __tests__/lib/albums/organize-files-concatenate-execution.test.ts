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

  it('preserves correct disc metadata and local tracks without redundant tag writes', async () => {
    await Promise.all([
      createTempFile(firstDir, 'track1.flac', 'src-1'),
      createTempFile(secondDir, 'track1.flac', 'src-2'),
    ])
    vi.mocked(parseFile)
      .mockResolvedValueOnce(meta('One', 1, { no: 1, of: 2 }))
      .mockResolvedValueOnce(meta('Two', 1, { no: 2, of: 2 }))

    const rows = await organizeAlbumFiles({
      destDir, discStrategy: 'concatenate', execute: true, sourceDirs: [firstDir, secondDir],
    })

    const audioRows = rows.filter(r => r.fileType === 'audio')
    expect(audioRows.map(r => r.destination)).toEqual([
      'Artist/Album/101 - One.flac',
      'Artist/Album/201 - Two.flac',
    ])
    expect(audioRows.every(r => !r.destination.includes('Disc'))).toBe(true)
    expect(audioRows.map(r => [r.trackNumber, r.discNumber, r.discTotal])).toEqual([
      ['01', '01', '02'], ['01', '02', '02'],
    ])
    expect(writeAudioTagFix).not.toHaveBeenCalled()

    expect(await readFile(join(firstDir, 'track1.flac'), 'utf8')).toBe('src-1')
    expect(await readFile(join(secondDir, 'track1.flac'), 'utf8')).toBe('src-2')
  })

  it.each(['flac', 'mp3'])('writes and verifies canonical disc tags for %s destination copies', async (extension) => {
    await Promise.all([
      createTempFile(firstDir, `track1.${extension}`, 'src-1'),
      createTempFile(secondDir, `track1.${extension}`, 'src-2'),
    ])
    vi.mocked(parseFile)
      .mockResolvedValueOnce(meta('One', 1))
      .mockResolvedValueOnce(meta('Two', 1, { no: 1, of: 9 }))
      .mockResolvedValueOnce(meta('One', 1, { no: 1, of: 2 }))
      .mockResolvedValueOnce(meta('Two', 1, { no: 2, of: 2 }))

    const rows = await organizeAlbumFiles({
      destDir, discStrategy: 'concatenate', execute: true, sourceDirs: [firstDir, secondDir],
    })

    const audioRows = rows.filter(r => r.fileType === 'audio')
    expect(audioRows.map(r => [r.trackNumber, r.discNumber, r.discTotal])).toEqual([
      ['01', '01', '02'], ['01', '02', '02'],
    ])
    const calls = vi.mocked(writeAudioTagFix).mock.calls
    expect(calls[0]?.[0]).toMatch(new RegExp(`\\.${extension}$`))
    expect(calls[0]?.[1]).toEqual({
      discNumber: { kind: 'set', value: 1 }, discTotal: { kind: 'set', value: 2 },
    })
    expect(calls[1]?.[0]).toMatch(new RegExp(`\\.${extension}$`))
    expect(calls[1]?.[1]).toEqual({
      discNumber: { kind: 'set', value: 2 }, discTotal: { kind: 'set', value: 2 },
    })
    expect(await readFile(join(firstDir, `track1.${extension}`), 'utf8')).toBe('src-1')
    expect(await readFile(join(secondDir, `track1.${extension}`), 'utf8')).toBe('src-2')
  })

  it('writes both discs when local track numbers and titles are identical', async () => {
    await Promise.all([
      createTempFile(firstDir, 'track1.flac', 'src-1'),
      createTempFile(secondDir, 'track1.flac', 'src-2'),
    ])
    vi.mocked(parseFile)
      .mockResolvedValueOnce(meta('Same', 1))
      .mockResolvedValueOnce(meta('Same', 1))
      .mockResolvedValueOnce(meta('Same', 1, { no: 1, of: 2 }))
      .mockResolvedValueOnce(meta('Same', 1, { no: 2, of: 2 }))

    const rows = await organizeAlbumFiles({
      destDir, discStrategy: 'concatenate', execute: true, sourceDirs: [firstDir, secondDir],
    })

    const audioRows = rows.filter(r => r.fileType === 'audio')
    expect(audioRows.map(r => r.destination)).toEqual([
      'Artist/Album/101 - Same.flac',
      'Artist/Album/201 - Same.flac',
    ])
    expect((await readdir(join(destDir, 'Artist/Album'))).sort()).toEqual([
      '101 - Same.flac',
      '201 - Same.flac',
    ])
    expect(await readFile(join(destDir, 'Artist/Album/101 - Same.flac'), 'utf8')).toBe('src-1')
    expect(await readFile(join(destDir, 'Artist/Album/201 - Same.flac'), 'utf8')).toBe('src-2')
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

  it('executes a fully tagless two-disc source using setMetadata, writing records plus order-derived disc tags', async () => {
    await Promise.all([
      createTempFile(firstDir, 'one.flac', 'src-1'),
      createTempFile(secondDir, 'two.flac', 'src-2'),
    ])
    vi.mocked(parseFile)
      .mockResolvedValueOnce(makeAudioMetadata())
      .mockResolvedValueOnce(makeAudioMetadata())
      .mockResolvedValueOnce(meta('One', 1, { no: 1, of: 2 }))
      .mockResolvedValueOnce(meta('Two', 1, { no: 2, of: 2 }))

    const rows = await organizeAlbumFiles({
      destDir,
      discStrategy: 'concatenate',
      execute: true,
      setMetadataRecords: [
        { album: 'Album', artist: 'Artist', filename: 'one.flac', title: 'One', trackNumber: 1 },
        { album: 'Album', artist: 'Artist', filename: 'two.flac', title: 'Two', trackNumber: 1 },
      ],
      sourceDirs: [firstDir, secondDir],
    })

    const audioRows = rows.filter(r => r.fileType === 'audio')
    expect(audioRows.map(r => [r.destination, r.trackNumber, r.discNumber, r.discTotal])).toEqual([
      ['Artist/Album/101 - One.flac', '01', '01', '02'],
      ['Artist/Album/201 - Two.flac', '01', '02', '02'],
    ])
    const calls = vi.mocked(writeAudioTagFix).mock.calls
    expect(calls[0]?.[1]).toEqual({
      album: 'Album',
      artists: ['Artist'],
      discNumber: { kind: 'set', value: 1 },
      discTotal: { kind: 'set', value: 2 },
      title: 'One',
      trackNumber: 1,
    })
    expect(calls[1]?.[1]).toEqual({
      album: 'Album',
      artists: ['Artist'],
      discNumber: { kind: 'set', value: 2 },
      discTotal: { kind: 'set', value: 2 },
      title: 'Two',
      trackNumber: 1,
    })
    expect(await readFile(join(destDir, 'Artist/Album/101 - One.flac'), 'utf8')).toBe('src-1')
    expect(await readFile(join(destDir, 'Artist/Album/201 - Two.flac'), 'utf8')).toBe('src-2')
  })

  it('atomically rejects setMetadata disc fields under concatenate, writing nothing', async () => {
    await Promise.all([
      createTempFile(firstDir, 'one.flac'),
      createTempFile(secondDir, 'two.flac'),
    ])
    vi.mocked(parseFile).mockResolvedValue(makeAudioMetadata())

    await expect(organizeAlbumFiles({
      destDir,
      discStrategy: 'concatenate',
      execute: true,
      setMetadataRecords: [
        { album: 'Album', artist: 'Artist', discNumber: 1, filename: 'one.flac', title: 'One', trackNumber: 1 },
        { album: 'Album', artist: 'Artist', filename: 'two.flac', title: 'Two', trackNumber: 1 },
      ],
      sourceDirs: [firstDir, secondDir],
    })).rejects.toThrow('discNumber/discTotal')

    expect(await readdir(destDir)).toEqual([])
    expect(writeAudioTagFix).not.toHaveBeenCalled()
  })

  it('atomically rejects an ambiguous filename across sourceDirs under setMetadata, writing nothing', async () => {
    await Promise.all([
      createTempFile(firstDir, 'track.flac'),
      createTempFile(secondDir, 'track.flac'),
    ])
    vi.mocked(parseFile).mockResolvedValue(makeAudioMetadata())

    await expect(organizeAlbumFiles({
      destDir,
      discStrategy: 'concatenate',
      execute: true,
      setMetadataRecords: [
        { album: 'Album', artist: 'Artist', filename: 'track.flac', title: 'One', trackNumber: 1 },
      ],
      sourceDirs: [firstDir, secondDir],
    })).rejects.toThrow('requires sourceIndex to disambiguate')

    expect(await readdir(destDir)).toEqual([])
    expect(writeAudioTagFix).not.toHaveBeenCalled()
  })

  it('executes a filename repeated across sourceDirs, applying each record to its own file', async () => {
    await Promise.all([
      createTempFile(firstDir, 'track.flac', 'src-1'),
      createTempFile(secondDir, 'track.flac', 'src-2'),
    ])
    vi.mocked(parseFile)
      .mockResolvedValueOnce(makeAudioMetadata())
      .mockResolvedValueOnce(makeAudioMetadata())
      .mockResolvedValueOnce(meta('First', 4, { no: 1, of: 2 }))
      .mockResolvedValueOnce(meta('Second', 7, { no: 2, of: 2 }))

    await organizeAlbumFiles({
      destDir,
      discStrategy: 'concatenate',
      execute: true,
      setMetadataRecords: [
        { album: 'Album', artist: 'Artist', filename: 'track.flac', sourceIndex: 1, title: 'First', trackNumber: 4 },
        { album: 'Album', artist: 'Artist', filename: 'track.flac', sourceIndex: 2, title: 'Second', trackNumber: 7 },
      ],
      sourceDirs: [firstDir, secondDir],
    })

    expect(await readFile(join(destDir, 'Artist/Album/104 - First.flac'), 'utf8')).toBe('src-1')
    expect(await readFile(join(destDir, 'Artist/Album/207 - Second.flac'), 'utf8')).toBe('src-2')

    const written = vi.mocked(writeAudioTagFix).mock.calls
      .map(([, tagFix]) => [tagFix.title, tagFix.trackNumber, tagFix.discNumber])

    expect(written).toEqual([
      ['First', 4, { kind: 'set', value: 1 }],
      ['Second', 7, { kind: 'set', value: 2 }],
    ])
  })

  it('atomically rejects incomplete setMetadata coverage across sourceDirs, writing nothing', async () => {
    await Promise.all([
      createTempFile(firstDir, 'one.flac'),
      createTempFile(secondDir, 'two.flac'),
    ])
    vi.mocked(parseFile).mockResolvedValue(makeAudioMetadata())

    await expect(organizeAlbumFiles({
      destDir,
      discStrategy: 'concatenate',
      execute: true,
      setMetadataRecords: [
        { album: 'Album', artist: 'Artist', filename: 'one.flac', title: 'One', trackNumber: 1 },
      ],
      sourceDirs: [firstDir, secondDir],
    })).rejects.toThrow('Source audio files are missing metadata records: two.flac')

    expect(await readdir(destDir)).toEqual([])
    expect(writeAudioTagFix).not.toHaveBeenCalled()
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
