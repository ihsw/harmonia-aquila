import { Command } from 'commander'
import { afterEach, beforeEach, describe, expect, it, type Mock, vi } from 'vitest'

import { registerOrganizeFilesCommand } from '../../../src/commands/manage-albums/organize-files.js'
import { organizeAlbumFiles } from '../../../src/lib/albums/organize-files.js'
import { UserInputError } from '../../../src/lib/errors.js'

vi.mock('../../../src/lib/albums/organize-files.js', () => ({
  organizeAlbumFiles: vi.fn(),
}))

const mockOrganizeAlbumFiles = vi.mocked(organizeAlbumFiles)

function makeProgram(): Command {
  const program = new Command()
  registerOrganizeFilesCommand(program)
  return program
}

describe('manage-albums organize-files errors', () => {
  let infoSpy: Mock

  beforeEach(() => {
    infoSpy = vi.spyOn(console, 'info').mockImplementation(() => undefined)
    vi.spyOn(console, 'table').mockImplementation(() => undefined)
    vi.spyOn(process.stderr, 'write').mockReturnValue(true)
    mockOrganizeAlbumFiles.mockReset()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('documents the one-album-per-run contract', () => {
    const command = makeProgram().commands.find(candidate => candidate.name() === 'organize-files')

    expect(command?.description()).toContain('one album per run')
  })

  it('reports multiple albums through Commander without output or execute widening', async () => {
    mockOrganizeAlbumFiles.mockRejectedValue(new UserInputError(
      'Multiple albums found: Album A, Album B',
    ))
    vi.spyOn(process, 'exit').mockImplementation((): never => {
      throw new Error('exit')
    })

    await expect(makeProgram().parseAsync([
      'node', 's', 'organize-files',
      '--source-dir', 'source',
      '--dest-dir', 'destination',
    ])).rejects.toThrow('exit')

    expect(mockOrganizeAlbumFiles).toHaveBeenCalledWith(expect.not.objectContaining({
      execute: true,
    }))
    expect(infoSpy).not.toHaveBeenCalled()
  })
})
