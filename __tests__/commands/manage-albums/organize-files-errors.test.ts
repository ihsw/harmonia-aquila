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
  let errorSpy: Mock
  let infoSpy: Mock

  beforeEach(() => {
    infoSpy = vi.spyOn(console, 'info').mockImplementation(() => undefined)
    vi.spyOn(console, 'table').mockImplementation(() => undefined)
    errorSpy = vi.spyOn(process.stderr, 'write').mockReturnValue(true)
    mockOrganizeAlbumFiles.mockReset()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('documents the one-album-per-run contract', () => {
    const command = makeProgram().commands.find(candidate => candidate.name() === 'organize-files')

    expect(command?.description()).toContain('one album per run')
    expect(command?.description()).toContain('--allow-multiple-albums')
  })

  it('forwards --allow-multiple-albums into the organization operation', async () => {
    mockOrganizeAlbumFiles.mockResolvedValue([])

    await makeProgram().parseAsync([
      'node', 's', 'organize-files',
      '--source-dir', 'source',
      '--dest-dir', 'destination',
      '--allow-multiple-albums',
    ])

    expect(mockOrganizeAlbumFiles).toHaveBeenCalledWith(expect.objectContaining({
      allowMultipleAlbums: true,
      destDir: 'destination',
      sourceDir: 'source',
    }))
  })

  it('omits allowMultipleAlbums when the flag is absent', async () => {
    mockOrganizeAlbumFiles.mockResolvedValue([])

    await makeProgram().parseAsync([
      'node', 's', 'organize-files',
      '--source-dir', 'source',
      '--dest-dir', 'destination',
    ])

    expect(mockOrganizeAlbumFiles.mock.calls[0]?.[0]).not.toHaveProperty('allowMultipleAlbums')
  })

  it('reports the --allow-multiple-albums sourceDirs conflict through Commander', async () => {
    mockOrganizeAlbumFiles.mockRejectedValue(new UserInputError(
      '--allow-multiple-albums requires sourceDir',
    ))
    vi.spyOn(process, 'exit').mockImplementation((): never => {
      throw new Error('exit')
    })

    await expect(makeProgram().parseAsync([
      'node', 's', 'organize-files',
      '--source-dirs', 'first', 'second',
      '--dest-dir', 'destination',
      '--disc-strategy', 'concatenate',
      '--allow-multiple-albums',
    ])).rejects.toThrow('exit')

    expect(mockOrganizeAlbumFiles).toHaveBeenCalledWith(expect.objectContaining({
      allowMultipleAlbums: true,
      sourceDirs: ['first', 'second'],
    }))
    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining('--allow-multiple-albums requires sourceDir'),
    )
    expect(infoSpy).not.toHaveBeenCalled()
  })

  it('maps metadata repair options into the organization operation', async () => {
    mockOrganizeAlbumFiles.mockResolvedValue([])

    await makeProgram().parseAsync([
      'node', 's', 'organize-files',
      '--source-dir', 'source',
      '--dest-dir', 'destination',
      '--set-album', 'Album',
      '--set-album-artist', 'Various Artists',
      '--disc-strategy', 'infer',
      '--destination-strategy', 'overwrite',
    ])

    expect(mockOrganizeAlbumFiles).toHaveBeenCalledWith(expect.objectContaining({
      albumArtistsStrategy: 'no change',
      albumStrategy: 'no change',
      destDir: 'destination',
      destinationStrategy: 'overwrite',
      discStrategy: 'infer',
      setAlbum: 'Album',
      setAlbumArtist: 'Various Artists',
      sourceDir: 'source',
    }))
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

  it('reports actionable duplicate-track guidance through Commander', async () => {
    const message = 'Duplicate track numbers were detected: Track 32. Fix with setMetadata or discStrategy "infer".'
    mockOrganizeAlbumFiles.mockRejectedValue(new UserInputError(message))
    vi.spyOn(process, 'exit').mockImplementation((): never => {
      throw new Error('exit')
    })

    await expect(makeProgram().parseAsync([
      'node', 's', 'organize-files',
      '--source-dir', 'source',
      '--dest-dir', 'destination',
    ])).rejects.toThrow('exit')

    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining(message))
    expect(infoSpy).not.toHaveBeenCalled()
  })
})
