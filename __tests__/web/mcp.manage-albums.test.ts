import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { fixAlbumTags } from '../../src/lib/albums/fix-tags.js'
import { listAlbumSourceDir } from '../../src/lib/albums/list.js'
import { organizeAlbumFiles } from '../../src/lib/albums/organize-files.js'
import { summarizeAlbumSourceDir } from '../../src/lib/albums/summarize-source-dir.js'
import { validateAlbumSourceDir } from '../../src/lib/albums/validate.js'
import { UserInputError } from '../../src/lib/errors.js'
import {
  MANAGE_ALBUMS_FIX_TAGS_TOOL_NAME,
  MANAGE_ALBUMS_LIST_TOOL_NAME,
  MANAGE_ALBUMS_ORGANIZE_FILES_TOOL_NAME,
  MANAGE_ALBUMS_SUMMARIZE_SOURCE_DIR_TOOL_NAME,
  MANAGE_ALBUMS_VALIDATE_TOOL_NAME,
} from '../../src/web/schemas/mcp/manage-albums.js'

import { closeWebMcpTestApp, createWebMcpTestApp, getToolText, postMcp, type WebMcpTestApp } from './mcp-test-helpers.js'

vi.mock('../../src/lib/albums/list.js', () => ({
  listAlbumSourceDir: vi.fn(),
}))
vi.mock('../../src/lib/albums/summarize-source-dir.js', () => ({
  summarizeAlbumSourceDir: vi.fn(),
}))
vi.mock('../../src/lib/albums/fix-tags.js', () => ({
  fixAlbumTags: vi.fn(),
}))
vi.mock('../../src/lib/albums/organize-files.js', () => ({
  organizeAlbumFiles: vi.fn(),
}))
vi.mock('../../src/lib/albums/validate.js', () => ({
  validateAlbumSourceDir: vi.fn(),
}))

describe('web MCP manage-albums tools', () => {
  let testApp: WebMcpTestApp | undefined

  beforeEach(async () => {
    testApp = await createWebMcpTestApp()
    vi.mocked(listAlbumSourceDir).mockReset()
    vi.mocked(summarizeAlbumSourceDir).mockReset()
    vi.mocked(validateAlbumSourceDir).mockReset()
    vi.mocked(fixAlbumTags).mockReset()
    vi.mocked(organizeAlbumFiles).mockReset()
  })

  afterEach(async () => {
    await closeWebMcpTestApp(testApp)
    testApp = undefined
  })

  it('calls list tool with configured source root and optional prefix', async () => {
    const currentTestApp = requireTestApp()
    vi.mocked(listAlbumSourceDir).mockResolvedValue(['a.flac', 'sub/'])

    const noPrefix = await callTool(10, MANAGE_ALBUMS_LIST_TOOL_NAME, {})
    const withPrefix = await callTool(11, MANAGE_ALBUMS_LIST_TOOL_NAME, { prefix: 'sub/' })

    expect(listAlbumSourceDir).toHaveBeenNthCalledWith(1, { sourceDir: currentTestApp.sourceDir })
    expect(listAlbumSourceDir).toHaveBeenNthCalledWith(2, { prefix: 'sub/', sourceDir: currentTestApp.sourceDir })
    expect(JSON.parse(getToolText(noPrefix))).toEqual(['a.flac', 'sub/'])
    expect(JSON.parse(getToolText(withPrefix))).toEqual(['a.flac', 'sub/'])
  })

  it('discovers list as a read-only tool', async () => {
    const response = await postMcp(requireTestApp().baseUrl, {
      id: 9,
      jsonrpc: '2.0',
      method: 'tools/list',
      params: {},
    })
    const tools = (response.result as {
      tools?: Array<{ annotations?: { readOnlyHint?: boolean }, name?: string }>
    }).tools ?? []

    expect(tools).toContainEqual(expect.objectContaining({
      annotations: { readOnlyHint: true },
      name: MANAGE_ALBUMS_LIST_TOOL_NAME,
    }))
  })

  it('propagates list errors as tool error content', async () => {
    vi.mocked(listAlbumSourceDir).mockRejectedValue(new UserInputError('prefix must end with /'))

    const response = await callTool(12, MANAGE_ALBUMS_LIST_TOOL_NAME, { prefix: 'bad' })

    expect(getToolText(response)).toContain('prefix')
  })

  it('calls album tools with configured roots and mapped options', async () => {
    const currentTestApp = requireTestApp()
    vi.mocked(summarizeAlbumSourceDir).mockResolvedValue([{ filename: 'a.flac' } as never])
    vi.mocked(validateAlbumSourceDir).mockResolvedValue([{ status: 'valid' } as never])
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
    const validateResponse = await callTool(3, MANAGE_ALBUMS_VALIDATE_TOOL_NAME, {
      artistFilenameStrategy: 'albumartist',
      dirName: 'music',
      ignoreNonAudioFiles: true,
      limit: 5,
      titleFilenameStrategy: 'subtitle',
    })
    const organizeResponse = await callTool(4, MANAGE_ALBUMS_ORGANIZE_FILES_TOOL_NAME, {
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
    expect(validateAlbumSourceDir).toHaveBeenCalledWith({
      artistFilenameStrategy: 'albumartist',
      dirName: `${currentTestApp.sourceDir}/music`,
      ignoreNonAudioFiles: true,
      limit: '5',
      titleFilenameStrategy: 'subtitle',
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
    expect(JSON.parse(getToolText(validateResponse))).toEqual([{ status: 'valid' }])
    expect(JSON.parse(getToolText(organizeResponse))).toEqual([{ action: 'organize' }])
  })

  it('rejects traversal and invalid input before invoking the domain operation', async () => {
    const traversalResponse = await callTool(4, MANAGE_ALBUMS_SUMMARIZE_SOURCE_DIR_TOOL_NAME, { dirName: '..' })
    const invalidResponse = await callTool(5, MANAGE_ALBUMS_FIX_TAGS_TOOL_NAME, { limit: -1 })
    const validateInvalidResponse = await callTool(6, MANAGE_ALBUMS_VALIDATE_TOOL_NAME, { limit: -1 })

    expect(getToolText(traversalResponse)).toContain('--source-dir')
    expect(getToolText(invalidResponse)).toContain('Invalid arguments')
    expect(getToolText(validateInvalidResponse)).toContain('Invalid arguments')
    expect(summarizeAlbumSourceDir).not.toHaveBeenCalled()
    expect(validateAlbumSourceDir).not.toHaveBeenCalled()
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
