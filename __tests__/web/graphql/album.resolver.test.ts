import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { listAlbumSourceDir } from '../../../src/lib/albums/list.js'
import { organizeAlbumFiles } from '../../../src/lib/albums/organize-files.js'
import { summarizeAlbumSourceDir } from '../../../src/lib/albums/summarize-source-dir.js'
import { validateAlbumSourceDir } from '../../../src/lib/albums/validate.js'
import { UserInputError } from '../../../src/lib/errors.js'
import { AlbumResolver } from '../../../src/web/modules/graphql/album.resolver.js'
import { WebPathResolver, type WebRoots } from '../../../src/web/providers/path-resolver.js'
import { createTempDir, removeTempDir } from '../../test-helpers.js'

vi.mock('../../../src/lib/albums/list.js', () => ({ listAlbumSourceDir: vi.fn() }))
vi.mock('../../../src/lib/albums/organize-files.js', () => ({ organizeAlbumFiles: vi.fn() }))
vi.mock('../../../src/lib/albums/summarize-source-dir.js', () => ({ summarizeAlbumSourceDir: vi.fn() }))
vi.mock('../../../src/lib/albums/validate.js', () => ({ validateAlbumSourceDir: vi.fn() }))

describe('AlbumResolver', () => {
  let resolver: AlbumResolver
  let roots: WebRoots

  beforeEach(async () => {
    roots = {
      destDir: await createTempDir('graphql-album-dest-'),
      sourceDir: await createTempDir('graphql-album-source-'),
    }
    resolver = new AlbumResolver(new WebPathResolver(roots))
    vi.mocked(listAlbumSourceDir).mockReset()
    vi.mocked(organizeAlbumFiles).mockReset()
    vi.mocked(summarizeAlbumSourceDir).mockReset()
    vi.mocked(validateAlbumSourceDir).mockReset()
  })

  afterEach(async () => {
    await removeTempDir(roots.destDir)
    await removeTempDir(roots.sourceDir)
  })

  it('selects the source root and preserves prefix', async () => {
    vi.mocked(listAlbumSourceDir).mockResolvedValue(['a.flac', 'sub/'])

    const defaultResult = await resolver.albumList({})
    await resolver.albumList({ prefix: 'sub/' })

    expect(listAlbumSourceDir).toHaveBeenNthCalledWith(1, { sourceDir: roots.sourceDir })
    expect(listAlbumSourceDir).toHaveBeenNthCalledWith(2, { prefix: 'sub/', sourceDir: roots.sourceDir })
    expect(defaultResult).toEqual(['a.flac', 'sub/'])
  })

  it('maps read-only query inputs through the source root', async () => {
    vi.mocked(summarizeAlbumSourceDir).mockResolvedValue([])
    vi.mocked(validateAlbumSourceDir).mockResolvedValue([])

    await resolver.albumSummarizeSourceDir({ dirName: 'albums', ignoreNonAudioFiles: true, limit: '2' })
    await resolver.albumValidateSourceDir({
      artistFilenameStrategy: 'albumartist',
      dirName: 'albums',
      ignoreNonAudioFiles: true,
      limit: '2',
      titleFilenameStrategy: 'subtitle',
    })

    expect(summarizeAlbumSourceDir).toHaveBeenCalledWith({
      dirName: path.join(roots.sourceDir, 'albums'),
      ignoreNonAudioFiles: true,
      limit: '2',
    })
    expect(validateAlbumSourceDir).toHaveBeenCalledWith({
      artistFilenameStrategy: 'albumartist',
      dirName: path.join(roots.sourceDir, 'albums'),
      ignoreNonAudioFiles: true,
      limit: '2',
      titleFilenameStrategy: 'subtitle',
    })
  })

  it('carries bitDepth through the summarize query', async () => {
    const row = { bitDepth: '24-bit', bitrate: '3,000 kbps', filename: 'a.flac', sampleRate: '48 kHz' } as const
    vi.mocked(summarizeAlbumSourceDir).mockResolvedValue([{ ...row } as never])

    const result = await resolver.albumSummarizeSourceDir({ dirName: 'albums' })

    expect(result).toEqual([row])
  })

  it('maps mutations with configured roots and dry-run defaults', async () => {
    vi.mocked(organizeAlbumFiles).mockResolvedValue([])
    const setMetadata = [{
      album: 'Album', artist: 'Artist', filename: 'track.flac', title: 'Title', trackNumber: 1,
    }]

    await resolver.albumOrganizeFiles({
      execute: true,
      ignoreNonAudioFiles: true,
      setMetadata,
    })
    expect(organizeAlbumFiles).toHaveBeenCalledWith({
      destDir: roots.destDir,
      execute: true,
      ignoreNonAudioFiles: true,
      setMetadataRecords: setMetadata,
      sourceDir: roots.sourceDir,
    })
  })

  it('maps albumDirs and albumArtStrategy for concatenate', async () => {
    const row = {
      action: 'would copy', album: 'Album', artistFilename: 'Artist', artistFilenameStrategy: 'artist',
      destination: 'Artist/Album/01 - Second.flac', discNumber: '02', discTotal: '02', fileType: 'audio',
      filename: '01.flac', sourceDirectory: '/music/disc-2', tagChanges: {
        album: 'Album', artist: 'Artist', newDiscNumber: 2, newDiscTotal: 2, title: 'Second',
      },
      titleFilename: 'Second', titleFilenameStrategy: 'title', trackNumber: '01',
    } as const
    vi.mocked(organizeAlbumFiles).mockResolvedValue([row])

    const result = await resolver.albumOrganizeFiles({
      albumArtStrategy: 'first',
      albumDirs: ['disc-1', 'disc-2'],
      discStrategy: 'concatenate',
    })

    expect(organizeAlbumFiles).toHaveBeenCalledWith({
      albumArtStrategy: 'first',
      destDir: roots.destDir,
      discStrategy: 'concatenate',
      sourceDirs: [path.join(roots.sourceDir, 'disc-1'), path.join(roots.sourceDir, 'disc-2')],
    })
    expect(result).toEqual([row])
  })

  it('maps albumDirs together with setMetadata for concatenate', async () => {
    vi.mocked(organizeAlbumFiles).mockResolvedValue([])
    const setMetadata = [
      { album: 'Album', artist: 'Artist', filename: 'one.flac', title: 'One', trackNumber: 1 },
      { album: 'Album', artist: 'Artist', filename: 'two.flac', title: 'Two', trackNumber: 1 },
    ]

    await resolver.albumOrganizeFiles({
      albumDirs: ['disc-1', 'disc-2'],
      discStrategy: 'concatenate',
      setMetadata,
    })

    expect(organizeAlbumFiles).toHaveBeenCalledWith({
      destDir: roots.destDir,
      discStrategy: 'concatenate',
      setMetadataRecords: setMetadata,
      sourceDirs: [path.join(roots.sourceDir, 'disc-1'), path.join(roots.sourceDir, 'disc-2')],
    })
  })

  it('maps setMetadata sourceIndex through for concatenate', async () => {
    vi.mocked(organizeAlbumFiles).mockResolvedValue([])
    const setMetadata = [
      { album: 'Album', artist: 'Artist', filename: 'track.flac', sourceIndex: 1, title: 'One', trackNumber: 1 },
      { album: 'Album', artist: 'Artist', filename: 'track.flac', sourceIndex: 2, title: 'Two', trackNumber: 1 },
    ]

    await resolver.albumOrganizeFiles({
      albumDirs: ['disc-1', 'disc-2'],
      discStrategy: 'concatenate',
      setMetadata,
    })

    expect(organizeAlbumFiles).toHaveBeenCalledWith(expect.objectContaining({ setMetadataRecords: setMetadata }))
  })

  it.each([
    'Multiple albums found: Album A, Album B',
    'Multiple artists resolve to the same album directory: Same Album (Artist A, Artist B)',
    'Duplicate track numbers were detected: Track 32. Fix with setMetadata or discStrategy "infer".',
    '--set-metadata requires sourceIndex to disambiguate filenames present in multiple sourceDirs: "track.flac"',
  ])('preserves organize-files conflicts for GraphQL error filtering: %s', async (message) => {
    vi.mocked(organizeAlbumFiles).mockRejectedValue(new UserInputError(message))

    await expect(resolver.albumOrganizeFiles({})).rejects.toThrow(message)
  })

  it.each([
    'Multiple albums found: Album A, Album B',
    'Multiple artists resolve to the same album directory: Same Album (Artist A, Artist B)',
  ])('preserves validation conflicts for GraphQL error filtering: %s', async (message) => {
    vi.mocked(validateAlbumSourceDir).mockRejectedValue(new UserInputError(message))

    await expect(resolver.albumValidateSourceDir({ dirName: 'albums' })).rejects.toThrow(message)
  })
})
