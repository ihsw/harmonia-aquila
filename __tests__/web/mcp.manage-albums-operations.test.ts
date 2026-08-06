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
    const artRow = {
      action: 'copied', destination: 'Artist/Album/cover.jpg', fileType: 'albumArt', filename: 'cover.jpg',
    } as const
    const summarizeRow = { bitDepth: '24-bit', filename: 'a.flac' } as const
    vi.mocked(summarizeAlbumSourceDir).mockResolvedValue([{ ...summarizeRow } as never])
    vi.mocked(organizeAlbumFiles).mockResolvedValue([artRow])

    const summarizeResponse = await callTool(1, MANAGE_ALBUMS_SUMMARIZE_SOURCE_DIR_TOOL_NAME, {
      dirName: 'music',
      ignoreNonAudioFiles: true,
      limit: 2,
    })
    const organizeResponse = await callTool(3, MANAGE_ALBUMS_ORGANIZE_FILES_TOOL_NAME, {
      albumDir: 'music/',
      destinationStrategy: 'overwrite',
      discStrategy: 'infer',
      execute: true,
      limit: 4,
      setAlbumArtist: 'Various Artists',
    })

    expect(summarizeAlbumSourceDir).toHaveBeenCalledWith({
      dirName: `${currentTestApp.sourceDir}/music`,
      ignoreNonAudioFiles: true,
      limit: '2',
    })
    expect(organizeAlbumFiles).toHaveBeenCalledWith({
      destDir: currentTestApp.destDir,
      destinationStrategy: 'overwrite',
      discStrategy: 'infer',
      execute: true,
      limit: '4',
      setAlbumArtist: 'Various Artists',
      sourceDir: `${currentTestApp.sourceDir}/music`,
    })
    expect(JSON.parse(getToolText(summarizeResponse))).toEqual([summarizeRow])
    expect(JSON.parse(getToolText(organizeResponse))).toEqual([artRow])
  })

  it('discovers merged metadata inputs and no standalone repair tool', async () => {
    const response = await postMcp(requireTestApp().baseUrl, {
      id: 30,
      jsonrpc: '2.0',
      method: 'tools/list',
      params: {},
    })
    const tools = (response.result as {
      tools?: Array<{ inputSchema?: { properties?: Record<string, { type?: string }> }, name?: string }>
    }).tools ?? []
    const organizeTool = tools.find(tool => tool.name === MANAGE_ALBUMS_ORGANIZE_FILES_TOOL_NAME)

    const retiredToolName = ['manage', 'albums', 'fix', 'tags'].join('_')
    expect(tools.map(tool => tool.name)).not.toContain(retiredToolName)
    expect(organizeTool?.inputSchema?.properties?.discStrategy).toMatchObject({ type: 'string' })
    expect(organizeTool?.inputSchema?.properties?.setAlbumArtist).toMatchObject({ type: 'string' })
    expect(organizeTool?.inputSchema?.properties).not.toHaveProperty(['use', 'Scratch', 'Dir'].join(''))

    const retiredCall = await postMcp(requireTestApp().baseUrl, {
      id: 31,
      jsonrpc: '2.0',
      method: 'tools/call',
      params: { arguments: {}, name: retiredToolName },
    })
    expect(getToolText(retiredCall)).toContain('not found')
  })

  it('reads organize input from source and outputs to destination', async () => {
    const currentTestApp = requireTestApp()
    vi.mocked(organizeAlbumFiles).mockResolvedValue([])

    await callTool(4, MANAGE_ALBUMS_ORGANIZE_FILES_TOOL_NAME, { albumDir: 'music/' })

    expect(organizeAlbumFiles).toHaveBeenCalledWith({
      destDir: currentTestApp.destDir,
      sourceDir: `${currentTestApp.sourceDir}/music`,
    })
  })

  it('maps albumDirs and albumArtStrategy through MCP organize input', async () => {
    const currentTestApp = requireTestApp()
    const row = {
      action: 'would copy', album: 'Album', artistFilename: 'Artist', artistFilenameStrategy: 'artist',
      destination: 'Artist/Album/01 - Second.flac', discNumber: '02', discTotal: '02', fileType: 'audio',
      filename: '01.flac', sourceDirectory: '/music/disc-2', tagChanges: {
        album: 'Album', artist: 'Artist', newDiscNumber: 2, newDiscTotal: 2, title: 'Second',
      },
      titleFilename: 'Second', titleFilenameStrategy: 'title', trackNumber: '01',
    } as const
    vi.mocked(organizeAlbumFiles).mockResolvedValue([row])

    const response = await callTool(13, MANAGE_ALBUMS_ORGANIZE_FILES_TOOL_NAME, {
      albumArtStrategy: 'last',
      albumDirs: ['disc-1/', 'disc-2/'],
      discStrategy: 'concatenate',
    })

    expect(organizeAlbumFiles).toHaveBeenCalledWith({
      albumArtStrategy: 'last',
      destDir: currentTestApp.destDir,
      discStrategy: 'concatenate',
      sourceDirs: [`${currentTestApp.sourceDir}/disc-1`, `${currentTestApp.sourceDir}/disc-2`],
    })
    expect(JSON.parse(getToolText(response))).toEqual([row])
  })

  it('maps albumDirs together with setMetadata through MCP organize input', async () => {
    const currentTestApp = requireTestApp()
    vi.mocked(organizeAlbumFiles).mockResolvedValue([])
    const setMetadata = [
      { album: 'Album', artist: 'Artist', filename: 'one.flac', title: 'One', trackNumber: 1 },
      { album: 'Album', artist: 'Artist', filename: 'two.flac', title: 'Two', trackNumber: 1 },
    ]

    await callTool(15, MANAGE_ALBUMS_ORGANIZE_FILES_TOOL_NAME, {
      albumDirs: ['disc-1/', 'disc-2/'],
      discStrategy: 'concatenate',
      setMetadata,
    })

    expect(organizeAlbumFiles).toHaveBeenCalledWith({
      destDir: currentTestApp.destDir,
      discStrategy: 'concatenate',
      setMetadataRecords: setMetadata,
      sourceDirs: [`${currentTestApp.sourceDir}/disc-1`, `${currentTestApp.sourceDir}/disc-2`],
    })
  })

  it('accepts setMetadata sourceIndex and rejects a malformed one', async () => {
    const currentTestApp = requireTestApp()
    vi.mocked(organizeAlbumFiles).mockResolvedValue([])
    const setMetadata = [
      { album: 'Album', artist: 'Artist', filename: 'track.flac', sourceIndex: 1, title: 'One', trackNumber: 1 },
      { album: 'Album', artist: 'Artist', filename: 'track.flac', sourceIndex: 2, title: 'Two', trackNumber: 1 },
    ]

    await callTool(16, MANAGE_ALBUMS_ORGANIZE_FILES_TOOL_NAME, {
      albumDirs: ['disc-1/', 'disc-2/'],
      discStrategy: 'concatenate',
      setMetadata,
    })

    expect(organizeAlbumFiles).toHaveBeenCalledWith(expect.objectContaining({
      destDir: currentTestApp.destDir,
      setMetadataRecords: setMetadata,
    }))
    vi.mocked(organizeAlbumFiles).mockClear()

    const malformed = await callTool(17, MANAGE_ALBUMS_ORGANIZE_FILES_TOOL_NAME, {
      albumDirs: ['disc-1/', 'disc-2/'],
      discStrategy: 'concatenate',
      setMetadata: [{ ...setMetadata[0], sourceIndex: 0 }],
    })

    expect(getToolText(malformed)).toContain('sourceIndex')
    expect(organizeAlbumFiles).not.toHaveBeenCalled()
  })

  it('rejects traversal and malformed input before domain operations', async () => {
    const summarizeTraversal = await callTool(6, MANAGE_ALBUMS_SUMMARIZE_SOURCE_DIR_TOOL_NAME, { dirName: '..' })
    const organizeMissing = await callTool(8, MANAGE_ALBUMS_ORGANIZE_FILES_TOOL_NAME, {})
    const organizeMalformed = await callTool(9, MANAGE_ALBUMS_ORGANIZE_FILES_TOOL_NAME, { albumDir: 'music' })
    const organizeTraversal = await callTool(10, MANAGE_ALBUMS_ORGANIZE_FILES_TOOL_NAME, {
      albumDir: '../outside/',
    })
    const duplicateAlbumDirs = await callTool(14, MANAGE_ALBUMS_ORGANIZE_FILES_TOOL_NAME, {
      albumDirs: ['music/', 'music/'],
    })

    expect(getToolText(summarizeTraversal)).toContain('--source-dir')
    expect(getToolText(organizeMissing)).toContain('albumDir')
    expect(getToolText(organizeMalformed)).toContain('albumDir must end with /')
    expect(getToolText(organizeTraversal)).toContain('--source-dir')
    expect(getToolText(duplicateAlbumDirs)).toContain('albumDirs must contain unique entries')
    expect(summarizeAlbumSourceDir).not.toHaveBeenCalled()
    expect(organizeAlbumFiles).not.toHaveBeenCalled()
  })

  it.each([
    'Multiple albums found: Album A, Album B',
    'Multiple artists resolve to the same album directory: Same Album (Artist A, Artist B)',
    'Duplicate track numbers were detected: Track 32. Fix with setMetadata or discStrategy "infer".',
  ])('returns organization conflicts as tool error content: %s', async (message) => {
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
