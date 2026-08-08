import { BadRequestException } from '@nestjs/common'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { organizeAlbumFiles } from '../../src/lib/albums/organize-files.js'
import { ManageAlbumsController } from '../../src/web/controllers/manage-albums.controller.js'
import { AlbumResolver } from '../../src/web/modules/graphql/album.resolver.js'
import { normalizeWebRoots, WebPathResolver, type WebRoots } from '../../src/web/providers/path-resolver.js'
import { MANAGE_ALBUMS_ORGANIZE_FILES_TOOL_NAME } from '../../src/web/schemas/mcp/manage-albums.js'
import { createTempDir, removeTempDir } from '../test-helpers.js'

import { closeWebMcpTestApp, createWebMcpTestApp, postMcp, type WebMcpTestApp } from './mcp-test-helpers.js'

vi.mock('../../src/lib/albums/organize-files.js', () => ({ organizeAlbumFiles: vi.fn() }))

describe('organize-files allowMultipleAlbums web surfaces', () => {
  describe('REST and GraphQL', () => {
    let controller: ManageAlbumsController
    let resolver: AlbumResolver
    let roots: WebRoots

    beforeEach(async () => {
      roots = await normalizeWebRoots({
        destDir: await createTempDir('allow-multiple-web-dest-'),
        sourceDir: await createTempDir('allow-multiple-web-source-'),
      })
      controller = new ManageAlbumsController(new WebPathResolver(roots))
      resolver = new AlbumResolver(new WebPathResolver(roots))
      vi.mocked(organizeAlbumFiles).mockReset()
      vi.mocked(organizeAlbumFiles).mockResolvedValue([])
    })

    afterEach(async () => {
      await removeTempDir(roots.destDir)
      await removeTempDir(roots.sourceDir)
    })

    it('forwards allowMultipleAlbums from a REST body', async () => {
      await controller.organizeFiles({ allowMultipleAlbums: true })

      expect(organizeAlbumFiles).toHaveBeenCalledWith(expect.objectContaining({
        allowMultipleAlbums: true,
        destDir: roots.destDir,
        sourceDir: roots.sourceDir,
      }))
    })

    it('omits allowMultipleAlbums from a REST body that leaves it out', async () => {
      await controller.organizeFiles({})

      expect(vi.mocked(organizeAlbumFiles).mock.calls[0]?.[0])
        .not.toHaveProperty('allowMultipleAlbums')
    })

    it('rejects a non-boolean allowMultipleAlbums before organizing', async () => {
      await expect(controller.organizeFiles({ allowMultipleAlbums: 'yes' }))
        .rejects.toBeInstanceOf(BadRequestException)
      await expect(controller.organizeFiles({ allowMultipleAlbums: 'yes' }))
        .rejects.toThrow('boolean values must be true or false')
      expect(organizeAlbumFiles).not.toHaveBeenCalled()
    })

    it('forwards allowMultipleAlbums from a GraphQL input', async () => {
      await resolver.albumOrganizeFiles({ allowMultipleAlbums: true })

      expect(organizeAlbumFiles).toHaveBeenCalledWith(expect.objectContaining({
        allowMultipleAlbums: true,
        destDir: roots.destDir,
        sourceDir: roots.sourceDir,
      }))
    })

    it('omits allowMultipleAlbums from a GraphQL input that leaves it out', async () => {
      await resolver.albumOrganizeFiles({})

      expect(vi.mocked(organizeAlbumFiles).mock.calls[0]?.[0])
        .not.toHaveProperty('allowMultipleAlbums')
    })
  })

  describe('MCP', () => {
    let testApp: WebMcpTestApp | undefined

    beforeEach(async () => {
      testApp = await createWebMcpTestApp()
      vi.mocked(organizeAlbumFiles).mockReset()
      vi.mocked(organizeAlbumFiles).mockResolvedValue([])
    })

    afterEach(async () => {
      await closeWebMcpTestApp(testApp)
      testApp = undefined
    })

    function requireTestApp(): WebMcpTestApp {
      if (testApp === undefined) {
        throw new Error('Expected test app to be initialized')
      }
      return testApp
    }

    it('advertises allowMultipleAlbums as an optional boolean', async () => {
      const response = await postMcp(requireTestApp().baseUrl, {
        id: 70, jsonrpc: '2.0', method: 'tools/list', params: {},
      })
      const tools = (response.result as {
        tools?: Array<{ inputSchema?: { properties?: Record<string, unknown> }, name?: string }>
      }).tools ?? []
      const organizeTool = tools.find(tool => tool.name === MANAGE_ALBUMS_ORGANIZE_FILES_TOOL_NAME)

      expect(organizeTool?.inputSchema?.properties?.allowMultipleAlbums).toMatchObject({
        type: 'boolean',
      })
    })

    it('forwards allowMultipleAlbums from a tool call', async () => {
      await postMcp(requireTestApp().baseUrl, {
        id: 71,
        jsonrpc: '2.0',
        method: 'tools/call',
        params: {
          arguments: { albumDir: 'music/', allowMultipleAlbums: true },
          name: MANAGE_ALBUMS_ORGANIZE_FILES_TOOL_NAME,
        },
      })

      expect(organizeAlbumFiles).toHaveBeenCalledWith({
        allowMultipleAlbums: true,
        destDir: requireTestApp().destDir,
        sourceDir: `${requireTestApp().sourceDir}/music`,
      })
    })
  })
})
