import { Command } from 'commander'
import { parseFile } from 'music-metadata'
import { afterEach, beforeEach, describe, expect, it, type Mock, vi } from 'vitest'

import { mergeWithM4bTool } from '../../../src/commands/manage-audiobooks/helpers/m4b-tool.js'
import { registerMergeAudiobooksCommand } from '../../../src/commands/manage-audiobooks/merge.js'
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
  registerMergeAudiobooksCommand(program)
  return program
}

describe('merge', () => {
  let sourceDir: string
  let destDir: string
  let infoSpy: Mock

  beforeEach(async () => {
    sourceDir = await createTempDir('merge-src-')
    destDir = await createTempDir('merge-dst-')
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

  it('plans a grouped merge and outputs a would-merge row in JSON', async () => {
    await createTempFile(sourceDir, 'part01.m4b')
    await createTempFile(sourceDir, 'part02.m4b')
    mockParseFile.mockResolvedValue(
      makeAudioMetadata({ album: 'Epic Story', artist: 'Big Author' }),
    )

    await makeProgram().parseAsync([
      'node', 's', 'merge',
      '--source-dir', sourceDir,
      '--dest-dir', destDir,
      '--format', 'json',
    ])

    const rawArg: unknown = infoSpy.mock.calls[0]?.[0]
    const rows = JSON.parse(String(rawArg)) as Array<{ action: string, destination: string, sourceFiles: number }>
    expect(rows).toHaveLength(1)
    expect(rows[0]?.action).toBe('would merge')
    expect(rows[0]?.destination).toBe('Big Author - Epic Story.m4b')
    expect(rows[0]?.sourceFiles).toBe(2)
  })

  it('does not invoke mergeWithM4bTool during a dry run', async () => {
    await createTempFile(sourceDir, 'file.m4b')
    mockParseFile.mockResolvedValue(
      makeAudioMetadata({ album: 'Title', artist: 'Author' }),
    )

    await makeProgram().parseAsync([
      'node', 's', 'merge',
      '--source-dir', sourceDir,
      '--dest-dir', destDir,
    ])

    expect(mockMergeWithM4bTool).not.toHaveBeenCalled()
  })

  it('errors when destination file already exists', async () => {
    await createTempFile(sourceDir, 'file.m4b')
    await createTempFile(destDir, 'Big Author - Epic Story.m4b')
    mockParseFile.mockResolvedValue(
      makeAudioMetadata({ album: 'Epic Story', artist: 'Big Author' }),
    )

    vi.spyOn(process, 'exit').mockImplementation((): never => {
      throw new Error('exit')
    })

    await expect(
      makeProgram().parseAsync([
        'node', 's', 'merge',
        '--source-dir', sourceDir,
        '--dest-dir', destDir,
      ]),
    ).rejects.toThrow()
  })
})
