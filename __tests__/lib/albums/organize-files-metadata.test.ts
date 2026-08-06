import { parseFile } from 'music-metadata'
import { mkdir, readdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { writeAudioTagFix } from '../../../src/lib/albums/audio-tags.js'
import { organizeAlbumFiles } from '../../../src/lib/albums/organize-files.js'
import { createTempDir, createTempFile, makeAudioMetadata, removeTempDir } from '../../test-helpers.js'

vi.mock('music-metadata', () => ({ parseFile: vi.fn() }))
vi.mock('../../../src/lib/albums/audio-tags.js', () => ({ writeAudioTagFix: vi.fn() }))

describe('organize-files metadata repair', () => {
  let destDir: string
  let sourceDir: string

  beforeEach(async () => {
    sourceDir = await createTempDir('organize-metadata-src-')
    destDir = await createTempDir('organize-metadata-dst-')
    vi.mocked(parseFile).mockReset()
    vi.mocked(writeAudioTagFix).mockReset()
  })

  afterEach(async () => {
    await removeTempDir(sourceDir)
    await removeTempDir(destDir)
    vi.restoreAllMocks()
  })

  it.each(['flac', 'mp3'])('writes the year tag on execute for .%s', async (extension) => {
    await createTempFile(sourceDir, `track01.${extension}`, 'source')
    const records = [{
      album: 'Album',
      artist: 'Artist',
      filename: `track01.${extension}`,
      title: 'Title',
      trackNumber: 1,
      year: 2004,
    }]
    vi.mocked(parseFile).mockResolvedValue(makeAudioMetadata({
      album: 'Album', artist: 'Artist', title: 'Title', track: { no: 1, of: null }, year: 2005,
    }))

    await organizeAlbumFiles({ destDir, execute: true, setMetadataRecords: records, sourceDir })

    expect(vi.mocked(writeAudioTagFix).mock.calls.map(call => call[1])).toEqual([
      { album: 'Album', artists: ['Artist'], title: 'Title', trackNumber: 1, year: 2004 },
    ])
  })

  it('plans destinations from repaired metadata without writing', async () => {
    const sourcePath = await createTempFile(sourceDir, 'track01.flac', 'source')
    vi.mocked(parseFile).mockResolvedValue(makeAudioMetadata({
      album: 'Old Album',
      artist: 'Track Artist',
      title: 'Title',
      track: { no: 1, of: null },
    }))

    const rows = (await organizeAlbumFiles({
      artistFilenameStrategy: 'albumartist',
      destDir,
      setAlbum: 'New Album',
      setAlbumArtist: 'Various Artists',
      sourceDir,
    })).filter(row => row.fileType === 'audio')

    expect(rows[0]).toMatchObject({
      action: 'would copy',
      album: 'New Album',
      artistFilename: 'Various Artists',
      destination: 'Various Artists/New Album/01 - Title.flac',
    })
    expect(rows[0]?.tagChanges.newAlbum).toBe('New Album')
    expect(rows[0]?.tagChanges.newAlbumartists).toEqual(['Various Artists'])
    expect(await readFile(sourcePath, 'utf8')).toBe('source')
    expect(await readdir(destDir)).toEqual([])
    expect(writeAudioTagFix).not.toHaveBeenCalled()
  })

  it('uses per-track metadata and grouping aggregates in the same plan', async () => {
    await createTempFile(sourceDir, 'track01.flac')
    await createTempFile(sourceDir, 'track02.flac')
    const metadataPath = await createTempFile(destDir, 'metadata.json', JSON.stringify([
      { album: 'New', artist: 'Artist B', filename: 'track01.flac', title: 'One', trackNumber: 1 },
      { album: 'New', artist: 'Artist A', filename: 'track02.flac', title: 'Two', trackNumber: 2 },
    ]))
    vi.mocked(parseFile)
      .mockResolvedValueOnce(makeAudioMetadata({
        album: 'Old', artist: 'Artist B', grouping: 'Group', producer: ['Producer B'], title: 'Old One',
      }))
      .mockResolvedValueOnce(makeAudioMetadata({
        album: 'Old', artist: 'Artist A', grouping: 'Group', producer: ['Producer A'], title: 'Old Two',
      }))

    const rows = await organizeAlbumFiles({
      albumArtistsStrategy: 'aggregate',
      artistFilenameStrategy: 'albumartist',
      destDir,
      producerStrategy: 'aggregate',
      setMetadata: metadataPath,
      sourceDir,
    })

    expect(rows.map(row => row.destination)).toEqual([
      'Artist A; Artist B/New/01 - One.flac',
      'Artist A; Artist B/New/02 - Two.flac',
    ])
    expect(rows[0]?.tagChanges).toMatchObject({
      newAlbum: 'New',
      newAlbumartists: ['Artist A', 'Artist B'],
      newProducers: ['Producer A', 'Producer B'],
      newTitle: 'One',
      newTrackNumber: 1,
    })
  })

  it('repairs a staged sibling before publishing and preserves source', async () => {
    const sourcePath = await createTempFile(sourceDir, 'track01.flac', 'source')
    const original = makeAudioMetadata({
      album: 'Album', artist: 'Artist', title: 'Title', track: { no: 9, of: null },
    })
    const repaired = makeAudioMetadata({
      album: 'Album', artist: 'Artist', title: 'Title', track: { no: 1, of: null },
    })
    vi.mocked(parseFile).mockResolvedValueOnce(original).mockResolvedValueOnce(repaired)

    const rows = await organizeAlbumFiles({ destDir, execute: true, resetTrack: true, sourceDir })
    const destination = join(destDir, 'Artist/Album/01 - Title.flac')
    const stagedPath = vi.mocked(writeAudioTagFix).mock.calls[0]?.[0]

    expect(stagedPath).not.toBe(destination)
    expect(writeAudioTagFix).toHaveBeenCalledWith(stagedPath, { trackNumber: 1 })
    expect(rows[0]).toMatchObject({ action: 'copied', destination: 'Artist/Album/01 - Title.flac' })
    expect(await readFile(sourcePath, 'utf8')).toBe('source')
    expect(await readFile(destination, 'utf8')).toBe('source')
    expect((await readdir(join(destDir, 'Artist/Album'))).filter(name => name.startsWith('.'))).toEqual([])
  })

  it('removes the staged sibling when metadata repair fails', async () => {
    await createTempFile(sourceDir, 'track01.flac', 'source')
    vi.mocked(parseFile).mockResolvedValue(makeAudioMetadata({
      album: 'Album', artist: 'Artist', title: 'Title', track: { no: 1, of: null },
    }))
    vi.mocked(writeAudioTagFix).mockImplementation(() => {
      throw new Error('write failed')
    })

    await expect(organizeAlbumFiles({ destDir, execute: true, setAlbum: 'New', sourceDir }))
      .rejects.toThrow('Failed to repair and organize')
    expect(await readdir(join(destDir, 'Artist/New'))).toEqual([])
  })

  it('removes the staged sibling when final publication fails', async () => {
    await createTempFile(sourceDir, 'track01.flac', 'source')
    vi.mocked(parseFile).mockResolvedValue(makeAudioMetadata({
      album: 'Album', artist: 'Artist', title: 'Title', track: { no: 1, of: null },
    }))
    const albumDirectory = join(destDir, 'Artist/Album')
    await mkdir(join(albumDirectory, '01 - Title.flac'), { recursive: true })

    await expect(organizeAlbumFiles({
      destDir, destinationStrategy: 'overwrite', execute: true, sourceDir,
    })).rejects.toThrow('Failed to repair and organize')
    expect((await readdir(albumDirectory)).filter(name => name.startsWith('.'))).toEqual([])
  })

  it('supports exact-file ignore and overwrite collision strategies', async () => {
    await createTempFile(sourceDir, 'track01.flac', 'new')
    vi.mocked(parseFile).mockResolvedValue(makeAudioMetadata({
      album: 'Album', artist: 'Artist', title: 'Title', track: { no: 1, of: null },
    }))
    const destinationDirectory = join(destDir, 'Artist/Album')
    await mkdir(destinationDirectory, { recursive: true })
    const destination = await createTempFile(destinationDirectory, '01 - Title.flac', 'old')

    const ignored = await organizeAlbumFiles({ destDir, destinationStrategy: 'ignore', execute: true, sourceDir })
    expect(ignored[0]?.action).toBe('ignored')
    expect(await readFile(destination, 'utf8')).toBe('old')

    const overwritten = await organizeAlbumFiles({
      destDir, destinationStrategy: 'overwrite', execute: true, sourceDir,
    })
    expect(overwritten[0]?.action).toBe('overwritten')
    expect(await readFile(destination, 'utf8')).toBe('new')
  })
})
