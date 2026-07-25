import { Command } from 'commander'
import { parseFile } from 'music-metadata'
import { readdir } from 'node:fs/promises'
import { afterEach, beforeEach, describe, expect, it, type Mock, vi } from 'vitest'

import { type OrganizeFilesJsonOutput, registerOrganizeFilesCommand } from '../../../src/commands/manage-albums/organize-files.js'
import { organizeAlbumFiles } from '../../../src/lib/albums/organize-files.js'
import { createTempDir, createTempFile, makeAudioMetadata, removeTempDir } from '../../test-helpers.js'

vi.mock('music-metadata', () => ({
  parseFile: vi.fn(),
}))

const mockParseFile = vi.mocked(parseFile)

function makeProgram(): Command {
  const program = new Command()
  registerOrganizeFilesCommand(program)
  return program
}

describe('organize-files', () => {
  let sourceDir: string
  let destDir: string
  let infoSpy: Mock

  beforeEach(async () => {
    sourceDir = await createTempDir('organize-src-')
    destDir = await createTempDir('organize-dst-')
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

  it('plans a dry-run copy with correct metadata fields in JSON output', async () => {
    await createTempFile(sourceDir, 'track01.flac')
    mockParseFile.mockResolvedValue(
      makeAudioMetadata({ album: 'Test Album', artist: 'Test Artist', title: 'Track One', track: { no: 1, of: null } }),
    )

    await makeProgram().parseAsync([
      'node', 's', 'organize-files',
      '--source-dir', sourceDir,
      '--dest-dir', destDir,
      '--format', 'json',
    ])

    const rawArg: unknown = infoSpy.mock.calls[0]?.[0]
    const rows = JSON.parse(String(rawArg)) as OrganizeFilesJsonOutput
    expect(rows).toHaveLength(1)
    expect(rows[0]?.action).toBe('would copy')
    expect(rows[0]?.album).toBe('Test Album')
    expect(rows[0]?.artistFilename).toBe('Test Artist')
    expect(rows[0]?.titleFilename).toBe('Track One')
    expect(rows[0]?.trackNumber).toBe('01')
  })

  it('errors when a file is missing required metadata (no track number)', async () => {
    await createTempFile(sourceDir, 'track01.flac')
    mockParseFile.mockResolvedValue(
      makeAudioMetadata({ album: 'Album', artist: 'Artist', title: 'Title' }),
    )

    vi.spyOn(process, 'exit').mockImplementation((): never => {
      throw new Error('exit')
    })

    await expect(
      makeProgram().parseAsync([
        'node', 's', 'organize-files',
        '--source-dir', sourceDir,
        '--dest-dir', destDir,
      ]),
    ).rejects.toThrow()
  })

  it('errors when two source files resolve to the same destination', async () => {
    await createTempFile(sourceDir, 'track01.flac')
    await createTempFile(sourceDir, 'track01-copy.flac')
    mockParseFile.mockResolvedValue(
      makeAudioMetadata({ album: 'Album', artist: 'Artist', title: 'Title', track: { no: 1, of: null } }),
    )

    vi.spyOn(process, 'exit').mockImplementation((): never => {
      throw new Error('exit')
    })

    await expect(
      makeProgram().parseAsync([
        'node', 's', 'organize-files',
        '--source-dir', sourceDir,
        '--dest-dir', destDir,
      ]),
    ).rejects.toThrow()
  })

  it('rejects one output album name for multiple artists before copying in dry-run and execute modes', async () => {
    await createTempFile(sourceDir, 'artist-a.flac')
    await createTempFile(sourceDir, 'artist-b.flac')
    const artistAMetadata = makeAudioMetadata({
      album: 'Same Album',
      artist: 'Artist A',
      title: 'Track One',
      track: { no: 1, of: null },
    })
    const artistBMetadata = makeAudioMetadata({
      album: 'Same Album',
      artist: 'Artist B',
      title: 'Track Two',
      track: { no: 2, of: null },
    })
    mockParseFile
      .mockResolvedValueOnce(artistAMetadata)
      .mockResolvedValueOnce(artistBMetadata)
      .mockResolvedValueOnce(artistAMetadata)
      .mockResolvedValueOnce(artistBMetadata)

    const options = { destDir, sourceDir }

    await expect(organizeAlbumFiles(options)).rejects.toThrow(
      'Multiple artists resolve to the same album directory: Same Album (Artist A, Artist B)',
    )
    await expect(organizeAlbumFiles({ ...options, execute: true })).rejects.toThrow(
      'Multiple artists resolve to the same album directory: Same Album (Artist A, Artist B)',
    )

    expect(await readdir(destDir)).toEqual([])
  })

  it('allows multiple tracks from one artist and album', async () => {
    await createTempFile(sourceDir, 'track01.flac')
    await createTempFile(sourceDir, 'track02.flac')
    mockParseFile
      .mockResolvedValueOnce(makeAudioMetadata({
        album: 'Same Album',
        artist: 'Artist A',
        title: 'Track One',
        track: { no: 1, of: null },
      }))
      .mockResolvedValueOnce(makeAudioMetadata({
        album: 'Same Album',
        artist: 'Artist A',
        title: 'Track Two',
        track: { no: 2, of: null },
      }))

    const rows = await organizeAlbumFiles({ destDir, sourceDir })

    expect(rows).toHaveLength(2)
    expect(rows.map(row => row.destination)).toEqual([
      'Artist A/Same Album/01 - Track One.flac',
      'Artist A/Same Album/02 - Track Two.flac',
    ])
  })
})
