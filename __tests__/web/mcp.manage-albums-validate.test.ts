import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { validateAlbumSourceDir } from '../../src/lib/albums/validate.js'
import { UserInputError } from '../../src/lib/errors.js'
import { MANAGE_ALBUMS_VALIDATE_TOOL_NAME } from '../../src/web/schemas/mcp/manage-albums.js'

import { closeWebMcpTestApp, createWebMcpTestApp, getToolText, postMcp, type WebMcpTestApp } from './mcp-test-helpers.js'

vi.mock('../../src/lib/albums/validate.js', () => ({
  validateAlbumSourceDir: vi.fn(),
}))

describe('web MCP manage-albums validate tool', () => {
  let testApp: WebMcpTestApp | undefined

  beforeEach(async () => {
    testApp = await createWebMcpTestApp()
    vi.mocked(validateAlbumSourceDir).mockReset()
  })

  afterEach(async () => {
    await closeWebMcpTestApp(testApp)
    testApp = undefined
  })

  it('routes validation through the source root', async () => {
    const currentTestApp = requireTestApp()
    vi.mocked(validateAlbumSourceDir).mockResolvedValue([])

    await callTool(1, {
      artistFilenameStrategy: 'albumartist',
      dirName: 'music',
      ignoreNonAudioFiles: true,
      limit: 5,
      titleFilenameStrategy: 'subtitle',
    })
    await callTool(2, { dirName: 'music' })

    expect(validateAlbumSourceDir).toHaveBeenNthCalledWith(1, {
      artistFilenameStrategy: 'albumartist',
      dirName: `${currentTestApp.sourceDir}/music`,
      ignoreNonAudioFiles: true,
      limit: '5',
      titleFilenameStrategy: 'subtitle',
    })
    expect(validateAlbumSourceDir).toHaveBeenNthCalledWith(2, {
      dirName: `${currentTestApp.sourceDir}/music`,
    })
  })

  it('rejects source traversal before validation', async () => {
    const sourceTraversal = await callTool(4, { dirName: '../outside' })

    expect(getToolText(sourceTraversal)).toContain('--source-dir')
    expect(validateAlbumSourceDir).not.toHaveBeenCalled()
  })

  it.each([
    'Multiple albums found: Album A, Album B',
    'Multiple artists resolve to the same album directory: Same Album (Artist A, Artist B)',
  ])('returns validation conflicts as tool error content: %s', async (message) => {
    vi.mocked(validateAlbumSourceDir).mockRejectedValue(new UserInputError(message))

    const response = await callTool(7, { dirName: 'music' })

    expect(getToolText(response)).toContain(message)
  })

  it('discovers source validation without a selector and with a read-only annotation', async () => {
    const response = await postMcp(requireTestApp().baseUrl, {
      id: 8,
      jsonrpc: '2.0',
      method: 'tools/list',
      params: {},
    })
    const tools = (response.result as {
      tools?: Array<{
        annotations?: { readOnlyHint?: boolean }
        inputSchema?: {
          properties?: Record<string, { type?: string }>
          required?: string[]
        }
        name?: string
      }>
    }).tools ?? []
    const validateTool = tools.find(tool => tool.name === MANAGE_ALBUMS_VALIDATE_TOOL_NAME)

    expect(validateTool).toMatchObject({
      annotations: { readOnlyHint: true },
      name: MANAGE_ALBUMS_VALIDATE_TOOL_NAME,
    })
    expect(validateTool?.inputSchema?.properties).not.toHaveProperty(['use', 'Scratch', 'Dir'].join(''))
    expect(validateTool?.inputSchema?.required ?? []).toContain('dirName')
  })

  async function callTool(id: number, toolArguments: unknown) {
    return postMcp(requireTestApp().baseUrl, {
      id,
      jsonrpc: '2.0',
      method: 'tools/call',
      params: {
        arguments: toolArguments,
        name: MANAGE_ALBUMS_VALIDATE_TOOL_NAME,
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
