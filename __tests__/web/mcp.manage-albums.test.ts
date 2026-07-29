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

  it('selects the list root from useScratchDir and preserves prefix', async () => {
    const currentTestApp = requireTestApp()
    vi.mocked(listAlbumSourceDir).mockResolvedValue(['a.flac', 'sub/'])

    const defaultResponse = await callTool(10, MANAGE_ALBUMS_LIST_TOOL_NAME, {})
    await callTool(11, MANAGE_ALBUMS_LIST_TOOL_NAME, { useScratchDir: false })
    await callTool(12, MANAGE_ALBUMS_LIST_TOOL_NAME, { useScratchDir: true })
    const scratchPrefixResponse = await callTool(13, MANAGE_ALBUMS_LIST_TOOL_NAME, {
      prefix: 'sub/',
      useScratchDir: true,
    })

    expect(listAlbumSourceDir).toHaveBeenNthCalledWith(1, { sourceDir: currentTestApp.sourceDir })
    expect(listAlbumSourceDir).toHaveBeenNthCalledWith(2, { sourceDir: currentTestApp.sourceDir })
    expect(listAlbumSourceDir).toHaveBeenNthCalledWith(3, { sourceDir: currentTestApp.scratchDir })
    expect(listAlbumSourceDir).toHaveBeenNthCalledWith(4, {
      prefix: 'sub/',
      sourceDir: currentTestApp.scratchDir,
    })
    expect(JSON.parse(getToolText(defaultResponse))).toEqual(['a.flac', 'sub/'])
    expect(JSON.parse(getToolText(scratchPrefixResponse))).toEqual(['a.flac', 'sub/'])
  })

  it('discovers list as a read-only source-or-scratch tool', async () => {
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
    expect(listTool?.description).toContain('source or scratch')
    expect(listTool?.title).toContain('source or scratch')
    expect(listTool?.inputSchema?.properties?.useScratchDir).toEqual(expect.objectContaining({
      type: 'boolean',
    }))
  })

  it('rejects invalid list selectors before the domain operation and propagates list errors', async () => {
    const invalidSelector = await callTool(12, MANAGE_ALBUMS_LIST_TOOL_NAME, { useScratchDir: 'yes' })

    expect(getToolText(invalidSelector)).toContain('Invalid arguments')
    expect(listAlbumSourceDir).not.toHaveBeenCalled()

    vi.mocked(listAlbumSourceDir).mockRejectedValue(new UserInputError('prefix must end with /'))

    const response = await callTool(13, MANAGE_ALBUMS_LIST_TOOL_NAME, { prefix: 'bad' })

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
