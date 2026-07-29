import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { organizeAlbumFiles } from '../../src/lib/albums/organize-files.js'
import { UserInputError } from '../../src/lib/errors.js'
import { ManageAlbumsController } from '../../src/web/controllers/manage-albums.controller.js'
import { WebPathResolver } from '../../src/web/providers/path-resolver.js'
import { createTempDir, removeTempDir } from '../test-helpers.js'

vi.mock('../../src/lib/albums/organize-files.js', () => ({
  organizeAlbumFiles: vi.fn(),
}))

describe('manage-albums organization controller errors', () => {
  let controller: ManageAlbumsController
  let sourceDir: string

  beforeEach(async () => {
    sourceDir = await createTempDir('web-organization-source-')
    controller = new ManageAlbumsController(new WebPathResolver({
      destDir: sourceDir,
      scratchDir: sourceDir,
      sourceDir,
    }))
    vi.mocked(organizeAlbumFiles).mockReset()
  })

  afterEach(async () => {
    await removeTempDir(sourceDir)
  })

  it('maps multiple albums to the existing HTTP 400 body', async () => {
    const message = 'Multiple albums found: Album A, Album B'
    vi.mocked(organizeAlbumFiles).mockRejectedValue(new UserInputError(message))

    await expect(controller.organizeFiles({})).rejects.toMatchObject({
      response: {
        error: 'Bad Request',
        message,
        statusCode: 400,
      },
    })
  })
})
