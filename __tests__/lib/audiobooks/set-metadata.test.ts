import { parseFile } from 'music-metadata'
import { File as TaglibFile } from 'node-taglib-sharp'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { setAudiobookMetadata } from '../../../src/lib/audiobooks/set-metadata.js'
import { createTempDir, createTempFile, makeAudioMetadata, removeTempDir } from '../../test-helpers.js'

vi.mock('music-metadata', () => ({
  parseFile: vi.fn(),
}))

const mockAudioFile = vi.hoisted(() => ({
  dispose: vi.fn(),
  save: vi.fn(),
  tag: {
    album: '',
    composers: [] as string[],
    performers: [] as string[],
  },
}))

vi.mock('node-taglib-sharp', () => ({
  File: {
    createFromPath: vi.fn(() => mockAudioFile),
  },
}))

const mockCreateFromPath = vi.mocked(TaglibFile.createFromPath)
const mockParseFile = vi.mocked(parseFile)

describe('setAudiobookMetadata', () => {
  let tempDir: string

  beforeEach(async () => {
    tempDir = await createTempDir('lib-set-metadata-')
    mockAudioFile.dispose.mockClear()
    mockAudioFile.save.mockClear()
    mockCreateFromPath.mockClear()
    mockParseFile.mockReset()
  })

  afterEach(async () => {
    await removeTempDir(tempDir)
    vi.restoreAllMocks()
  })

  it('returns a dry-run row without writing metadata', async () => {
    const sourceFile = await createTempFile(tempDir, 'source.m4b')

    await expect(setAudiobookMetadata({
      author: 'Author',
      destFilepath: `${tempDir}/dest.m4b`,
      sourceFilepath: sourceFile,
      title: 'Book',
    })).resolves.toEqual([{
      action: 'would set metadata',
      author: 'Author',
      destination: 'dest.m4b',
      narrator: 'Author',
      source: 'source.m4b',
      title: 'Book',
    }])
    expect(mockCreateFromPath).not.toHaveBeenCalled()
  })

  it('copies and validates metadata when execute is true', async () => {
    const sourceFile = await createTempFile(tempDir, 'source.m4b')
    mockParseFile.mockResolvedValue(makeAudioMetadata({ album: 'Book', artist: 'Author', composer: ['Narrator'] }))

    await expect(setAudiobookMetadata({
      author: 'Author',
      destFilepath: `${tempDir}/nested/dest.m4b`,
      execute: true,
      narrator: 'Narrator',
      sourceFilepath: sourceFile,
      title: 'Book',
    })).resolves.toEqual([expect.objectContaining({
      action: 'set metadata',
      narrator: 'Narrator',
    })])
    expect(mockCreateFromPath.mock.calls[0]?.[0]).toContain('dest.m4b')
    expect(mockAudioFile.tag).toMatchObject({
      album: 'Book',
      composers: ['Narrator'],
      performers: ['Author'],
    })
    expect(mockAudioFile.save).toHaveBeenCalledOnce()
    expect(mockAudioFile.dispose).toHaveBeenCalledOnce()
  })

  it('rejects metadata validation failures after writing', async () => {
    const sourceFile = await createTempFile(tempDir, 'source.m4b')
    mockParseFile.mockResolvedValue(makeAudioMetadata({ album: 'Other', artist: 'Author', composer: ['Narrator'] }))

    await expect(setAudiobookMetadata({
      author: 'Author',
      destFilepath: `${tempDir}/dest.m4b`,
      execute: true,
      narrator: 'Narrator',
      sourceFilepath: sourceFile,
      title: 'Book',
    })).rejects.toThrow('metadata was not set as requested')
  })
})
