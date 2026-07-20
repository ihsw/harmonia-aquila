import { Command } from 'commander'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { getAudiobookFile } from '../../../../src/commands/manage-audiobooks/helpers/audiobook-file.js'
import { parseM4bToolJobs } from '../../../../src/commands/manage-audiobooks/helpers/m4b-tool.js'
import { readAudiobookFile } from '../../../../src/lib/audiobooks/audiobook-file.js'
import * as m4bTool from '../../../../src/lib/audiobooks/m4b-tool.js'

vi.mock('../../../../src/lib/audiobooks/audiobook-file.js', () => ({
  readAudiobookFile: vi.fn(),
}))

vi.mock('../../../../src/lib/audiobooks/m4b-tool.js', () => ({
  parseM4bToolJobs: vi.fn(),
}))

const mockParseM4bToolJobs = vi.mocked(m4bTool.parseM4bToolJobs)
const mockReadAudiobookFile = vi.mocked(readAudiobookFile)

function makeCommand(): Command {
  const command = new Command()
  vi.spyOn(command, 'error').mockImplementation((message: string): never => {
    throw new Error(message)
  })
  return command
}

describe('manage-audiobooks command helper wrappers', () => {
  beforeEach(() => {
    mockParseM4bToolJobs.mockReset()
    mockReadAudiobookFile.mockReset()
  })

  it('returns audiobook metadata from the library helper', async () => {
    mockReadAudiobookFile.mockResolvedValue({
      expectedFilename: 'Author - Book.m4b',
      filename: 'source.m4b',
      performer: 'Author',
      sourcePath: '/books/source.m4b',
      title: 'Book',
    })

    await expect(getAudiobookFile(makeCommand(), '/books/source.m4b')).resolves.toMatchObject({
      expectedFilename: 'Author - Book.m4b',
    })
  })

  it('reports audiobook helper errors through commander', async () => {
    mockReadAudiobookFile.mockRejectedValue(new Error('bad audiobook'))

    await expect(getAudiobookFile(makeCommand(), 'bad.txt')).rejects.toThrow('bad audiobook')
  })

  it('returns parsed m4b-tool job counts', () => {
    mockParseM4bToolJobs.mockReturnValue(4)

    expect(parseM4bToolJobs(makeCommand(), '4')).toBe(4)
  })

  it('reports invalid m4b-tool jobs through commander', () => {
    mockParseM4bToolJobs.mockImplementation(() => {
      throw new Error('--jobs must be a positive integer')
    })

    expect(() => parseM4bToolJobs(makeCommand(), '0')).toThrow('--jobs must be a positive integer')
  })
})
