import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { convertAudiobookFiles } from '../../src/lib/audiobooks/convert-file.js'
import { copyAndRenameAudiobook } from '../../src/lib/audiobooks/copy-and-rename.js'
import { crawlAudiobooks } from '../../src/lib/audiobooks/crawl.js'
import { mergeAudiobooks } from '../../src/lib/audiobooks/merge.js'
import { setAudiobookMetadata } from '../../src/lib/audiobooks/set-metadata.js'
import { validateAudiobook } from '../../src/lib/audiobooks/validate.js'
import {
  MANAGE_AUDIOBOOKS_CONVERT_FILE_TOOL_NAME,
  MANAGE_AUDIOBOOKS_COPY_AND_RENAME_TOOL_NAME,
  MANAGE_AUDIOBOOKS_CRAWL_TOOL_NAME,
  MANAGE_AUDIOBOOKS_MERGE_TOOL_NAME,
  MANAGE_AUDIOBOOKS_SET_METADATA_TOOL_NAME,
  MANAGE_AUDIOBOOKS_VALIDATE_TOOL_NAME,
} from '../../src/web/schemas/mcp/manage-audiobooks.js'

import { closeWebMcpTestApp, createWebMcpTestApp, getToolText, postMcp, type WebMcpTestApp } from './mcp-test-helpers.js'

vi.mock('../../src/lib/audiobooks/validate.js', () => ({ validateAudiobook: vi.fn() }))
vi.mock('../../src/lib/audiobooks/crawl.js', () => ({ crawlAudiobooks: vi.fn() }))
vi.mock('../../src/lib/audiobooks/copy-and-rename.js', () => ({ copyAndRenameAudiobook: vi.fn() }))
vi.mock('../../src/lib/audiobooks/convert-file.js', () => ({ convertAudiobookFiles: vi.fn() }))
vi.mock('../../src/lib/audiobooks/merge.js', () => ({ mergeAudiobooks: vi.fn() }))
vi.mock('../../src/lib/audiobooks/set-metadata.js', () => ({ setAudiobookMetadata: vi.fn() }))

describe('web MCP manage-audiobooks tools', () => {
  let testApp: WebMcpTestApp | undefined

  beforeEach(async () => {
    testApp = await createWebMcpTestApp()
    vi.mocked(validateAudiobook).mockReset()
    vi.mocked(crawlAudiobooks).mockReset()
    vi.mocked(copyAndRenameAudiobook).mockReset()
    vi.mocked(convertAudiobookFiles).mockReset()
    vi.mocked(mergeAudiobooks).mockReset()
    vi.mocked(setAudiobookMetadata).mockReset()
  })

  afterEach(async () => {
    await closeWebMcpTestApp(testApp)
    testApp = undefined
  })

  it('maps audiobook tool inputs to domain options', async () => {
    const currentTestApp = requireTestApp()
    vi.mocked(validateAudiobook).mockResolvedValue([{ action: 'validate' } as never])
    vi.mocked(crawlAudiobooks).mockResolvedValue([{ action: 'crawl' } as never])
    vi.mocked(copyAndRenameAudiobook).mockResolvedValue([{ action: 'copy' } as never])
    vi.mocked(convertAudiobookFiles).mockResolvedValue([{ action: 'convert' } as never])
    vi.mocked(mergeAudiobooks).mockResolvedValue([{ action: 'merge' } as never])
    vi.mocked(setAudiobookMetadata).mockResolvedValue([{ action: 'metadata' } as never])

    await callTool(1, MANAGE_AUDIOBOOKS_VALIDATE_TOOL_NAME, { fileName: 'book.m4b' })
    await callTool(2, MANAGE_AUDIOBOOKS_CRAWL_TOOL_NAME, { dirName: 'series' })
    await callTool(3, MANAGE_AUDIOBOOKS_COPY_AND_RENAME_TOOL_NAME, { execute: true, fileName: 'book.m4b' })
    await callTool(4, MANAGE_AUDIOBOOKS_CONVERT_FILE_TOOL_NAME, {
      author: 'Author',
      execute: true,
      fileName: ['disc1.mp3', 'disc2.mp3'],
      title: 'Title',
    })
    await callTool(5, MANAGE_AUDIOBOOKS_MERGE_TOOL_NAME, { bypassMetadata: true, execute: true, jobs: 2 })
    const metadataResponse = await callTool(6, MANAGE_AUDIOBOOKS_SET_METADATA_TOOL_NAME, {
      author: 'Author',
      destFilepath: 'book.m4b',
      execute: true,
      sourceFilepath: 'book-source.m4b',
      title: 'Title',
    })

    expect(validateAudiobook).toHaveBeenCalledWith({ fileName: `${currentTestApp.sourceDir}/book.m4b` })
    expect(crawlAudiobooks).toHaveBeenCalledWith({ dirName: `${currentTestApp.sourceDir}/series` })
    expect(copyAndRenameAudiobook).toHaveBeenCalledWith({
      destDir: currentTestApp.destDir,
      execute: true,
      fileName: `${currentTestApp.sourceDir}/book.m4b`,
    })
    expect(convertAudiobookFiles).toHaveBeenCalledWith({
      author: 'Author',
      concurrency: '4',
      destDir: currentTestApp.destDir,
      execute: true,
      fileName: [`${currentTestApp.sourceDir}/disc1.mp3`, `${currentTestApp.sourceDir}/disc2.mp3`],
      jobs: '16',
      title: 'Title',
    })
    expect(mergeAudiobooks).toHaveBeenCalledWith({
      bypassMetadata: true,
      destDir: currentTestApp.destDir,
      execute: true,
      jobs: '2',
      sourceDir: currentTestApp.sourceDir,
    })
    expect(setAudiobookMetadata).toHaveBeenCalledWith({
      author: 'Author',
      destFilepath: `${currentTestApp.destDir}/book.m4b`,
      execute: true,
      sourceFilepath: `${currentTestApp.sourceDir}/book-source.m4b`,
      title: 'Title',
    })
    expect(JSON.parse(getToolText(metadataResponse))).toEqual([{ action: 'metadata' }])
  })

  it('rejects invalid and traversal inputs before invoking domain operations', async () => {
    const emptyListResponse = await callTool(7, MANAGE_AUDIOBOOKS_CONVERT_FILE_TOOL_NAME, { fileName: [] })
    const sourceTraversalResponse = await callTool(8, MANAGE_AUDIOBOOKS_COPY_AND_RENAME_TOOL_NAME, { fileName: '..' })
    const destTraversalResponse = await callTool(9, MANAGE_AUDIOBOOKS_SET_METADATA_TOOL_NAME, {
      author: 'Author',
      destFilepath: '../book.m4b',
      sourceFilepath: 'book-source.m4b',
      title: 'Title',
    })

    expect(getToolText(emptyListResponse)).toContain('Invalid arguments')
    expect(getToolText(sourceTraversalResponse)).toContain('--source-dir')
    expect(getToolText(destTraversalResponse)).toContain('--dest-dir')
    expect(convertAudiobookFiles).not.toHaveBeenCalled()
    expect(copyAndRenameAudiobook).not.toHaveBeenCalled()
    expect(setAudiobookMetadata).not.toHaveBeenCalled()
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
