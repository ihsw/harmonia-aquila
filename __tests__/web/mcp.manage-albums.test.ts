import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { listAlbumSourceDir } from '../../src/lib/albums/list.js'
import { UserInputError } from '../../src/lib/errors.js'
import { MANAGE_ALBUMS_LIST_TOOL_NAME } from '../../src/web/schemas/mcp/manage-albums.js'

import { closeWebMcpTestApp, createWebMcpTestApp, getToolText, postMcp, type WebMcpTestApp } from './mcp-test-helpers.js'

vi.mock('../../src/lib/albums/list.js', () => ({
  listAlbumSourceDir: vi.fn(),
}))

describe('web MCP manage-albums tools', () => {
  let testApp: WebMcpTestApp | undefined

  beforeEach(async () => {
    testApp = await createWebMcpTestApp()
    vi.mocked(listAlbumSourceDir).mockReset()
  })

  afterEach(async () => {
    await closeWebMcpTestApp(testApp)
    testApp = undefined
  })

  it('selects the source list root and preserves prefix', async () => {
    const currentTestApp = requireTestApp()
    vi.mocked(listAlbumSourceDir).mockResolvedValue(['a.flac', 'sub/'])

    const defaultResponse = await callTool(10, MANAGE_ALBUMS_LIST_TOOL_NAME, {})
    const prefixResponse = await callTool(11, MANAGE_ALBUMS_LIST_TOOL_NAME, {
      prefix: 'sub/',
    })

    expect(listAlbumSourceDir).toHaveBeenNthCalledWith(1, { sourceDir: currentTestApp.sourceDir })
    expect(listAlbumSourceDir).toHaveBeenNthCalledWith(2, {
      prefix: 'sub/',
      sourceDir: currentTestApp.sourceDir,
    })
    expect(JSON.parse(getToolText(defaultResponse))).toEqual(['a.flac', 'sub/'])
    expect(JSON.parse(getToolText(prefixResponse))).toEqual(['a.flac', 'sub/'])
  })

  it('discovers list as a read-only source tool', async () => {
    const response = await postMcp(requireTestApp().baseUrl, {
      id: 9,
      jsonrpc: '2.0',
      method: 'tools/list',
      params: {},
    })
    const tools = (response.result as {
      tools?: Array<{
        annotations?: { readOnlyHint?: boolean }
        description?: string
        inputSchema?: { properties?: Record<string, { type?: string }> }
        name?: string
        title?: string
      }>
    }).tools ?? []
    const listTool = tools.find(tool => tool.name === MANAGE_ALBUMS_LIST_TOOL_NAME)

    expect(listTool).toMatchObject({
      annotations: { readOnlyHint: true },
      name: MANAGE_ALBUMS_LIST_TOOL_NAME,
    })
    expect(listTool?.description).toContain('configured source directory')
    expect(listTool?.title).toContain('source directory')
    expect(listTool?.inputSchema?.properties).not.toHaveProperty(['use', 'Scratch', 'Dir'].join(''))
  })

  it('propagates list errors', async () => {
    vi.mocked(listAlbumSourceDir).mockRejectedValue(new UserInputError('prefix must end with /'))

    const response = await callTool(12, MANAGE_ALBUMS_LIST_TOOL_NAME, { prefix: 'bad' })

    expect(getToolText(response)).toContain('prefix')
  })

  async function callTool(id: number, name: string, toolArguments: unknown) {
    return postMcp(requireTestApp().baseUrl, {
      id,
      jsonrpc: '2.0',
      method: 'tools/call',
      params: {
        arguments: toolArguments,
        name,
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
