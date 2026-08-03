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

  it('concatenates ordered sources, clears disc tags, and reports excluded art rows', async () => {
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
      ['would copy', 'Artist/Album/01 - First.flac', 'audio'],
      ['would copy', 'Artist/Album/02 - Second.flac', 'audio'],
      ['would copy', 'Artist/Album/03 - Third.flac', 'audio'],
      ['would copy', 'Artist/Album/cover.jpg', 'albumArt'],
      ['would exclude', 'Artist/Album/cover.jpg', 'albumArt'],
    ])
    expect(rows.filter(row => row.fileType === 'audio')).toMatchObject([
      { discNumber: '', discTotal: '', sourceDirectory: firstDir, trackNumber: '01' },
      { discNumber: '', discTotal: '', sourceDirectory: firstDir, trackNumber: '02' },
      { discNumber: '', discTotal: '', sourceDirectory: secondDir, trackNumber: '03' },
    ])
    expect(rows.at(-1)).toMatchObject({ action: 'would exclude', sourceDirectory: secondDir })
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
