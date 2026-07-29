import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { fixAlbumTags } from '../../src/lib/albums/fix-tags.js'
import { MANAGE_ALBUMS_FIX_TAGS_TOOL_NAME } from '../../src/web/schemas/mcp/manage-albums.js'

import { closeWebMcpTestApp, createWebMcpTestApp, getToolText, postMcp, type WebMcpTestApp } from './mcp-test-helpers.js'

vi.mock('../../src/lib/albums/fix-tags.js', () => ({
  fixAlbumTags: vi.fn(),
}))

describe('web MCP manage-albums fix-tags tool', () => {
  let testApp: WebMcpTestApp | undefined

  beforeEach(async () => {
    testApp = await createWebMcpTestApp()
    vi.mocked(fixAlbumTags).mockReset()
  })

  afterEach(async () => {
    await closeWebMcpTestApp(testApp)
    testApp = undefined
  })

  it('discovers a required album directory selector', async () => {
    const response = await postMcp(requireTestApp().baseUrl, {
      id: 1,
      jsonrpc: '2.0',
      method: 'tools/list',
      params: {},
    })
    const tools = (response.result as {
      tools?: Array<{
        description?: string
        inputSchema?: {
          properties?: Record<string, { type?: string }>
          required?: string[]
        }
        name?: string
      }>
    }).tools ?? []
    const fixTagsTool = tools.find(tool => tool.name === MANAGE_ALBUMS_FIX_TAGS_TOOL_NAME)

    expect(fixTagsTool?.description).toContain('manage_albums_list')
    expect(fixTagsTool?.inputSchema?.properties?.albumDir).toMatchObject({ type: 'string' })
    expect(fixTagsTool?.inputSchema?.required).toContain('albumDir')
  })

  it('resolves albumDir within source and keeps dry-run output in scratch', async () => {
    const currentTestApp = requireTestApp()
    vi.mocked(fixAlbumTags).mockResolvedValue([{ action: 'fix' } as never])

    const response = await callTool(2, {
      albumDir: 'music/',
      limit: 3,
      setArtist: 'Artist',
      swapArtistAlbumartist: true,
    })

    expect(fixAlbumTags).toHaveBeenCalledWith({
      destDir: currentTestApp.scratchDir,
      limit: '3',
      setArtist: 'Artist',
      sourceDir: `${currentTestApp.sourceDir}/music`,
      swapArtistAlbumartist: true,
    })
    expect(JSON.parse(getToolText(response))).toEqual([{ action: 'fix' }])
  })

  it('keeps execute requests on the same confined roots', async () => {
    const currentTestApp = requireTestApp()
    vi.mocked(fixAlbumTags).mockResolvedValue([])

    await callTool(3, { albumDir: 'music/', execute: true })

    expect(fixAlbumTags).toHaveBeenCalledWith({
      destDir: currentTestApp.scratchDir,
      execute: true,
      sourceDir: `${currentTestApp.sourceDir}/music`,
    })
  })

  it('rejects missing, malformed, traversal, and invalid inputs before fixing tags', async () => {
    const missing = await callTool(4, {})
    const malformed = await callTool(5, { albumDir: 'music' })
    const traversal = await callTool(6, { albumDir: '../outside/' })
    const invalid = await callTool(7, { albumDir: 'music/', limit: -1 })

    expect(getToolText(missing)).toContain('albumDir')
    expect(getToolText(malformed)).toContain('albumDir must end with /')
    expect(getToolText(traversal)).toContain('--source-dir')
    expect(getToolText(invalid)).toContain('Invalid arguments')
    expect(fixAlbumTags).not.toHaveBeenCalled()
  })

  async function callTool(id: number, toolArguments: unknown) {
    return postMcp(requireTestApp().baseUrl, {
      id,
      jsonrpc: '2.0',
      method: 'tools/call',
      params: {
        arguments: toolArguments,
        name: MANAGE_ALBUMS_FIX_TAGS_TOOL_NAME,
      },
    })
  }

  function requireTestApp(): WebMcpTestApp {
    if (testApp === undefined) {
      throw new Error('Expected test app to be initialized')
    }

    return testApp
  }
})
