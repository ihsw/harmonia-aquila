import { Command } from 'commander'
import { parseFile } from 'music-metadata'
import { afterEach, beforeEach, describe, expect, it, type Mock, vi } from 'vitest'

import { createTempDir, createTempFile, makeAudioMetadata, removeTempDir } from '../../test-helpers.js'

import { registerValidateAudiobookCommand, type ValidateAudiobookJsonOutput } from './validate.js'

vi.mock('music-metadata', () => ({
  parseFile: vi.fn(),
}))

const mockParseFile = vi.mocked(parseFile)

function makeProgram(): Command {
  const program = new Command()
  registerValidateAudiobookCommand(program)
  return program
}

describe('validate', () => {
  let tempDir: string
  let infoSpy: Mock

  beforeEach(async () => {
    tempDir = await createTempDir('validate-')
    infoSpy = vi.spyOn(console, 'info').mockImplementation(() => undefined)
    vi.spyOn(console, 'table').mockImplementation(() => undefined)
    vi.spyOn(process.stderr, 'write').mockReturnValue(true)
    mockParseFile.mockReset()
  })

  afterEach(async () => {
    await removeTempDir(tempDir)
    vi.restoreAllMocks()
  })

  it('outputs valid JSON row when filename matches metadata', async () => {
    const filePath = await createTempFile(tempDir, 'John Smith - My Book.m4b')
    mockParseFile.mockResolvedValue(
      makeAudioMetadata({ album: 'My Book', artist: 'John Smith' }),
    )

    await makeProgram().parseAsync([
      'node', 's', 'validate',
      '--file-name', filePath,
      '--format', 'json',
    ])

    const rawArg: unknown = infoSpy.mock.calls[0]?.[0]
    const rows = JSON.parse(String(rawArg)) as ValidateAudiobookJsonOutput
    expect(rows).toHaveLength(1)
    expect(rows[0]?.valid).toBe(true)
    expect(rows[0]?.performer).toBe('John Smith')
    expect(rows[0]?.title).toBe('My Book')
  })

  it('errors when filename does not match metadata', async () => {
    const filePath = await createTempFile(tempDir, 'Wrong Name.m4b')
    mockParseFile.mockResolvedValue(
      makeAudioMetadata({ album: 'My Book', artist: 'John Smith' }),
    )

    vi.spyOn(process, 'exit').mockImplementation((): never => {
      throw new Error('exit')
    })

    await expect(
      makeProgram().parseAsync([
        'node', 's', 'validate',
        '--file-name', filePath,
      ]),
    ).rejects.toThrow()
  })

  it('errors when required metadata fields are missing', async () => {
    const filePath = await createTempFile(tempDir, 'NoMeta.m4b')
    mockParseFile.mockResolvedValue(makeAudioMetadata())

    vi.spyOn(process, 'exit').mockImplementation((): never => {
      throw new Error('exit')
    })

    await expect(
      makeProgram().parseAsync([
        'node', 's', 'validate',
        '--file-name', filePath,
      ]),
    ).rejects.toThrow()
  })
})
