import { parseFile } from 'music-metadata'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { organizeAlbumFiles } from '../../../src/lib/albums/organize-files.js'
import { createTempDir, createTempFile, makeAudioMetadata, removeTempDir } from '../../test-helpers.js'

vi.mock('music-metadata', () => ({ parseFile: vi.fn() }))

describe('organize-files concatenate disc strategy', () => {
  let destDir: string
  let firstDir: string
  let secondDir: string

  beforeEach(async () => {
    destDir = await createTempDir('organize-concat-dst-')
    firstDir = await createTempDir('organize-concat-first-')
    secondDir = await createTempDir('organize-concat-second-')
    vi.mocked(parseFile).mockReset()
  })

  afterEach(async () => {
    await Promise.all([removeTempDir(destDir), removeTempDir(firstDir), removeTempDir(secondDir)])
    vi.restoreAllMocks()
  })

  it('preserves local tracks, assigns ordered disc metadata, and reports excluded art rows', async () => {
    await Promise.all([
      createTempFile(firstDir, '02-second.flac'),
      createTempFile(firstDir, '01-first.flac'),
      createTempFile(firstDir, 'cover.jpg'),
      createTempFile(secondDir, '01-third.flac'),
      createTempFile(secondDir, 'cover.jpg'),
    ])
    vi.mocked(parseFile).mockImplementation((filePath) => {
      const filename = path.basename(filePath)

      if (filename === '01-first.flac') {
        return makeAudioMetadata({
          album: 'Album',
          artist: 'Artist',
          disk: { no: 1, of: 2 },
          title: 'First',
          track: { no: 1, of: null },
        })
      }
      if (filename === '02-second.flac') {
        return makeAudioMetadata({
          album: 'Album',
          artist: 'Artist',
          disk: { no: 1, of: 2 },
          title: 'Second',
          track: { no: 2, of: null },
        })
      }
      return makeAudioMetadata({
        album: 'Album',
        artist: 'Artist',
        disk: { no: 2, of: 2 },
        title: 'Third',
        track: { no: 1, of: null },
      })
    })

    const rows = await organizeAlbumFiles({
      albumArtStrategy: 'first',
      destDir,
      discStrategy: 'concatenate',
      sourceDirs: [firstDir, secondDir],
    })

    expect(rows.map(row => [row.action, row.destination, row.fileType])).toEqual([
      ['would copy', 'Artist/Album/101 - First.flac', 'audio'],
      ['would copy', 'Artist/Album/102 - Second.flac', 'audio'],
      ['would copy', 'Artist/Album/201 - Third.flac', 'audio'],
      ['would copy', 'Artist/Album/cover.jpg', 'albumArt'],
      ['would exclude', 'Artist/Album/cover.jpg', 'albumArt'],
    ])
    expect(rows.filter(row => row.fileType === 'audio')).toMatchObject([
      { discNumber: '01', discTotal: '02', sourceDirectory: firstDir, trackNumber: '01' },
      { discNumber: '01', discTotal: '02', sourceDirectory: firstDir, trackNumber: '02' },
      { discNumber: '02', discTotal: '02', sourceDirectory: secondDir, trackNumber: '01' },
    ])
    for (const row of rows.filter(item => item.fileType === 'audio')) {
      expect(row.tagChanges).not.toHaveProperty('newTrackNumber')
      expect(row.tagChanges).not.toHaveProperty('newDiscNumber')
      expect(row.tagChanges).not.toHaveProperty('newDiscTotal')
    }
    expect(rows.at(-1)).toMatchObject({ action: 'would exclude', sourceDirectory: secondDir })
  })

  it('sets missing and partial disc metadata and repairs conflicting values', async () => {
    await Promise.all([
      createTempFile(firstDir, '01-correct.flac'),
      createTempFile(firstDir, '02-missing.flac'),
      createTempFile(firstDir, '03-partial.flac'),
      createTempFile(secondDir, '01-conflicting.flac'),
    ])
    vi.mocked(parseFile).mockImplementation((filePath) => {
      const filename = path.basename(filePath)
      const metadata = {
        '01-conflicting.flac': { disk: { no: 1, of: 9 }, title: 'Conflicting', track: 1 },
        '01-correct.flac': { disk: { no: 1, of: 2 }, title: 'Correct', track: 1 },
        '02-missing.flac': { disk: { no: null, of: null }, title: 'Missing', track: 2 },
        '03-partial.flac': { disk: { no: 1, of: null }, title: 'Partial', track: 3 },
      }[filename]

      if (metadata === undefined) throw new Error(`Unexpected fixture: ${filename}`)
      return makeAudioMetadata({
        album: 'Album', artist: 'Artist', disk: metadata.disk,
        title: metadata.title, track: { no: metadata.track, of: null },
      })
    })

    const rows = (await organizeAlbumFiles({
      destDir, discStrategy: 'concatenate', sourceDirs: [firstDir, secondDir],
    })).filter(row => row.fileType === 'audio')

    expect(rows.map(row => [row.trackNumber, row.discNumber, row.discTotal])).toEqual([
      ['01', '01', '02'],
      ['02', '01', '02'],
      ['03', '01', '02'],
      ['01', '02', '02'],
    ])
    expect(rows[0]?.tagChanges).not.toHaveProperty('newDiscNumber')
    expect(rows[0]?.tagChanges).not.toHaveProperty('newDiscTotal')
    expect(rows[1]?.tagChanges).toMatchObject({ newDiscNumber: 1, newDiscTotal: 2 })
    expect(rows[2]?.tagChanges).not.toHaveProperty('newDiscNumber')
    expect(rows[2]?.tagChanges).toMatchObject({ newDiscTotal: 2 })
    expect(rows[3]?.tagChanges).toMatchObject({ newDiscNumber: 2, newDiscTotal: 2 })
  })

  it('derives disc totals from all ordered source directories', async () => {
    const thirdDir = await createTempDir('organize-concat-third-')

    try {
      await Promise.all([
        createTempFile(firstDir, '01-first.flac'),
        createTempFile(secondDir, '01-second.flac'),
        createTempFile(thirdDir, '01-third.flac'),
      ])
      vi.mocked(parseFile)
        .mockResolvedValueOnce(makeAudioMetadata({ album: 'Album', artist: 'Artist', title: 'First', track: { no: 1, of: null } }))
        .mockResolvedValueOnce(makeAudioMetadata({ album: 'Album', artist: 'Artist', title: 'Second', track: { no: 1, of: null } }))
        .mockResolvedValueOnce(makeAudioMetadata({ album: 'Album', artist: 'Artist', title: 'Third', track: { no: 1, of: null } }))

      const rows = (await organizeAlbumFiles({
        destDir, discStrategy: 'concatenate', sourceDirs: [firstDir, secondDir, thirdDir],
      })).filter(row => row.fileType === 'audio')

      expect(rows.map(row => [row.trackNumber, row.discNumber, row.discTotal])).toEqual([
        ['01', '01', '03'], ['01', '02', '03'], ['01', '03', '03'],
      ])
    }
    finally {
      await removeTempDir(thirdDir)
    }
  })

  it('separates identical local track numbers and titles by embedded disc number', async () => {
    await Promise.all([
      createTempFile(firstDir, 'track.flac'),
      createTempFile(secondDir, 'track.flac'),
    ])
    vi.mocked(parseFile).mockResolvedValue(makeAudioMetadata({
      album: 'Album', artist: 'Artist', title: 'Same', track: { no: 1, of: null },
    }))

    const rows = (await organizeAlbumFiles({
      destDir, discStrategy: 'concatenate', sourceDirs: [firstDir, secondDir],
    })).filter(row => row.fileType === 'audio')

    expect(rows.map(row => [row.destination, row.discNumber, row.trackNumber])).toEqual([
      ['Artist/Album/101 - Same.flac', '01', '01'],
      ['Artist/Album/201 - Same.flac', '02', '01'],
    ])
  })

  it('requires albumArtStrategy when colliding art comes from multiple sources', async () => {
    await Promise.all([
      createTempFile(firstDir, '01-first.flac'),
      createTempFile(firstDir, 'cover.jpg'),
      createTempFile(secondDir, '01-second.flac'),
      createTempFile(secondDir, 'cover.jpg'),
    ])
    vi.mocked(parseFile)
      .mockResolvedValueOnce(makeAudioMetadata({ album: 'Album', artist: 'Artist', title: 'First', track: { no: 1, of: null } }))
      .mockResolvedValueOnce(makeAudioMetadata({ album: 'Album', artist: 'Artist', title: 'Second', track: { no: 1, of: null } }))

    await expect(organizeAlbumFiles({
      destDir,
      discStrategy: 'concatenate',
      sourceDirs: [firstDir, secondDir],
    })).rejects.toThrow('--album-art-strategy')
  })

  it('rejects invalid concatenate input combinations', async () => {
    await expect(Reflect.apply(organizeAlbumFiles, undefined, [{
      destDir,
      discStrategy: 'concatenate',
      sourceDir: firstDir,
      sourceDirs: [firstDir, secondDir],
    }])).rejects.toThrow('Exactly one of sourceDir or sourceDirs is required')
    await expect(organizeAlbumFiles({
      destDir,
      discStrategy: 'concatenate',
      limit: '1',
      sourceDirs: [firstDir, secondDir],
    })).rejects.toThrow('--limit')
    await expect(organizeAlbumFiles({
      destDir,
      discStrategy: 'concatenate',
      resetTrack: true,
      sourceDirs: [firstDir, secondDir],
    })).rejects.toThrow('--reset-track')
    await expect(organizeAlbumFiles({
      destDir,
      discStrategy: 'concatenate',
      sourceDirs: [firstDir, firstDir],
    })).rejects.toThrow('must be unique')
    await expect(organizeAlbumFiles({
      destDir,
      discStrategy: 'concatenate',
      sourceDir: firstDir,
    })).rejects.toThrow('requires sourceDirs')
    await expect(organizeAlbumFiles({
      destDir,
      sourceDirs: [firstDir, secondDir],
    })).rejects.toThrow('sourceDirs requires --disc-strategy concatenate')
  })

  it('selects collision candidates by sourceIndex not original filename when both sanitize to the same destination', async () => {
    await Promise.all([
      createTempFile(firstDir, '01-track.flac'),
      createTempFile(firstDir, 'art|1|.jpg'),
      createTempFile(secondDir, '01-track.flac'),
      createTempFile(secondDir, 'art<1>.jpg'),
    ])
    vi.mocked(parseFile)
      .mockResolvedValueOnce(makeAudioMetadata({ album: 'Album', artist: 'Artist', title: 'One', track: { no: 1, of: null } }))
      .mockResolvedValueOnce(makeAudioMetadata({ album: 'Album', artist: 'Artist', title: 'Two', track: { no: 1, of: null } }))

    const firstRows = await organizeAlbumFiles({
      albumArtStrategy: 'first',
      destDir,
      discStrategy: 'concatenate',
      sourceDirs: [firstDir, secondDir],
    })

    const artRows = firstRows.filter(r => r.fileType === 'albumArt')
    const selectedRow = artRows.find(r => r.action === 'would copy')
    expect(selectedRow?.filename).toBe('art|1|.jpg')
    expect(selectedRow?.sourceDirectory).toBe(firstDir)
  })

  it('organizes a fully tagless two-disc source using setMetadata, deriving disc identity from directory order', async () => {
    await Promise.all([
      createTempFile(firstDir, '01-a.flac'),
      createTempFile(firstDir, '02-b.flac'),
      createTempFile(secondDir, '01-c.flac'),
    ])
    vi.mocked(parseFile).mockResolvedValue(makeAudioMetadata())

    const rows = await organizeAlbumFiles({
      destDir,
      discStrategy: 'concatenate',
      setMetadataRecords: [
        { album: 'Album', artist: 'Artist', filename: '01-a.flac', title: 'A', trackNumber: 1 },
        { album: 'Album', artist: 'Artist', filename: '02-b.flac', title: 'B', trackNumber: 2 },
        { album: 'Album', artist: 'Artist', filename: '01-c.flac', title: 'C', trackNumber: 1 },
      ],
      sourceDirs: [firstDir, secondDir],
    })

    const audioRows = rows.filter(row => row.fileType === 'audio')
    expect(audioRows.map(row => [row.destination, row.trackNumber, row.discNumber, row.discTotal])).toEqual([
      ['Artist/Album/101 - A.flac', '01', '01', '02'],
      ['Artist/Album/102 - B.flac', '02', '01', '02'],
      ['Artist/Album/201 - C.flac', '01', '02', '02'],
    ])
  })

  it('rejects a filename repeated across sourceDirs when setMetadata is supplied', async () => {
    await Promise.all([
      createTempFile(firstDir, 'track.flac'),
      createTempFile(secondDir, 'track.flac'),
    ])
    vi.mocked(parseFile).mockResolvedValue(makeAudioMetadata())

    await expect(organizeAlbumFiles({
      destDir,
      discStrategy: 'concatenate',
      setMetadataRecords: [
        { album: 'Album', artist: 'Artist', filename: 'track.flac', title: 'A', trackNumber: 1 },
      ],
      sourceDirs: [firstDir, secondDir],
    })).rejects.toThrow('unique filenames across sourceDirs')
  })

  it('rejects setMetadata records that supply discNumber or discTotal under concatenate', async () => {
    await Promise.all([
      createTempFile(firstDir, 'one.flac'),
      createTempFile(secondDir, 'two.flac'),
    ])
    vi.mocked(parseFile).mockResolvedValue(makeAudioMetadata())

    await expect(organizeAlbumFiles({
      destDir,
      discStrategy: 'concatenate',
      setMetadataRecords: [
        { album: 'Album', artist: 'Artist', discNumber: 1, filename: 'one.flac', title: 'One', trackNumber: 1 },
        { album: 'Album', artist: 'Artist', filename: 'two.flac', title: 'Two', trackNumber: 1 },
      ],
      sourceDirs: [firstDir, secondDir],
    })).rejects.toThrow('discNumber/discTotal')
  })

  it('rejects incomplete setMetadata coverage across the union of sourceDirs', async () => {
    await Promise.all([
      createTempFile(firstDir, 'one.flac'),
      createTempFile(secondDir, 'two.flac'),
    ])
    vi.mocked(parseFile).mockResolvedValue(makeAudioMetadata())

    await expect(organizeAlbumFiles({
      destDir,
      discStrategy: 'concatenate',
      setMetadataRecords: [
        { album: 'Album', artist: 'Artist', filename: 'one.flac', title: 'One', trackNumber: 1 },
      ],
      sourceDirs: [firstDir, secondDir],
    })).rejects.toThrow('Source audio files are missing metadata records: two.flac')
  })

  it('rejects a symlink that resolves to the same directory as another source', async () => {
    const { symlink } = await import('node:fs/promises')
    const linkPath = `${firstDir}-link`

    try {
      await symlink(firstDir, linkPath)
    }
    catch {
      return
    }
    try {
      await createTempFile(firstDir, '01-track.flac')
      vi.mocked(parseFile).mockResolvedValue(makeAudioMetadata({ album: 'A', artist: 'A', title: 'T', track: { no: 1, of: null } }))

      await expect(organizeAlbumFiles({
        destDir,
        discStrategy: 'concatenate',
        sourceDirs: [firstDir, linkPath],
      })).rejects.toThrow('must be unique')
    }
    finally {
      const { rm } = await import('node:fs/promises')
      await rm(linkPath, { force: true })
    }
  })
})
