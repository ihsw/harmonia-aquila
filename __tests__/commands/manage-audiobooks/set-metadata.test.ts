import { Command } from 'commander'
import { parseFile } from 'music-metadata'
import { File as TaglibFile } from 'node-taglib-sharp'
import { afterEach, beforeEach, describe, expect, it, type Mock, vi } from 'vitest'

import { registerSetAudiobookMetadataCommand } from '../../../src/commands/manage-audiobooks/set-metadata.js'
import { createTempDir, createTempFile, removeTempDir } from '../../test-helpers.js'

vi.mock('music-metadata', () => ({
  parseFile: vi.fn(),
}))

vi.mock('node-taglib-sharp', () => {
  const fakeTag = {
    album: '',
    composers: [] as string[],
    performers: [] as string[],
  }
  const fakeFile = {
    dispose: vi.fn(),
    save: vi.fn(),
    tag: fakeTag,
  }
  return {
    File: {
      createFromPath: vi.fn().mockReturnValue(fakeFile),
    },
  }
})

const mockParseFile = vi.mocked(parseFile)
const mockCreateFromPath = vi.mocked(TaglibFile.createFromPath)

function makeProgram(): Command {
  const program = new Command()
  registerSetAudiobookMetadataCommand(program)
  return program
}

describe('set-metadata (audiobook)', () => {
  let sourceDir: string
  let destDir: string
  let infoSpy: Mock

  beforeEach(async () => {
    sourceDir = await createTempDir('set-meta-src-')
    destDir = await createTempDir('set-meta-dst-')
    infoSpy = vi.spyOn(console, 'info').mockImplementation(() => undefined)
    vi.spyOn(console, 'table').mockImplementation(() => undefined)
    vi.spyOn(process.stderr, 'write').mockReturnValue(true)
    mockParseFile.mockReset()
    mockCreateFromPath.mockReset()
  })

  afterEach(async () => {
    await removeTempDir(sourceDir)
    await removeTempDir(destDir)
    vi.restoreAllMocks()
  })

  it('plans a dry-run metadata write and outputs a would-set-metadata row', async () => {
    const sourceFile = await createTempFile(sourceDir, 'source.m4b')
    const destPath = `${destDir}/dest.m4b`

    await makeProgram().parseAsync([
      'node', 's', 'set-metadata',
      '--source-filepath', sourceFile,
      '--dest-filepath', destPath,
      '--title', 'Great Book',
      '--author', 'Famous Author',
      '--format', 'json',
    ])

    const rawArg: unknown = infoSpy.mock.calls[0]?.[0]
    const rows = JSON.parse(String(rawArg)) as Array<{ action: string, author: string, title: string }>
    expect(rows).toHaveLength(1)
    expect(rows[0]?.action).toBe('would set metadata')
    expect(rows[0]?.author).toBe('Famous Author')
    expect(rows[0]?.title).toBe('Great Book')
  })

  it('does not invoke File.createFromPath during a dry run', async () => {
    const sourceFile = await createTempFile(sourceDir, 'source.m4b')
    const destPath = `${destDir}/dest.m4b`

    await makeProgram().parseAsync([
      'node', 's', 'set-metadata',
      '--source-filepath', sourceFile,
      '--dest-filepath', destPath,
      '--title', 'Book',
      '--author', 'Author',
    ])

    expect(mockCreateFromPath).not.toHaveBeenCalled()
  })

  it('errors when source and destination are the same path', async () => {
    const filePath = await createTempFile(sourceDir, 'same.m4b')

    vi.spyOn(process, 'exit').mockImplementation((): never => {
      throw new Error('exit')
    })

    await expect(
      makeProgram().parseAsync([
        'node', 's', 'set-metadata',
        '--source-filepath', filePath,
        '--dest-filepath', filePath,
        '--title', 'Book',
        '--author', 'Author',
      ]),
    ).rejects.toThrow()
  })

  it('errors when destination extension is not .m4b', async () => {
    const sourceFile = await createTempFile(sourceDir, 'source.m4b')
    const destPath = `${destDir}/dest.mp3`

    vi.spyOn(process, 'exit').mockImplementation((): never => {
      throw new Error('exit')
    })

    await expect(
      makeProgram().parseAsync([
        'node', 's', 'set-metadata',
        '--source-filepath', sourceFile,
        '--dest-filepath', destPath,
        '--title', 'Book',
        '--author', 'Author',
      ]),
    ).rejects.toThrow()
  })

  it('errors when destination file already exists', async () => {
    const sourceFile = await createTempFile(sourceDir, 'source.m4b')
    const destFile = await createTempFile(destDir, 'dest.m4b')

    vi.spyOn(process, 'exit').mockImplementation((): never => {
      throw new Error('exit')
    })

    await expect(
      makeProgram().parseAsync([
        'node', 's', 'set-metadata',
        '--source-filepath', sourceFile,
        '--dest-filepath', destFile,
        '--title', 'Book',
        '--author', 'Author',
      ]),
    ).rejects.toThrow()
  })
})
