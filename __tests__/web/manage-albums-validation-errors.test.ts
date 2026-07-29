import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { validateAlbumSourceDir } from '../../src/lib/albums/validate.js'
import { UserInputError } from '../../src/lib/errors.js'
import { ManageAlbumsController } from '../../src/web/controllers/manage-albums.controller.js'
import { WebPathResolver } from '../../src/web/providers/path-resolver.js'
import { createTempDir, removeTempDir } from '../test-helpers.js'

vi.mock('../../src/lib/albums/validate.js', () => ({
  validateAlbumSourceDir: vi.fn(),
}))

describe('manage-albums validation controller errors', () => {
  let controller: ManageAlbumsController
  let sourceDir: string

  beforeEach(async () => {
    sourceDir = await createTempDir('web-validation-source-')
    controller = new ManageAlbumsController(new WebPathResolver({
      destDir: sourceDir,
      scratchDir: sourceDir,
      sourceDir,
    }))
    vi.mocked(validateAlbumSourceDir).mockReset()
  })

  afterEach(async () => {
    await removeTempDir(sourceDir)
  })

  it('maps multi-artist album conflicts to the existing HTTP 400 body', async () => {
    const message = 'Multiple artists resolve to the same album directory: Same Album (Artist A, Artist B)'
    vi.mocked(validateAlbumSourceDir).mockRejectedValue(new UserInputError(message))

    await expect(controller.validate({ dirName: 'music' })).rejects.toMatchObject({
      response: {
        error: 'Bad Request',
        message,
        statusCode: 400,
      },
    })
  })
})
