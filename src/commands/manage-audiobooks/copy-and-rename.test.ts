import { Command } from 'commander'
import { parseFile } from 'music-metadata'
import { afterEach, beforeEach, describe, expect, it, type Mock, vi } from 'vitest'

import { createTempDir, createTempFile, makeAudioMetadata, removeTempDir } from '../../test-helpers.js'

import { type CopyAndRenameAudiobookJsonOutput, registerCopyAndRenameAudiobookCommand } from './copy-and-rename.js'

vi.mock('music-metadata', () => ({
  parseFile: vi.fn(),
}))

const mockParseFile = vi.mocked(parseFile)

function makeProgram(): Command {
  const program = new Command()
  registerCopyAndRenameAudiobookCommand(program)
  return program
}

describe('copy-and-rename', () => {
  let sourceDir: string
  let destDir: string
  let infoSpy: Mock

  beforeEach(async () => {
    sourceDir = await createTempDir('copy-rename-src-')
    destDir = await createTempDir('copy-rename-dst-')
    infoSpy = vi.spyOn(console, 'info').mockImplementation(() => undefined)
    vi.spyOn(console, 'table').mockImplementation(() => undefined)
    vi.spyOn(process.stderr, 'write').mockReturnValue(true)
    mockParseFile.mockReset()
  })

  afterEach(async () => {
    await removeTempDir(sourceDir)
    await removeTempDir(destDir)
    vi.restoreAllMocks()
  })

  it('plans a dry-run copy with expected filename in JSON output', async () => {
    const filePath = await createTempFile(sourceDir, 'old-name.m4b')
    mockParseFile.mockResolvedValue(
      makeAudioMetadata({ album: 'Great Book', artist: 'Jane Doe' }),
    )

    await makeProgram().parseAsync([
      'node', 's', 'copy-and-rename',
      '--file-name', filePath,
      '--dest-dir', destDir,
      '--format', 'json',
    ])

    const rawArg: unknown = infoSpy.mock.calls[0]?.[0]
    const rows = JSON.parse(String(rawArg)) as CopyAndRenameAudiobookJsonOutput
    expect(rows).toHaveLength(1)
    expect(rows[0]?.action).toBe('would copy')
    expect(rows[0]?.destination).toBe('Jane Doe - Great Book.m4b')
    expect(rows[0]?.performer).toBe('Jane Doe')
    expect(rows[0]?.title).toBe('Great Book')
  })

  it('errors when filename already matches metadata', async () => {
    const filePath = await createTempFile(sourceDir, 'Jane Doe - Great Book.m4b')
    mockParseFile.mockResolvedValue(
      makeAudioMetadata({ album: 'Great Book', artist: 'Jane Doe' }),
    )

    vi.spyOn(process, 'exit').mockImplementation((): never => {
      throw new Error('exit')
    })

    await expect(
      makeProgram().parseAsync([
        'node', 's', 'copy-and-rename',
        '--file-name', filePath,
        '--dest-dir', destDir,
      ]),
    ).rejects.toThrow()
  })

  it('errors when destination file already exists', async () => {
    const filePath = await createTempFile(sourceDir, 'old-name.m4b')
    await createTempFile(destDir, 'Jane Doe - Great Book.m4b')
    mockParseFile.mockResolvedValue(
      makeAudioMetadata({ album: 'Great Book', artist: 'Jane Doe' }),
    )

    vi.spyOn(process, 'exit').mockImplementation((): never => {
      throw new Error('exit')
    })

    await expect(
      makeProgram().parseAsync([
        'node', 's', 'copy-and-rename',
        '--file-name', filePath,
        '--dest-dir', destDir,
      ]),
    ).rejects.toThrow()
  })
})
