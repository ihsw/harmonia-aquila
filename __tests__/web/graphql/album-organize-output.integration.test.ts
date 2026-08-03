import type { INestApplication } from '@nestjs/common'
import type { Server } from 'node:http'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { organizeAlbumFiles } from '../../../src/lib/albums/organize-files.js'
import { UserInputError } from '../../../src/lib/errors.js'
import { createWebApp } from '../../../src/web/main.js'
import { createTempDir, removeTempDir } from '../../test-helpers.js'
import { makeWholeAlbumMetadataRecords } from '../album-set-metadata-fixture.js'

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
        action: 'would exclude',
        destination: 'Artist/Album/cover.jpg',
        fileType: 'albumArt',
        filename: 'cover.jpg',
        sourceDirectory: '/music/disc-2',
      },
    ])
    const response = await fetch(`${baseUrl}/graphql`, {
      body: JSON.stringify({
        query: 'mutation { albumOrganizeFiles(input: {}) { action fileType filename album sourceDirectory tagChanges { newAlbum } } }',
      }),
      headers: { 'Content-Type': 'application/json' },
      method: 'POST',
    })

    expect(await response.json()).toEqual({ data: { albumOrganizeFiles: [
      {
        action: 'would copy',
        album: 'Album',
        fileType: 'audio',
        filename: 'track.flac',
        sourceDirectory: null,
        tagChanges: { newAlbum: 'Album' },
      },
      {
        action: 'would exclude',
        album: null,
        fileType: 'albumArt',
        filename: 'cover.jpg',
        sourceDirectory: '/music/disc-2',
        tagChanges: null,
      },
    ] } })
    expect(organizeAlbumFiles).toHaveBeenCalledWith({ destDir: sourceDir, sourceDir })
  })

  it('returns actionable duplicate-track guidance as BAD_USER_INPUT', async () => {
    const message = 'Duplicate track numbers were detected: Track 32. Fix with setMetadata or discStrategy "infer".'
    vi.mocked(organizeAlbumFiles).mockRejectedValue(new UserInputError(message))
    const response = await fetch(`${baseUrl}/graphql`, {
      body: JSON.stringify({ query: 'mutation { albumOrganizeFiles(input: {}) { filename } }' }),
      headers: { 'Content-Type': 'application/json' },
      method: 'POST',
    })

    expect(await response.json()).toMatchObject({ errors: [{
      extensions: { code: 'BAD_USER_INPUT' },
      message,
    }] })
  })

  it('accepts typed inline metadata records and rejects filepath strings', async () => {
    vi.mocked(organizeAlbumFiles).mockResolvedValue([])
    const setMetadata = makeWholeAlbumMetadataRecords()
    const valid = await fetch(`${baseUrl}/graphql`, {
      body: JSON.stringify({
        query: 'mutation ($input: AlbumOrganizeFilesInput!) { albumOrganizeFiles(input: $input) { filename } }',
        variables: { input: { execute: true, setMetadata } },
      }),
      headers: { 'Content-Type': 'application/json' },
      method: 'POST',
    })
    const invalid = await fetch(`${baseUrl}/graphql`, {
      body: JSON.stringify({
        query: 'mutation { albumOrganizeFiles(input: { setMetadata: "metadata.json" }) { filename } }',
      }),
      headers: { 'Content-Type': 'application/json' },
      method: 'POST',
    })

    expect(await valid.json()).toEqual({ data: { albumOrganizeFiles: [] } })
    expect(organizeAlbumFiles).toHaveBeenCalledWith({
      destDir: sourceDir, execute: true, setMetadataRecords: setMetadata, sourceDir,
    })
    expect(await invalid.json()).toMatchObject({ errors: [{
      extensions: { code: 'GRAPHQL_VALIDATION_FAILED' },
    }] })
  })
})
