import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { fixAlbumTags } from '../../src/lib/albums/fix-tags.js'
import { ManageAlbumsController } from '../../src/web/controllers/manage-albums.controller.js'
import { WebPathResolver, type WebRoots } from '../../src/web/providers/path-resolver.js'
import { createTempDir, removeTempDir } from '../test-helpers.js'

vi.mock('../../src/lib/albums/fix-tags.js', () => ({ fixAlbumTags: vi.fn() }))

describe('REST album disc metadata', () => {
  let controller: ManageAlbumsController
  let roots: WebRoots

  beforeEach(async () => {
    roots = {
      destDir: await createTempDir('rest-disc-dest-'),
      scratchDir: await createTempDir('rest-disc-scratch-'),
      sourceDir: await createTempDir('rest-disc-source-'),
    }
    controller = new ManageAlbumsController(new WebPathResolver(roots))
    vi.mocked(fixAlbumTags).mockReset()
  })

  afterEach(async () => {
    await removeTempDir(roots.destDir)
    await removeTempDir(roots.scratchDir)
    await removeTempDir(roots.sourceDir)
  })

  it('passes discStrategy and returns additive disc fields', async () => {
    vi.mocked(fixAlbumTags).mockResolvedValue([{
      album: 'Album',
      artist: 'Artist',
      discNumber: null,
      discTotal: null,
      newDiscNumber: 1,
      newDiscTotal: 2,
      title: 'Title',
    }])

    const rows = await controller.fixTags({ discStrategy: 'infer' })

    expect(fixAlbumTags).toHaveBeenCalledWith({
      destDir: roots.scratchDir,
      discStrategy: 'infer',
      sourceDir: roots.sourceDir,
    })
    expect(rows).toEqual([expect.objectContaining({
      newDiscNumber: 1,
      newDiscTotal: 2,
    })])
  })
})
