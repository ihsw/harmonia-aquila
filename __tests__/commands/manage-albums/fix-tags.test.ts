import { Command } from 'commander'
import { parseFile } from 'music-metadata'
import { afterEach, beforeEach, describe, expect, it, type Mock, vi } from 'vitest'

import { type FixTagsJsonOutput, registerFixTagsCommand } from '../../../src/commands/manage-albums/fix-tags.js'
import { createTempDir, createTempFile, makeAudioMetadata, removeTempDir } from '../../test-helpers.js'

vi.mock('music-metadata', () => ({
  parseFile: vi.fn(),
}))

vi.mock('../../../src/lib/albums/audio-tags.js', () => ({
  writeAudioTagFix: vi.fn(),
}))

const mockParseFile = vi.mocked(parseFile)

function makeProgram(): Command {
  const program = new Command()
  registerFixTagsCommand(program)
  return program
}

describe('fix-tags', () => {
  let sourceDir: string
  let destDir: string
  let infoSpy: Mock

  beforeEach(async () => {
    sourceDir = await createTempDir('fix-tags-src-')
    destDir = await createTempDir('fix-tags-dst-')
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

  it('plans a dry run with no changes and outputs JSON', async () => {
    await createTempFile(sourceDir, 'track01.flac')
    mockParseFile.mockResolvedValue(
      makeAudioMetadata({ album: 'Album', artist: 'Artist', title: 'Title', track: { no: 1, of: null } }),
    )

    await makeProgram().parseAsync([
      'node', 's', 'fix-tags',
      '--source-dir', sourceDir,
      '--dest-dir', destDir,
      '--format', 'json',
    ])

    const rawArg: unknown = infoSpy.mock.calls[0]?.[0]
    const rows = JSON.parse(String(rawArg)) as FixTagsJsonOutput
    expect(rows).toHaveLength(1)
    expect(rows[0]?.album).toBe('Album')
    expect(rows[0]?.artist).toBe('Artist')
    expect(rows[0]?.title).toBe('Title')
  })

  it('errors when destination file already exists with default strategy', async () => {
    await createTempFile(sourceDir, 'track01.flac')
    await createTempFile(destDir, 'track01.flac')
    mockParseFile.mockResolvedValue(makeAudioMetadata({ album: 'A', artist: 'B', title: 'C' }))

    vi.spyOn(process, 'exit').mockImplementation((): never => {
      throw new Error('exit')
    })

    await expect(
      makeProgram().parseAsync([
        'node', 's', 'fix-tags',
        '--source-dir', sourceDir,
        '--dest-dir', destDir,
      ]),
    ).rejects.toThrow()
  })

  it('errors when conflicting album strategies are provided', async () => {
    await createTempFile(sourceDir, 'track01.flac')
    mockParseFile.mockResolvedValue(makeAudioMetadata())

    vi.spyOn(process, 'exit').mockImplementation((): never => {
      throw new Error('exit')
    })

    await expect(
      makeProgram().parseAsync([
        'node', 's', 'fix-tags',
        '--source-dir', sourceDir,
        '--dest-dir', destDir,
        '--set-album', 'X',
        '--album-strategy', 'grouping',
      ]),
    ).rejects.toThrow()
  })
})
