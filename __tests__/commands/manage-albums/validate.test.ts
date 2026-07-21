import { Command } from 'commander'
import { afterEach, beforeEach, describe, expect, it, type Mock, vi } from 'vitest'

import { registerValidateAlbumSourceDirCommand } from '../../../src/commands/manage-albums/validate.js'
import { validateAlbumSourceDir } from '../../../src/lib/albums/validate.js'
import { UserInputError } from '../../../src/lib/errors.js'

vi.mock('../../../src/lib/albums/validate.js', () => ({
  validateAlbumSourceDir: vi.fn(),
}))

const mockValidateAlbumSourceDir = vi.mocked(validateAlbumSourceDir)

function makeProgram(): Command {
  const program = new Command()
  registerValidateAlbumSourceDirCommand(program)
  return program
}

describe('manage-albums validate', () => {
  let infoSpy: Mock

  beforeEach(() => {
    infoSpy = vi.spyOn(console, 'info').mockImplementation(() => undefined)
    vi.spyOn(console, 'table').mockImplementation(() => undefined)
    vi.spyOn(process.stderr, 'write').mockReturnValue(true)
    mockValidateAlbumSourceDir.mockReset()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('passes options to validation and writes JSON rows', async () => {
    mockValidateAlbumSourceDir.mockResolvedValue([{
      album: 'Album',
      artistFilename: 'Artist',
      artistFilenameStrategy: 'artist',
      destination: 'Artist/Album/01 - Title.flac',
      filename: 'track01.flac',
      issues: [],
      status: 'valid',
      titleFilename: 'Title',
      titleFilenameStrategy: 'title',
      trackNumber: '01',
    }])

    await makeProgram().parseAsync([
      'node', 's', 'validate',
      '--dir-name', 'source',
      '--artist-filename-strategy', 'albumartist',
      '--title-filename-strategy', 'subtitle',
      '--ignore-non-audio-files',
      '--limit', '2',
      '--format', 'json',
    ])

    expect(mockValidateAlbumSourceDir).toHaveBeenCalledWith(expect.objectContaining({
      artistFilenameStrategy: 'albumartist',
      dirName: 'source',
      ignoreNonAudioFiles: true,
      limit: '2',
      titleFilenameStrategy: 'subtitle',
    }))
    expect(JSON.parse(String(infoSpy.mock.calls[0]?.[0]))).toEqual([{
      album: 'Album',
      artistFilename: 'Artist',
      artistFilenameStrategy: 'artist',
      destination: 'Artist/Album/01 - Title.flac',
      filename: 'track01.flac',
      issues: [],
      status: 'valid',
      titleFilename: 'Title',
      titleFilenameStrategy: 'title',
      trackNumber: '01',
    }])
  })

  it('reports validation user input errors through commander', async () => {
    mockValidateAlbumSourceDir.mockRejectedValue(new UserInputError('invalid validation input'))
    vi.spyOn(process, 'exit').mockImplementation((): never => {
      throw new Error('exit')
    })

    await expect(
      makeProgram().parseAsync([
        'node', 's', 'validate',
        '--dir-name', 'source',
      ]),
    ).rejects.toThrow('exit')
  })
})
