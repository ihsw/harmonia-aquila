import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { fixAlbumTags } from '../../../src/lib/albums/fix-tags.js'
import { listAlbumSourceDir } from '../../../src/lib/albums/list.js'
import { organizeAlbumFiles } from '../../../src/lib/albums/organize-files.js'
import { summarizeAlbumSourceDir } from '../../../src/lib/albums/summarize-source-dir.js'
import { validateAlbumSourceDir } from '../../../src/lib/albums/validate.js'
import { UserInputError } from '../../../src/lib/errors.js'
import { AlbumResolver } from '../../../src/web/modules/graphql/album.resolver.js'
import { WebPathResolver, type WebRoots } from '../../../src/web/providers/path-resolver.js'
import { createTempDir, removeTempDir } from '../../test-helpers.js'

vi.mock('../../../src/lib/albums/fix-tags.js', () => ({ fixAlbumTags: vi.fn() }))
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
      scratchDir: await createTempDir('graphql-album-scratch-'),
      sourceDir: await createTempDir('graphql-album-source-'),
    }
    resolver = new AlbumResolver(new WebPathResolver(roots))
    vi.mocked(fixAlbumTags).mockReset()
    vi.mocked(listAlbumSourceDir).mockReset()
    vi.mocked(organizeAlbumFiles).mockReset()
    vi.mocked(summarizeAlbumSourceDir).mockReset()
    vi.mocked(validateAlbumSourceDir).mockReset()
  })

  afterEach(async () => {
    await removeTempDir(roots.destDir)
    await removeTempDir(roots.scratchDir)
    await removeTempDir(roots.sourceDir)
  })

  it('selects the album list root from useScratchDir and preserves prefix', async () => {
    vi.mocked(listAlbumSourceDir).mockResolvedValue(['a.flac', 'sub/'])

    const defaultResult = await resolver.albumList({})
    await resolver.albumList({ useScratchDir: false })
    await resolver.albumList({ useScratchDir: true })
    await resolver.albumList({ prefix: 'sub/', useScratchDir: true })

    expect(listAlbumSourceDir).toHaveBeenNthCalledWith(1, { sourceDir: roots.sourceDir })
    expect(listAlbumSourceDir).toHaveBeenNthCalledWith(2, { sourceDir: roots.sourceDir })
    expect(listAlbumSourceDir).toHaveBeenNthCalledWith(3, { sourceDir: roots.scratchDir })
    expect(listAlbumSourceDir).toHaveBeenNthCalledWith(4, { prefix: 'sub/', sourceDir: roots.scratchDir })
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

  it('maps mutations with configured roots and dry-run defaults', async () => {
    vi.mocked(fixAlbumTags).mockResolvedValue([])
    vi.mocked(organizeAlbumFiles).mockResolvedValue([])

    await resolver.albumFixTags({ albumStrategy: 'grouping' })
    await resolver.albumOrganizeFiles({ ignoreNonAudioFiles: true })

    expect(fixAlbumTags).toHaveBeenCalledWith({
      albumStrategy: 'grouping',
      destDir: roots.scratchDir,
      sourceDir: roots.sourceDir,
    })
    expect(organizeAlbumFiles).toHaveBeenCalledWith({
      destDir: roots.sourceDir,
      ignoreNonAudioFiles: true,
      sourceDir: roots.sourceDir,
    })
  })

  it('selects the organize destination from useScratchDir', async () => {
    vi.mocked(organizeAlbumFiles).mockResolvedValue([])

    await resolver.albumOrganizeFiles({ useScratchDir: false })
    await resolver.albumOrganizeFiles({ useScratchDir: true })

    expect(organizeAlbumFiles).toHaveBeenNthCalledWith(1, {
      destDir: roots.sourceDir,
      sourceDir: roots.sourceDir,
    })
    expect(organizeAlbumFiles).toHaveBeenNthCalledWith(2, {
      destDir: roots.scratchDir,
      sourceDir: roots.sourceDir,
    })
  })

  it.each([
    'Multiple albums found: Album A, Album B',
    'Multiple artists resolve to the same album directory: Same Album (Artist A, Artist B)',
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
