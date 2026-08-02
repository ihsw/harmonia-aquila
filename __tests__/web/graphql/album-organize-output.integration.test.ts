import type { INestApplication } from '@nestjs/common'
import type { Server } from 'node:http'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { organizeAlbumFiles } from '../../../src/lib/albums/organize-files.js'
import { createWebApp } from '../../../src/web/main.js'
import { createTempDir, removeTempDir } from '../../test-helpers.js'

vi.mock('../../../src/lib/albums/organize-files.js', () => ({ organizeAlbumFiles: vi.fn() }))

describe('GraphQL album organization output', () => {
  let app: INestApplication | undefined
  let baseUrl: string
  let destDir: string
  let scratchDir: string
  let sourceDir: string

  beforeEach(async () => {
    destDir = await createTempDir('graphql-art-dest-')
    scratchDir = await createTempDir('graphql-art-scratch-')
    sourceDir = await createTempDir('graphql-art-source-')
    app = await createWebApp({ destDir, scratchDir, sourceDir })
    await app.listen(0, '127.0.0.1')
    const address = (app.getHttpServer() as Server).address()

    if (typeof address !== 'object' || address === null) {
      throw new Error('GraphQL test server did not bind a TCP address')
    }
    baseUrl = `http://127.0.0.1:${String(address.port)}`
  })

  afterEach(async () => {
    await app?.close()
    await Promise.all([removeTempDir(destDir), removeTempDir(scratchDir), removeTempDir(sourceDir)])
  })

  it('serializes audio and album-art variants while remaining dry-run by default', async () => {
    vi.mocked(organizeAlbumFiles).mockResolvedValue([
      {
        action: 'would copy', album: 'Album', artistFilename: 'Artist', artistFilenameStrategy: 'artist',
        destination: 'Artist/Album/01 - Song.flac', discNumber: '', discTotal: '', fileType: 'audio',
        filename: 'track.flac', tagChanges: { filename: 'track.flac', newAlbum: 'Album' }, titleFilename: 'Song',
        titleFilenameStrategy: 'title', trackNumber: '01',
      },
      {
        action: 'would copy', destination: 'Artist/Album/cover.jpg', fileType: 'albumArt', filename: 'cover.jpg',
      },
    ])
    const response = await fetch(`${baseUrl}/graphql`, {
      body: JSON.stringify({
        query: 'mutation { albumOrganizeFiles(input: {}) { fileType filename album tagChanges { newAlbum } } }',
      }),
      headers: { 'Content-Type': 'application/json' },
      method: 'POST',
    })

    expect(await response.json()).toEqual({ data: { albumOrganizeFiles: [
      { album: 'Album', fileType: 'audio', filename: 'track.flac', tagChanges: { newAlbum: 'Album' } },
      { album: null, fileType: 'albumArt', filename: 'cover.jpg', tagChanges: null },
    ] } })
    expect(organizeAlbumFiles).toHaveBeenCalledWith({ destDir: sourceDir, sourceDir })
  })
})
