import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { organizeAlbumFiles } from '../../src/lib/albums/organize-files.js'
import { summarizeAlbumSourceDir } from '../../src/lib/albums/summarize-source-dir.js'
import { UserInputError } from '../../src/lib/errors.js'
import {
  MANAGE_ALBUMS_ORGANIZE_FILES_TOOL_NAME,
  MANAGE_ALBUMS_SUMMARIZE_SOURCE_DIR_TOOL_NAME,
} from '../../src/web/schemas/mcp/manage-albums.js'

import { closeWebMcpTestApp, createWebMcpTestApp, getToolText, postMcp, type WebMcpTestApp } from './mcp-test-helpers.js'

vi.mock('../../src/lib/albums/organize-files.js', () => ({
  organizeAlbumFiles: vi.fn(),
}))
vi.mock('../../src/lib/albums/summarize-source-dir.js', () => ({
  summarizeAlbumSourceDir: vi.fn(),
}))

describe('web MCP manage-albums summarize and organize tools', () => {
  let testApp: WebMcpTestApp | undefined

  beforeEach(async () => {
    testApp = await createWebMcpTestApp()
    vi.mocked(organizeAlbumFiles).mockReset()
    vi.mocked(summarizeAlbumSourceDir).mockReset()
  })

  afterEach(async () => {
    await closeWebMcpTestApp(testApp)
    testApp = undefined
  })

  it('maps summarize and organize options to configured roots', async () => {
    const currentTestApp = requireTestApp()
    vi.mocked(summarizeAlbumSourceDir).mockResolvedValue([{ filename: 'a.flac' } as never])
    vi.mocked(organizeAlbumFiles).mockResolvedValue([{ action: 'organize' } as never])

    await callTool(1, MANAGE_ALBUMS_SUMMARIZE_SOURCE_DIR_TOOL_NAME, {
      dirName: 'music',
      ignoreNonAudioFiles: true,
      limit: 2,
    })
    await callTool(3, MANAGE_ALBUMS_ORGANIZE_FILES_TOOL_NAME, {
      albumDir: 'music/',
      execute: true,
      limit: 4,
      useScratchDir: true,
    })

    expect(summarizeAlbumSourceDir).toHaveBeenCalledWith({
      dirName: `${currentTestApp.sourceDir}/music`,
      ignoreNonAudioFiles: true,
      limit: '2',
    })
    expect(organizeAlbumFiles).toHaveBeenCalledWith({
      destDir: currentTestApp.destDir,
      execute: true,
      limit: '4',
      sourceDir: `${currentTestApp.scratchDir}/music`,
    })
  })

  it('defaults organize input to source and always outputs to destination', async () => {
    const currentTestApp = requireTestApp()
    vi.mocked(organizeAlbumFiles).mockResolvedValue([])

    await callTool(4, MANAGE_ALBUMS_ORGANIZE_FILES_TOOL_NAME, { albumDir: 'music/' })
    await callTool(5, MANAGE_ALBUMS_ORGANIZE_FILES_TOOL_NAME, {
      albumDir: 'music/',
      useScratchDir: false,
    })

    expect(organizeAlbumFiles).toHaveBeenNthCalledWith(1, {
      destDir: currentTestApp.destDir,
      sourceDir: `${currentTestApp.sourceDir}/music`,
    })
    expect(organizeAlbumFiles).toHaveBeenNthCalledWith(2, {
      destDir: currentTestApp.destDir,
      sourceDir: `${currentTestApp.sourceDir}/music`,
    })
  })

  it('rejects traversal and malformed input before domain operations', async () => {
    const summarizeTraversal = await callTool(6, MANAGE_ALBUMS_SUMMARIZE_SOURCE_DIR_TOOL_NAME, { dirName: '..' })
    const organizeMissing = await callTool(8, MANAGE_ALBUMS_ORGANIZE_FILES_TOOL_NAME, {})
    const organizeMalformed = await callTool(9, MANAGE_ALBUMS_ORGANIZE_FILES_TOOL_NAME, { albumDir: 'music' })
    const organizeTraversal = await callTool(10, MANAGE_ALBUMS_ORGANIZE_FILES_TOOL_NAME, {
      albumDir: '../outside/',
    })
    const organizeScratchTraversal = await callTool(11, MANAGE_ALBUMS_ORGANIZE_FILES_TOOL_NAME, {
      albumDir: '../outside/',
      useScratchDir: true,
    })

    expect(getToolText(summarizeTraversal)).toContain('--source-dir')
    expect(getToolText(organizeMissing)).toContain('albumDir')
    expect(getToolText(organizeMalformed)).toContain('albumDir must end with /')
    expect(getToolText(organizeTraversal)).toContain('--source-dir')
    expect(getToolText(organizeScratchTraversal)).toContain('--scratch-dir')
    expect(summarizeAlbumSourceDir).not.toHaveBeenCalled()
    expect(organizeAlbumFiles).not.toHaveBeenCalled()
  })

  it('returns organization conflicts as tool error content', async () => {
    const message = 'Multiple artists resolve to the same album directory: Same Album (Artist A, Artist B)'
    vi.mocked(organizeAlbumFiles).mockRejectedValue(new UserInputError(message))

    const organizeResponse = await callTool(12, MANAGE_ALBUMS_ORGANIZE_FILES_TOOL_NAME, { albumDir: 'music/' })

    expect(getToolText(organizeResponse)).toContain(message)
  })

  async function callTool(id: number, name: string, toolArguments: unknown) {
    return postMcp(requireTestApp().baseUrl, {
      id,
      jsonrpc: '2.0',
      method: 'tools/call',
      params: { arguments: toolArguments, name },
    })
  }

  function requireTestApp(): WebMcpTestApp {
    if (testApp === undefined) {
      throw new Error('Expected test app to be initialized')
    }

    return testApp
  }
})
