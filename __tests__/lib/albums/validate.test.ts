import { parseFile } from 'music-metadata'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { validateAlbumSourceDir } from '../../../src/lib/albums/validate.js'
import { UserInputError } from '../../../src/lib/errors.js'
import { createTempDir, createTempFile, makeAudioMetadata, removeTempDir } from '../../test-helpers.js'

vi.mock('music-metadata', () => ({
  parseFile: vi.fn(),
}))

describe('validateAlbumSourceDir', () => {
  let tempDir: string

  beforeEach(async () => {
    tempDir = await createTempDir('lib-validate-albums-')
    vi.mocked(parseFile).mockReset()
  })

  afterEach(async () => {
    await removeTempDir(tempDir)
    vi.restoreAllMocks()
  })

  it('returns valid rows with organization metadata and destinations', async () => {
    await createTempFile(tempDir, 'track01.flac')
    vi.mocked(parseFile).mockResolvedValue(
      makeAudioMetadata({
        album: 'Album',
        artist: 'Artist',
        title: 'Title',
        track: { no: 1, of: null },
      }),
    )

    const rows = await validateAlbumSourceDir({ dirName: tempDir })

    expect(rows).toEqual([{
      album: 'Album',
      artistFilename: 'Artist',
      artistFilenameStrategy: 'artist',
      destination: 'Artist/Album/01 - Title.flac',
      filename: 'track01.flac',
      issues: [],
      status: 'valid',
      titleFilename: 'Title',
      titleFilenameStrategy: 'title',
      trackNumber: '01',
    }])
  })

  it('reports missing organization metadata without throwing', async () => {
    await createTempFile(tempDir, 'track01.mp3')
    vi.mocked(parseFile).mockResolvedValue(makeAudioMetadata())

    const rows = await validateAlbumSourceDir({ dirName: tempDir })

    expect(rows).toMatchObject([{
      destination: '',
      filename: 'track01.mp3',
      issues: ['missing album', 'missing artist', 'missing track number', 'missing title'],
      status: 'invalid',
      trackNumber: '',
    }])
  })

  it('marks duplicate organization destinations invalid', async () => {
    await createTempFile(tempDir, 'track01.flac')
    await createTempFile(tempDir, 'track01-copy.flac')
    vi.mocked(parseFile).mockResolvedValue(
      makeAudioMetadata({
        album: 'Album',
        artist: 'Artist',
        title: 'Title',
        track: { no: 1, of: null },
      }),
    )

    const rows = await validateAlbumSourceDir({ dirName: tempDir })

    expect(rows).toHaveLength(2)
    expect(rows.map(row => row.status)).toEqual(['invalid', 'invalid'])
    expect(rows[0]?.issues).toEqual(['duplicate destination: Artist/Album/01 - Title.flac'])
    expect(rows[1]?.issues).toEqual(['duplicate destination: Artist/Album/01 - Title.flac'])
  })

  it('honors limit and strategy options', async () => {
    await createTempFile(tempDir, 'track01.flac')
    await createTempFile(tempDir, 'track02.flac')
    vi.mocked(parseFile).mockResolvedValue(
      makeAudioMetadata({
        album: 'Album',
        albumartist: 'Album Artist',
        subtitle: ['Subtitle'],
        title: 'Title',
        track: { no: 1, of: null },
      }),
    )

    const rows = await validateAlbumSourceDir({
      artistFilenameStrategy: 'albumartist',
      dirName: tempDir,
      limit: '1',
      titleFilenameStrategy: 'subtitle',
    })

    expect(rows).toHaveLength(1)
    expect(rows[0]?.artistFilename).toBe('Album Artist')
    expect(rows[0]?.titleFilename).toBe('Subtitle')
  })

  it('rejects invalid options and non-audio entries', async () => {
    await createTempFile(tempDir, 'notes.txt')

    await expect(validateAlbumSourceDir({ dirName: tempDir, limit: '-1' })).rejects.toThrow(UserInputError)
    await expect(validateAlbumSourceDir({ artistFilenameStrategy: 'bad', dirName: tempDir })).rejects.toThrow(UserInputError)
    await expect(validateAlbumSourceDir({ dirName: tempDir })).rejects.toThrow(UserInputError)
  })
})
