import { Command } from 'commander'
import { parseFile } from 'music-metadata'
import { mkdir } from 'node:fs/promises'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, type Mock, vi } from 'vitest'

import { type CrawlAudiobookJsonOutput, registerCrawlAudiobooksCommand } from '../../../src/commands/manage-audiobooks/crawl.js'
import { createTempDir, createTempFile, makeAudioMetadata, removeTempDir } from '../../test-helpers.js'

vi.mock('music-metadata', () => ({
  parseFile: vi.fn(),
}))

const mockParseFile = vi.mocked(parseFile)

function makeProgram(): Command {
  const program = new Command()
  registerCrawlAudiobooksCommand(program)
  return program
}

describe('crawl', () => {
  let rootDir: string
  let infoSpy: Mock

  beforeEach(async () => {
    rootDir = await createTempDir('crawl-')
    infoSpy = vi.spyOn(console, 'info').mockImplementation(() => undefined)
    vi.spyOn(console, 'table').mockImplementation(() => undefined)
    vi.spyOn(process.stderr, 'write').mockReturnValue(true)
    mockParseFile.mockReset()
  })

  afterEach(async () => {
    await removeTempDir(rootDir)
    vi.restoreAllMocks()
  })

  it('categorizes a valid M4B file as valid', async () => {
    await createTempFile(rootDir, 'Jane Doe - Good Book.m4b')
    mockParseFile.mockResolvedValue(
      makeAudioMetadata({ album: 'Good Book', artist: 'Jane Doe' }),
    )

    await makeProgram().parseAsync([
      'node', 's', 'crawl',
      '--dir-name', rootDir,
      '--format', 'json',
    ])

    const rawArg: unknown = infoSpy.mock.calls[0]?.[0]
    const rows = JSON.parse(String(rawArg)) as CrawlAudiobookJsonOutput
    expect(rows).toHaveLength(1)
    expect(rows[0]?.category).toBe('valid')
    expect(rows[0]?.reasonCode).toBe('valid')
  })

  it('categorizes a filename-mismatch M4B as invalid-filename', async () => {
    await createTempFile(rootDir, 'wrong-name.m4b')
    mockParseFile.mockResolvedValue(
      makeAudioMetadata({ album: 'Real Book', artist: 'Real Author' }),
    )

    await makeProgram().parseAsync([
      'node', 's', 'crawl',
      '--dir-name', rootDir,
      '--format', 'json',
    ])

    const rawArg: unknown = infoSpy.mock.calls[0]?.[0]
    const rows = JSON.parse(String(rawArg)) as CrawlAudiobookJsonOutput
    expect(rows).toHaveLength(1)
    expect(rows[0]?.category).toBe('invalid-filename')
    expect(rows[0]?.reasonCode).toBe('filename-mismatch')
    expect(rows[0]?.expectedFilename).toBe('Real Author - Real Book.m4b')
  })

  it('categorizes a missing-metadata M4B as invalid-other', async () => {
    await createTempFile(rootDir, 'no-meta.m4b')
    mockParseFile.mockResolvedValue(makeAudioMetadata())

    await makeProgram().parseAsync([
      'node', 's', 'crawl',
      '--dir-name', rootDir,
      '--format', 'json',
    ])

    const rawArg: unknown = infoSpy.mock.calls[0]?.[0]
    const rows = JSON.parse(String(rawArg)) as CrawlAudiobookJsonOutput
    expect(rows).toHaveLength(1)
    expect(rows[0]?.category).toBe('invalid-other')
    expect(rows[0]?.reasonCode).toBe('missing-metadata')
  })

  it('categorizes metadata read failures as validation-failed', async () => {
    await createTempFile(rootDir, 'broken.m4b')
    mockParseFile.mockRejectedValue(new Error('cannot read metadata'))

    await makeProgram().parseAsync([
      'node', 's', 'crawl',
      '--dir-name', rootDir,
      '--format', 'json',
    ])

    const rawArg: unknown = infoSpy.mock.calls[0]?.[0]
    const rows = JSON.parse(String(rawArg)) as CrawlAudiobookJsonOutput
    expect(rows).toHaveLength(1)
    expect(rows[0]?.category).toBe('invalid-other')
    expect(rows[0]?.reasonCode).toBe('validation-failed')
    expect(rows[0]?.reason).toBe('cannot read metadata')
  })

  it('recursively discovers M4B files in subdirectories', async () => {
    const subDir = join(rootDir, 'sub')
    await mkdir(subDir)
    await createTempFile(subDir, 'Author - Title.m4b')
    mockParseFile.mockResolvedValue(
      makeAudioMetadata({ album: 'Title', artist: 'Author' }),
    )

    await makeProgram().parseAsync([
      'node', 's', 'crawl',
      '--dir-name', rootDir,
      '--format', 'json',
    ])

    const rawArg: unknown = infoSpy.mock.calls[0]?.[0]
    const rows = JSON.parse(String(rawArg)) as CrawlAudiobookJsonOutput
    expect(rows).toHaveLength(1)
    expect(rows[0]?.category).toBe('valid')
    expect(rows[0]?.path).toBe('sub/Author - Title.m4b')
  })
})
