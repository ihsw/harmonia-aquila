import { Command } from 'commander'
import { parseFile } from 'music-metadata'
import { afterEach, beforeEach, describe, expect, it, type Mock, vi } from 'vitest'

import { registerConvertAudiobookFileCommand } from '../../../src/commands/manage-audiobooks/convert-file.js'
import { mergeWithM4bTool } from '../../../src/commands/manage-audiobooks/helpers/m4b-tool.js'
import { createTempDir, createTempFile, makeAudioMetadata, removeTempDir } from '../../test-helpers.js'

vi.mock('music-metadata', () => ({
  parseFile: vi.fn(),
}))

vi.mock('../../../src/commands/manage-audiobooks/helpers/m4b-tool.js', () => ({
  mergeWithM4bTool: vi.fn(),
  parseM4bToolJobs: vi.fn().mockImplementation((cmd: Command, value: string) => {
    const n = Number(value)
    if (!Number.isInteger(n) || n < 1) {
      cmd.error('--jobs must be a positive integer')
    }
    return n
  }),
}))

const mockParseFile = vi.mocked(parseFile)
const mockMergeWithM4bTool = vi.mocked(mergeWithM4bTool)

function makeProgram(): Command {
  const program = new Command()
  registerConvertAudiobookFileCommand(program)
  return program
}

describe('convert-file', () => {
  let sourceDir: string
  let destDir: string
  let infoSpy: Mock

  beforeEach(async () => {
    sourceDir = await createTempDir('convert-src-')
    destDir = await createTempDir('convert-dst-')
    infoSpy = vi.spyOn(console, 'info').mockImplementation(() => undefined)
    vi.spyOn(console, 'table').mockImplementation(() => undefined)
    vi.spyOn(process.stderr, 'write').mockReturnValue(true)
    mockParseFile.mockReset()
    mockMergeWithM4bTool.mockReset()
  })

  afterEach(async () => {
    await removeTempDir(sourceDir)
    await removeTempDir(destDir)
    vi.restoreAllMocks()
  })

  it('plans a dry-run conversion and outputs a would-convert row in JSON', async () => {
    const filePath = await createTempFile(sourceDir, 'source.m4b')
    mockParseFile.mockResolvedValue(
      makeAudioMetadata({ album: 'Audio Book', artist: 'The Narrator' }),
    )

    await makeProgram().parseAsync([
      'node', 's', 'convert-file',
      '--file-name', filePath,
      '--dest-dir', destDir,
      '--format', 'json',
    ])

    const rawArg: unknown = infoSpy.mock.calls[0]?.[0]
    const rows = JSON.parse(String(rawArg)) as Array<{ action: string, destination: string, performer: string }>
    expect(rows).toHaveLength(1)
    expect(rows[0]?.action).toBe('would convert')
    expect(rows[0]?.destination).toBe('The Narrator - Audio Book.m4b')
    expect(rows[0]?.performer).toBe('The Narrator')
  })

  it('does not invoke mergeWithM4bTool during a dry run', async () => {
    const filePath = await createTempFile(sourceDir, 'source.m4b')
    mockParseFile.mockResolvedValue(
      makeAudioMetadata({ album: 'Book', artist: 'Author' }),
    )

    await makeProgram().parseAsync([
      'node', 's', 'convert-file',
      '--file-name', filePath,
      '--dest-dir', destDir,
    ])

    expect(mockMergeWithM4bTool).not.toHaveBeenCalled()
  })

  it('errors when no --file-name is provided', async () => {
    vi.spyOn(process, 'exit').mockImplementation((): never => {
      throw new Error('exit')
    })

    await expect(
      makeProgram().parseAsync([
        'node', 's', 'convert-file',
        '--dest-dir', destDir,
      ]),
    ).rejects.toThrow()
  })

  it('errors when destination file already exists', async () => {
    const filePath = await createTempFile(sourceDir, 'source.m4b')
    await createTempFile(destDir, 'Author - Book.m4b')
    mockParseFile.mockResolvedValue(
      makeAudioMetadata({ album: 'Book', artist: 'Author' }),
    )

    vi.spyOn(process, 'exit').mockImplementation((): never => {
      throw new Error('exit')
    })

    await expect(
      makeProgram().parseAsync([
        'node', 's', 'convert-file',
        '--file-name', filePath,
        '--dest-dir', destDir,
      ]),
    ).rejects.toThrow()
  })
})
