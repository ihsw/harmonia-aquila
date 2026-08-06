import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { organizeAlbumFiles } from '../../src/lib/albums/organize-files.js'
import { ManageAlbumsController } from '../../src/web/controllers/manage-albums.controller.js'
import { AlbumResolver } from '../../src/web/modules/graphql/album.resolver.js'
import { normalizeWebRoots, WebPathResolver, type WebRoots } from '../../src/web/providers/path-resolver.js'
import { MANAGE_ALBUMS_ORGANIZE_FILES_TOOL_NAME } from '../../src/web/schemas/mcp/manage-albums.js'
import { createTempDir, removeTempDir } from '../test-helpers.js'

import { closeWebMcpTestApp, createWebMcpTestApp, getToolText, postMcp, type WebMcpTestApp } from './mcp-test-helpers.js'

vi.mock('../../src/lib/albums/organize-files.js', () => ({ organizeAlbumFiles: vi.fn() }))

const yearRecord = {
  album: 'Album', artist: 'Artist', filename: 'one.flac', title: 'One', trackNumber: 1, year: 1986,
}

describe('setMetadata year across REST, GraphQL, and MCP', () => {
  let controller: ManageAlbumsController
  let resolver: AlbumResolver
  let roots: WebRoots
  let testApp: WebMcpTestApp | undefined

  beforeEach(async () => {
    roots = await normalizeWebRoots({
      destDir: await createTempDir('year-surfaces-dest-'),
      sourceDir: await createTempDir('year-surfaces-source-'),
    })
    controller = new ManageAlbumsController(new WebPathResolver(roots))
    resolver = new AlbumResolver(new WebPathResolver(roots))
    testApp = await createWebMcpTestApp()
    vi.mocked(organizeAlbumFiles).mockReset()
    vi.mocked(organizeAlbumFiles).mockResolvedValue([])
  })

  afterEach(async () => {
    await closeWebMcpTestApp(testApp)
    testApp = undefined
    await removeTempDir(roots.destDir)
    await removeTempDir(roots.sourceDir)
  })

  function requireTestApp(): WebMcpTestApp {
    if (testApp === undefined) {
      throw new Error('Expected test app to be initialized')
    }

    return testApp
  }

  async function callTool(id: number, toolArguments: unknown) {
    return postMcp(requireTestApp().baseUrl, {
      id,
      jsonrpc: '2.0',
      method: 'tools/call',
      params: { arguments: toolArguments, name: MANAGE_ALBUMS_ORGANIZE_FILES_TOOL_NAME },
    })
  }

  it('forwards an identical year record from all three surfaces', async () => {
    const currentTestApp = requireTestApp()

    await controller.organizeFiles({ albumDir: 'album', setMetadata: [yearRecord] })
    const restCall = vi.mocked(organizeAlbumFiles).mock.calls.at(-1)?.[0]

    await resolver.albumOrganizeFiles({ albumDir: 'album', setMetadata: [yearRecord] })
    const graphqlCall = vi.mocked(organizeAlbumFiles).mock.calls.at(-1)?.[0]

    await callTool(1, { albumDir: 'album/', setMetadata: [yearRecord] })
    const mcpCall = vi.mocked(organizeAlbumFiles).mock.calls.at(-1)?.[0]

    expect(restCall?.setMetadataRecords).toEqual([yearRecord])
    expect(graphqlCall?.setMetadataRecords).toEqual([yearRecord])
    expect(mcpCall?.setMetadataRecords).toEqual(restCall?.setMetadataRecords)
    expect(graphqlCall?.setMetadataRecords).toEqual(restCall?.setMetadataRecords)
    expect(mcpCall?.destDir).toBe(currentTestApp.destDir)
  })

  it.each([999, 10_000, 1986.5])('rejects year %s at the REST schema boundary', async (year) => {
    await expect(controller.organizeFiles({
      albumDir: 'album',
      setMetadata: [{ ...yearRecord, year }],
    })).rejects.toMatchObject({ response: { error: 'Bad Request', statusCode: 400 } })
    expect(organizeAlbumFiles).not.toHaveBeenCalled()
  })

  it('rejects an out-of-range year at the MCP schema boundary', async () => {
    const malformed = await callTool(2, {
      albumDir: 'album/',
      setMetadata: [{ ...yearRecord, year: 12 }],
    })

    expect(getToolText(malformed)).toContain('year')
    expect(organizeAlbumFiles).not.toHaveBeenCalled()
  })

  it('omits year from the forwarded record when it is not supplied', async () => {
    const withoutYear = {
      album: 'Album', artist: 'Artist', filename: 'one.flac', title: 'One', trackNumber: 1,
    }

    await controller.organizeFiles({ albumDir: 'album', setMetadata: [withoutYear] })

    const forwarded = vi.mocked(organizeAlbumFiles).mock.calls.at(-1)?.[0]?.setMetadataRecords?.[0]

    expect(forwarded === undefined ? true : 'year' in forwarded).toBe(false)
  })
})
