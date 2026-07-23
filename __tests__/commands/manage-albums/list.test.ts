import { Command } from 'commander'
import { afterEach, beforeEach, describe, expect, it, type Mock, vi } from 'vitest'

import { registerListAlbumSourceDirCommand } from '../../../src/commands/manage-albums/list.js'
import { listAlbumSourceDir } from '../../../src/lib/albums/list.js'
import { UserInputError } from '../../../src/lib/errors.js'

vi.mock('../../../src/lib/albums/list.js', () => ({
  listAlbumSourceDir: vi.fn(),
}))

const mockListAlbumSourceDir = vi.mocked(listAlbumSourceDir)

function makeProgram(): Command {
  const program = new Command()
  registerListAlbumSourceDirCommand(program)
  return program
}

describe('manage-albums list', () => {
  let infoSpy: Mock

  beforeEach(() => {
    infoSpy = vi.spyOn(console, 'info').mockImplementation(() => undefined)
    vi.spyOn(console, 'table').mockImplementation(() => undefined)
    vi.spyOn(process.stderr, 'write').mockReturnValue(true)
    mockListAlbumSourceDir.mockReset()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('passes sourceDir and prefix to the library and outputs JSON', async () => {
    mockListAlbumSourceDir.mockResolvedValue(['a.flac', 'b.flac'])

    await makeProgram().parseAsync([
      'node', 's', 'list',
      '--source-dir', '/music',
      '--prefix', 'albums/',
      '--format', 'json',
    ])

    expect(mockListAlbumSourceDir).toHaveBeenCalledWith(
      expect.objectContaining({ prefix: 'albums/', sourceDir: '/music' }),
    )
    const rawArg: unknown = infoSpy.mock.calls[0]?.[0]
    expect(JSON.parse(String(rawArg))).toEqual(['a.flac', 'b.flac'])
  })

  it('defaults prefix to empty string', async () => {
    mockListAlbumSourceDir.mockResolvedValue([])

    await makeProgram().parseAsync([
      'node', 's', 'list',
      '--source-dir', '/music',
    ])

    expect(mockListAlbumSourceDir).toHaveBeenCalledWith(
      expect.objectContaining({ prefix: '', sourceDir: '/music' }),
    )
  })

  it('outputs plaintext via console.table by default', async () => {
    const tableSpy = vi.spyOn(console, 'table').mockImplementation(() => undefined)
    mockListAlbumSourceDir.mockResolvedValue(['a.flac'])

    await makeProgram().parseAsync([
      'node', 's', 'list',
      '--source-dir', '/music',
      '--format', 'plaintext',
    ])

    expect(tableSpy).toHaveBeenCalledWith(['a.flac'])
  })

  it('calls Command.error on UserInputError from library', async () => {
    mockListAlbumSourceDir.mockRejectedValue(new UserInputError('bad prefix'))
    vi.spyOn(process, 'exit').mockImplementation((): never => {
      throw new Error('exit')
    })

    await expect(
      makeProgram().parseAsync([
        'node', 's', 'list',
        '--source-dir', '/music',
      ]),
    ).rejects.toThrow('exit')
  })
})
