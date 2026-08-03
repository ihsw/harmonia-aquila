import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { organizeAlbumFiles } from '../../src/lib/albums/organize-files.js'
import { MANAGE_ALBUMS_ORGANIZE_FILES_TOOL_NAME } from '../../src/web/schemas/mcp/manage-albums.js'

import { makeWholeAlbumMetadataRecords } from './album-set-metadata-fixture.js'
import { closeWebMcpTestApp, createWebMcpTestApp, getToolText, postMcp, type WebMcpTestApp } from './mcp-test-helpers.js'

vi.mock('../../src/lib/albums/organize-files.js', () => ({ organizeAlbumFiles: vi.fn() }))

describe('web MCP organize inline setMetadata', () => {
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

  it('discovers a non-empty array of typed metadata records', async () => {
    const response = await postMcp(requireTestApp().baseUrl, {
      id: 40, jsonrpc: '2.0', method: 'tools/list', params: {},
    })
    const tools = (response.result as {
      tools?: Array<{ inputSchema?: { properties?: Record<string, unknown> }, name?: string }>
    }).tools ?? []
    const organizeTool = tools.find(tool => tool.name === MANAGE_ALBUMS_ORGANIZE_FILES_TOOL_NAME)

    expect(organizeTool?.inputSchema?.properties?.setMetadata).toMatchObject({
      items: {
        properties: {
          album: { type: 'string' },
          artist: { type: 'string' },
          filename: { type: 'string' },
          title: { type: 'string' },
          trackNumber: { exclusiveMinimum: 0, type: 'integer' },
        },
        required: ['album', 'artist', 'filename', 'title', 'trackNumber'],
        type: 'object',
      },
      minItems: 1,
      type: 'array',
    })
  })

  it('maps inline records to the in-memory domain option', async () => {
    const records = makeWholeAlbumMetadataRecords()
    await callTool(41, { albumDir: 'music/', execute: true, setMetadata: records })

    expect(organizeAlbumFiles).toHaveBeenCalledWith({
      destDir: requireTestApp().destDir,
      execute: true,
      setMetadataRecords: records,
      sourceDir: `${requireTestApp().sourceDir}/music`,
    })
  })

  it.each([
    ['a filepath string', 'metadata.json'],
    ['an empty array', []],
    ['a path-bearing filename', [{
      album: 'Album', artist: 'Artist', filename: '../track.flac', title: 'Title', trackNumber: 1,
    }]],
    ['an orphan disc total', [{
      album: 'Album', artist: 'Artist', discTotal: 2, filename: 'track.flac', title: 'Title', trackNumber: 1,
    }]],
  ])('rejects %s before organization', async (_label, setMetadata) => {
    const response = await callTool(42, { albumDir: 'music/', setMetadata })

    expect(getToolText(response)).toContain('Invalid arguments')
    expect(organizeAlbumFiles).not.toHaveBeenCalled()
  })

  async function callTool(id: number, toolArguments: unknown) {
    return postMcp(requireTestApp().baseUrl, {
      id,
      jsonrpc: '2.0',
      method: 'tools/call',
      params: { arguments: toolArguments, name: MANAGE_ALBUMS_ORGANIZE_FILES_TOOL_NAME },
    })
  }

  function requireTestApp(): WebMcpTestApp {
    if (testApp === undefined) {
      throw new Error('Expected test app to be initialized')
    }
    return testApp
  }
})
