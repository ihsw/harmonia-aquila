import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { fixAlbumTags } from '../../../src/lib/albums/fix-tags.js'
import { listAlbumSourceDir } from '../../../src/lib/albums/list.js'
import { organizeAlbumFiles } from '../../../src/lib/albums/organize-files.js'
import { summarizeAlbumSourceDir } from '../../../src/lib/albums/summarize-source-dir.js'
import { validateAlbumSourceDir } from '../../../src/lib/albums/validate.js'
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
    await removeTempDir(roots.sourceDir)
  })

  it('maps albumList input through configured source root', async () => {
    vi.mocked(listAlbumSourceDir).mockResolvedValue(['a.flac', 'sub/'])

    const noPrefix = await resolver.albumList({})

    await resolver.albumList({ prefix: 'sub/' })

    expect(listAlbumSourceDir).toHaveBeenNthCalledWith(1, { sourceDir: roots.sourceDir })
    expect(listAlbumSourceDir).toHaveBeenNthCalledWith(2, { prefix: 'sub/', sourceDir: roots.sourceDir })
    expect(noPrefix).toEqual(['a.flac', 'sub/'])
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
      destDir: roots.destDir,
      sourceDir: roots.sourceDir,
    })
    expect(organizeAlbumFiles).toHaveBeenCalledWith({
      destDir: roots.destDir,
      ignoreNonAudioFiles: true,
      sourceDir: roots.sourceDir,
    })
  })
})
