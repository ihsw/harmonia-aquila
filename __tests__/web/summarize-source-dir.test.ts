import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { summarizeAlbumSourceDir } from '../../src/lib/albums/summarize-source-dir.js'
import { ManageAlbumsController } from '../../src/web/controllers/manage-albums.controller.js'
import { normalizeWebRoots, WebPathResolver, type WebRoots } from '../../src/web/providers/path-resolver.js'
import { createTempDir, removeTempDir } from '../test-helpers.js'

vi.mock('../../src/lib/albums/summarize-source-dir.js', () => ({ summarizeAlbumSourceDir: vi.fn() }))

describe('web REST summarize-source-dir', () => {
  let controller: ManageAlbumsController
  let roots: WebRoots

  beforeEach(async () => {
    roots = await normalizeWebRoots({
      destDir: await createTempDir('web-summarize-dest-'),
      sourceDir: await createTempDir('web-summarize-source-'),
    })
    controller = new ManageAlbumsController(new WebPathResolver(roots))
    vi.mocked(summarizeAlbumSourceDir).mockReset()
  })

  afterEach(async () => {
    await removeTempDir(roots.destDir)
    await removeTempDir(roots.sourceDir)
  })

  it('carries bitDepth through the REST summarize response', async () => {
    const row = { bitDepth: '24-bit', bitrate: '3,000 kbps', filename: 'a.flac', sampleRate: '48 kHz' } as const
    vi.mocked(summarizeAlbumSourceDir).mockResolvedValue([{ ...row } as never])

    const result = await controller.summarizeSourceDir({ dirName: 'music' })

    expect(result).toEqual([row])
  })
})
