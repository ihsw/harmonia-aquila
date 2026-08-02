import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { organizeAlbumFiles } from '../../src/lib/albums/organize-files.js'
import { ManageAlbumsController } from '../../src/web/controllers/manage-albums.controller.js'
import { WebPathResolver, type WebRoots } from '../../src/web/providers/path-resolver.js'
import { createTempDir, removeTempDir } from '../test-helpers.js'

vi.mock('../../src/lib/albums/organize-files.js', () => ({ organizeAlbumFiles: vi.fn() }))

describe('REST album organization metadata repair', () => {
  let controller: ManageAlbumsController
  let roots: WebRoots

  beforeEach(async () => {
    roots = {
      destDir: await createTempDir('rest-organize-dest-'),
      scratchDir: await createTempDir('rest-organize-scratch-'),
      sourceDir: await createTempDir('rest-organize-source-'),
    }
    controller = new ManageAlbumsController(new WebPathResolver(roots))
    vi.mocked(organizeAlbumFiles).mockReset()
  })

  afterEach(async () => {
    await removeTempDir(roots.destDir)
    await removeTempDir(roots.scratchDir)
    await removeTempDir(roots.sourceDir)
  })

  it('passes repair options and returns nested tag changes', async () => {
    vi.mocked(organizeAlbumFiles).mockResolvedValue([{
      action: 'would copy',
      album: 'Album',
      artistFilename: 'Artist',
      artistFilenameStrategy: 'artist',
      destination: 'Artist/Album/01 - Title.flac',
      discNumber: '01',
      discTotal: '02',
      filename: 'track.flac',
      tagChanges: {
        album: 'Album', artist: 'Artist', newDiscNumber: 1, newDiscTotal: 2, title: 'Title',
      },
      titleFilename: 'Title',
      titleFilenameStrategy: 'title',
      trackNumber: '01',
    }])

    const rows = await controller.organizeFiles({ discStrategy: 'infer' })

    expect(organizeAlbumFiles).toHaveBeenCalledWith({
      destDir: roots.sourceDir,
      discStrategy: 'infer',
      sourceDir: roots.sourceDir,
    })
    const result = rows as Array<{ tagChanges: { newDiscNumber?: number, newDiscTotal?: number } }>
    expect(result[0]?.tagChanges).toMatchObject({ newDiscNumber: 1, newDiscTotal: 2 })
  })
})
