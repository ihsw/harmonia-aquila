import { Command } from 'commander'
import { parseFile } from 'music-metadata'
import { afterEach, beforeEach, describe, expect, it, type Mock, vi } from 'vitest'

import { createTempDir, createTempFile, makeAudioMetadata, removeTempDir } from '../../test-helpers.js'

import { registerSummarizeSourceDirCommand, type SummarizeSourceDirJsonOutput } from './summarize-source-dir.js'

vi.mock('music-metadata', () => ({
  parseFile: vi.fn(),
}))

const mockParseFile = vi.mocked(parseFile)

function makeProgram(): Command {
  const program = new Command()
  registerSummarizeSourceDirCommand(program)
  return program
}

describe('summarize-source-dir', () => {
  let tempDir: string
  let infoSpy: Mock

  beforeEach(async () => {
    tempDir = await createTempDir('summarize-')
    infoSpy = vi.spyOn(console, 'info').mockImplementation(() => undefined)
    vi.spyOn(console, 'table').mockImplementation(() => undefined)
    mockParseFile.mockReset()
  })

  afterEach(async () => {
    await removeTempDir(tempDir)
    vi.restoreAllMocks()
  })

  it('returns JSON metadata for audio files in the directory', async () => {
    await createTempFile(tempDir, 'track01.flac')
    mockParseFile.mockResolvedValue(
      makeAudioMetadata(
        { album: 'My Album', artist: 'The Artist', title: 'First Track', track: { no: 1, of: 10 } },
        { bitrate: 800000, duration: 300, sampleRate: 44100 },
      ),
    )

    const program = makeProgram()
    await program.parseAsync([
      'node', 's', 'summarize-source-dir',
      '--dir-name', tempDir,
      '--format', 'json',
    ])

    const rawArg: unknown = infoSpy.mock.calls[0]?.[0]
    const rows = JSON.parse(String(rawArg)) as SummarizeSourceDirJsonOutput
    expect(rows).toHaveLength(1)
    expect(rows[0]?.album).toBe('My Album')
    expect(rows[0]?.artist).toBe('The Artist')
    expect(rows[0]?.title).toBe('First Track')
    expect(rows[0]?.filename).toBe('track01.flac')
  })

  it('respects the limit option', async () => {
    await createTempFile(tempDir, 'track01.flac')
    await createTempFile(tempDir, 'track02.flac')
    await createTempFile(tempDir, 'track03.flac')
    mockParseFile.mockResolvedValue(makeAudioMetadata())

    const program = makeProgram()
    await program.parseAsync([
      'node', 's', 'summarize-source-dir',
      '--dir-name', tempDir,
      '--limit', '1',
      '--format', 'json',
    ])

    const rawArg: unknown = infoSpy.mock.calls[0]?.[0]
    const rows = JSON.parse(String(rawArg)) as SummarizeSourceDirJsonOutput
    expect(rows).toHaveLength(1)
  })

  it('rejects when the directory does not exist', async () => {
    vi.spyOn(process.stderr, 'write').mockReturnValue(true)
    const program = makeProgram()
    await expect(
      program.parseAsync([
        'node', 's', 'summarize-source-dir',
        '--dir-name', `${tempDir}/nonexistent`,
      ]),
    ).rejects.toThrow()
  })
})
