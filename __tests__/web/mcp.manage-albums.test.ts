import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { fixAlbumTags } from '../../src/lib/albums/fix-tags.js'
import { organizeAlbumFiles } from '../../src/lib/albums/organize-files.js'
import { summarizeAlbumSourceDir } from '../../src/lib/albums/summarize-source-dir.js'
import {
  MANAGE_ALBUMS_FIX_TAGS_TOOL_NAME,
  MANAGE_ALBUMS_ORGANIZE_FILES_TOOL_NAME,
  MANAGE_ALBUMS_SUMMARIZE_SOURCE_DIR_TOOL_NAME,
} from '../../src/web/schemas/mcp/manage-albums.js'

import { closeWebMcpTestApp, createWebMcpTestApp, getToolText, postMcp, type WebMcpTestApp } from './mcp-test-helpers.js'

vi.mock('../../src/lib/albums/summarize-source-dir.js', () => ({
  summarizeAlbumSourceDir: vi.fn(),
}))
vi.mock('../../src/lib/albums/fix-tags.js', () => ({
  fixAlbumTags: vi.fn(),
}))
vi.mock('../../src/lib/albums/organize-files.js', () => ({
  organizeAlbumFiles: vi.fn(),
}))

describe('web MCP manage-albums tools', () => {
  let testApp: WebMcpTestApp | undefined

  beforeEach(async () => {
    testApp = await createWebMcpTestApp()
    vi.mocked(summarizeAlbumSourceDir).mockReset()
    vi.mocked(fixAlbumTags).mockReset()
    vi.mocked(organizeAlbumFiles).mockReset()
  })

  afterEach(async () => {
    await closeWebMcpTestApp(testApp)
    testApp = undefined
  })

  it('calls album tools with configured roots and mapped options', async () => {
    const currentTestApp = requireTestApp()
    vi.mocked(summarizeAlbumSourceDir).mockResolvedValue([{ filename: 'a.flac' } as never])
    vi.mocked(fixAlbumTags).mockResolvedValue([{ action: 'fix' } as never])
    vi.mocked(organizeAlbumFiles).mockResolvedValue([{ action: 'organize' } as never])

    const summarizeResponse = await callTool(1, MANAGE_ALBUMS_SUMMARIZE_SOURCE_DIR_TOOL_NAME, {
      dirName: 'music',
      ignoreNonAudioFiles: true,
      limit: 2,
    })
    const fixResponse = await callTool(2, MANAGE_ALBUMS_FIX_TAGS_TOOL_NAME, {
      execute: true,
      limit: 3,
      setArtist: 'Artist',
      swapArtistAlbumartist: true,
    })
    const organizeResponse = await callTool(3, MANAGE_ALBUMS_ORGANIZE_FILES_TOOL_NAME, {
      execute: true,
      ignoreNonAudioFiles: true,
      limit: 4,
    })

    expect(summarizeAlbumSourceDir).toHaveBeenCalledWith({
      dirName: `${currentTestApp.sourceDir}/music`,
      ignoreNonAudioFiles: true,
      limit: '2',
    })
    expect(fixAlbumTags).toHaveBeenCalledWith({
      destDir: currentTestApp.destDir,
      execute: true,
      limit: '3',
      setArtist: 'Artist',
      sourceDir: currentTestApp.sourceDir,
      swapArtistAlbumartist: true,
    })
    expect(organizeAlbumFiles).toHaveBeenCalledWith({
      destDir: currentTestApp.destDir,
      execute: true,
      ignoreNonAudioFiles: true,
      limit: '4',
      sourceDir: currentTestApp.sourceDir,
    })
    expect(JSON.parse(getToolText(summarizeResponse))).toEqual([{ filename: 'a.flac' }])
    expect(JSON.parse(getToolText(fixResponse))).toEqual([{ action: 'fix' }])
    expect(JSON.parse(getToolText(organizeResponse))).toEqual([{ action: 'organize' }])
  })

  it('rejects traversal and invalid input before invoking the domain operation', async () => {
    const traversalResponse = await callTool(4, MANAGE_ALBUMS_SUMMARIZE_SOURCE_DIR_TOOL_NAME, { dirName: '..' })
    const invalidResponse = await callTool(5, MANAGE_ALBUMS_FIX_TAGS_TOOL_NAME, { limit: -1 })

    expect(getToolText(traversalResponse)).toContain('--source-dir')
    expect(getToolText(invalidResponse)).toContain('Invalid arguments')
    expect(summarizeAlbumSourceDir).not.toHaveBeenCalled()
    expect(fixAlbumTags).not.toHaveBeenCalled()
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
