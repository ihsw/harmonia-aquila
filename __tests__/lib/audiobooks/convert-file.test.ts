import { parseFile } from 'music-metadata'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { readAudiobookFile } from '../../../src/lib/audiobooks/audiobook-file.js'
import { convertAudiobookFiles } from '../../../src/lib/audiobooks/convert-file.js'
import { mergeWithM4bTool } from '../../../src/lib/audiobooks/m4b-tool.js'
import { createTempDir, createTempFile, makeAudioMetadata, removeTempDir } from '../../test-helpers.js'

vi.mock('music-metadata', () => ({
  parseFile: vi.fn(),
}))

vi.mock('../../../src/lib/audiobooks/audiobook-file.js', () => ({
  readAudiobookFile: vi.fn(),
}))

vi.mock('../../../src/lib/audiobooks/m4b-tool.js', () => ({
  mergeWithM4bTool: vi.fn(),
  parseM4bToolJobs: vi.fn((value: string) => Number(value)),
}))

const mockMergeWithM4bTool = vi.mocked(mergeWithM4bTool)
const mockParseFile = vi.mocked(parseFile)
const mockReadAudiobookFile = vi.mocked(readAudiobookFile)

describe('convertAudiobookFiles', () => {
  let destDir: string
  let sourceDir: string

  beforeEach(async () => {
    sourceDir = await createTempDir('lib-convert-src-')
    destDir = await createTempDir('lib-convert-dst-')
    mockMergeWithM4bTool.mockReset()
    mockParseFile.mockReset()
    mockReadAudiobookFile.mockReset()
  })

  afterEach(async () => {
    await removeTempDir(sourceDir)
    await removeTempDir(destDir)
    vi.restoreAllMocks()
  })

  it('requires explicit metadata options to be provided together', async () => {
    const sourceFile = await createTempFile(sourceDir, 'source.m4b')

    await expect(convertAudiobookFiles({
      author: 'Author',
      concurrency: '1',
      destDir,
      fileName: [sourceFile],
      jobs: '1',
    })).rejects.toThrow('--author, --title, and --narrator must be provided together')
  })

  it('uses explicit metadata without reading source metadata', async () => {
    const sourceFile = await createTempFile(sourceDir, 'source.m4b')

    await expect(convertAudiobookFiles({
      author: 'Author',
      concurrency: '1',
      destDir,
      fileName: [sourceFile],
      jobs: '1',
      narrator: 'Narrator',
      title: 'Book',
    })).resolves.toEqual([{
      action: 'would convert',
      destination: 'Author - Book.m4b',
      narrator: 'Narrator',
      performer: 'Author',
      source: 'source.m4b',
      title: 'Book',
    }])
    expect(mockParseFile).not.toHaveBeenCalled()
  })

  it('aggregates failed executed conversions', async () => {
    const sourceFile = await createTempFile(sourceDir, 'source.m4b')
    mockParseFile.mockResolvedValue(makeAudioMetadata({ album: 'Book', artist: 'Author' }))
    mockMergeWithM4bTool.mockRejectedValue(new Error('conversion failed'))

    await expect(convertAudiobookFiles({
      concurrency: '1',
      destDir,
      execute: true,
      fileName: [sourceFile],
      jobs: '1',
    })).rejects.toThrow('1 audiobook conversion(s) failed')
  })

  it('rejects converted files whose metadata-derived filename does not match', async () => {
    const sourceFile = await createTempFile(sourceDir, 'source.m4b')
    mockParseFile.mockResolvedValue(makeAudioMetadata({ album: 'Book', artist: 'Author' }))
    mockReadAudiobookFile.mockResolvedValue({
      expectedFilename: 'Author - Book.m4b',
      filename: 'Wrong.m4b',
      performer: 'Author',
      sourcePath: `${destDir}/Author - Book.m4b`,
      title: 'Book',
    })

    await expect(convertAudiobookFiles({
      concurrency: '1',
      destDir,
      execute: true,
      fileName: [sourceFile],
      jobs: '1',
    })).rejects.toThrow('1 audiobook conversion(s) failed')
  })
})
