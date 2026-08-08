import { parseFile } from 'music-metadata'
import { readdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { writeAudioTagFix } from '../../../src/lib/albums/audio-tags.js'
import { organizeAlbumFiles } from '../../../src/lib/albums/organize-files.js'
import { createTempDir, createTempFile, makeAudioMetadata, removeTempDir } from '../../test-helpers.js'

vi.mock('music-metadata', () => ({ parseFile: vi.fn() }))
vi.mock('../../../src/lib/albums/audio-tags.js', () => ({ writeAudioTagFix: vi.fn() }))

describe('organize-files set-metadata input sources', () => {
  let destDir: string
  let manifestDir: string
  let sourceDir: string

  beforeEach(async () => {
    destDir = await createTempDir('organize-inline-dst-')
    manifestDir = await createTempDir('organize-inline-manifest-')
    sourceDir = await createTempDir('organize-inline-src-')
    vi.mocked(parseFile).mockReset()
    vi.mocked(writeAudioTagFix).mockReset()
  })

  afterEach(async () => {
    await Promise.all([destDir, manifestDir, sourceDir].map(removeTempDir))
    vi.restoreAllMocks()
  })

  it('produces the same dry-run plan from file and inline records', async () => {
    await createTempFile(sourceDir, 'one.flac')
    await createTempFile(sourceDir, 'two.flac')
    const records = [
      { album: 'New', artist: 'Artist', filename: 'one.flac', title: 'One', trackNumber: 1 },
      { album: 'New', artist: 'Artist', filename: 'two.flac', title: 'Two', trackNumber: 2 },
    ]
    const metadataPath = await createTempFile(manifestDir, 'metadata.json', JSON.stringify(records))
    vi.mocked(parseFile).mockResolvedValue(makeAudioMetadata({
      album: 'Old', artist: 'Artist', title: 'Old', track: { no: null, of: null },
    }))

    const filePlan = await organizeAlbumFiles({ destDir, setMetadata: metadataPath, sourceDir })
    const inlinePlan = await organizeAlbumFiles({ destDir, setMetadataRecords: records, sourceDir })

    expect(inlinePlan).toEqual(filePlan)
    expect(inlinePlan.map(row => row.destination)).toEqual([
      'Artist/New/01 - One.flac',
      'Artist/New/02 - Two.flac',
    ])
    expect(await readdir(destDir)).toEqual([])
  })

  it('round-trips sourceIndex through file and inline records identically', async () => {
    const secondDir = await createTempDir('organize-inline-second-')

    try {
      await Promise.all([createTempFile(sourceDir, 'track.flac'), createTempFile(secondDir, 'track.flac')])
      const records = [
        { album: 'New', artist: 'Artist', filename: 'track.flac', sourceIndex: 1, title: 'One', trackNumber: 1 },
        { album: 'New', artist: 'Artist', filename: 'track.flac', sourceIndex: 2, title: 'Two', trackNumber: 1 },
      ]
      const metadataPath = await createTempFile(manifestDir, 'metadata.json', JSON.stringify(records))
      vi.mocked(parseFile).mockResolvedValue(makeAudioMetadata())
      const options = { destDir, discStrategy: 'concatenate', sourceDirs: [sourceDir, secondDir] } as const

      const filePlan = await organizeAlbumFiles({ ...options, setMetadata: metadataPath })
      const inlinePlan = await organizeAlbumFiles({ ...options, setMetadataRecords: records })

      expect(inlinePlan).toEqual(filePlan)
      expect(inlinePlan.map(row => row.destination)).toEqual([
        'Artist/New/101 - One.flac',
        'Artist/New/201 - Two.flac',
      ])
      expect(await readdir(destDir)).toEqual([])
    }
    finally {
      await removeTempDir(secondDir)
    }
  })

  it('rejects invalid record sources before writes', async () => {
    await createTempFile(sourceDir, 'one.flac')
    vi.mocked(parseFile).mockResolvedValue(makeAudioMetadata({
      album: 'Old', artist: 'Artist', title: 'Old', track: { no: 1, of: null },
    }))
    const validRecord = {
      album: 'New', artist: 'Artist', filename: 'one.flac', title: 'One', trackNumber: 1,
    }

    await expect(organizeAlbumFiles({
      destDir, setMetadataRecords: [], sourceDir,
    })).rejects.toThrow('Inline metadata does not contain any records')
    await expect(organizeAlbumFiles({
      destDir,
      setMetadata: 'metadata.json',
      setMetadataRecords: [validRecord],
      sourceDir,
    })).rejects.toThrow('conflicts with inline setMetadata records')
    await expect(organizeAlbumFiles({
      destDir,
      setMetadataRecords: [{ ...validRecord, filename: '../one.flac' }],
      sourceDir,
    })).rejects.toThrow('must be a bare file name')
    expect(await readdir(destDir)).toEqual([])
  })

  it('reports the year/newYear pair and writes the year tag', async () => {
    await createTempFile(sourceDir, 'one.flac')
    const records = [
      { album: 'New', artist: 'Artist', filename: 'one.flac', title: 'One', trackNumber: 1, year: 1986 },
    ]
    vi.mocked(parseFile).mockResolvedValue(makeAudioMetadata({
      album: 'Old', artist: 'Artist', title: 'Old', track: { no: 1, of: null }, year: 2009,
    }))

    const [row] = await organizeAlbumFiles({ destDir, setMetadataRecords: records, sourceDir })

    expect(row?.tagChanges).toMatchObject({ newYear: 1986, year: 2009 })
    expect(row?.destination).toBe('Artist/New/01 - One.flac')
  })

  it('omits year keys entirely when records do not supply a year', async () => {
    await createTempFile(sourceDir, 'one.flac')
    const records = [{ album: 'New', artist: 'Artist', filename: 'one.flac', title: 'One', trackNumber: 1 }]
    vi.mocked(parseFile).mockResolvedValue(makeAudioMetadata({
      album: 'Old', artist: 'Artist', title: 'Old', track: { no: 1, of: null }, year: 2009,
    }))

    const [row] = await organizeAlbumFiles({ destDir, setMetadataRecords: records, sourceDir })

    expect(row?.tagChanges).not.toHaveProperty('year')
    expect(row?.tagChanges).not.toHaveProperty('newYear')
  })

  it('executes file and inline records with equivalent repaired output', async () => {
    const secondDestDir = await createTempDir('organize-inline-second-dst-')
    try {
      const sourcePath = await createTempFile(sourceDir, 'one.flac', 'source')
      const records = [
        { album: 'New', artist: 'Artist', filename: 'one.flac', title: 'One', trackNumber: 1 },
      ]
      const metadataPath = await createTempFile(manifestDir, 'metadata.json', JSON.stringify(records))
      const original = makeAudioMetadata({
        album: 'Old', artist: 'Artist', title: 'Old', track: { no: 9, of: null },
      })
      const repaired = makeAudioMetadata({
        album: 'New', artist: 'Artist', title: 'One', track: { no: 1, of: null },
      })
      vi.mocked(parseFile)
        .mockResolvedValueOnce(original).mockResolvedValueOnce(repaired)
        .mockResolvedValueOnce(original).mockResolvedValueOnce(repaired)

      const fileRows = await organizeAlbumFiles({ destDir, execute: true, setMetadata: metadataPath, sourceDir })
      const inlineRows = await organizeAlbumFiles({
        destDir: secondDestDir, execute: true, setMetadataRecords: records, sourceDir,
      })

      expect(inlineRows).toEqual(fileRows)
      expect(vi.mocked(writeAudioTagFix).mock.calls.map(call => call[1])).toEqual([
        { album: 'New', artists: ['Artist'], title: 'One', trackNumber: 1 },
        { album: 'New', artists: ['Artist'], title: 'One', trackNumber: 1 },
      ])
      expect(await readFile(sourcePath, 'utf8')).toBe('source')
      expect(await readFile(join(secondDestDir, 'Artist/New/01 - One.flac'), 'utf8')).toBe('source')
    }
    finally {
      await removeTempDir(secondDestDir)
    }
  })

  it('assigns distinct albums from records when allowMultipleAlbums is set', async () => {
    await createTempFile(sourceDir, 'track-a.mp3')
    await createTempFile(sourceDir, 'track-b.mp3')
    const records = [
      { album: 'Album A', artist: 'Artist A', filename: 'track-a.mp3', title: 'Title A', trackNumber: 1 },
      { album: 'Album B', artist: 'Artist B', filename: 'track-b.mp3', title: 'Title B', trackNumber: 1 },
    ]
    vi.mocked(parseFile).mockResolvedValue(makeAudioMetadata({
      album: 'ocremix.org', artist: 'Original', title: 'Original', track: { no: null, of: null },
    }))

    const rows = await organizeAlbumFiles({
      allowMultipleAlbums: true, destDir, setMetadataRecords: records, sourceDir,
    })

    expect(rows.map(row => row.destination)).toEqual([
      join('Artist A', 'Album A', '01 - Title A.mp3'),
      join('Artist B', 'Album B', '01 - Title B.mp3'),
    ])
    await expect(organizeAlbumFiles({ destDir, setMetadataRecords: records, sourceDir }))
      .rejects.toThrow('Duplicate track numbers were detected:')
  })
})
