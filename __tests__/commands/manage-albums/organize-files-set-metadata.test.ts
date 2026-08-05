import { Command } from 'commander'
import { parseFile } from 'music-metadata'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { registerOrganizeFilesCommand } from '../../../src/commands/manage-albums/organize-files.js'
import { writeAudioTagFix } from '../../../src/lib/albums/audio-tags.js'
import { createTempDir, createTempFile, makeAudioMetadata, removeTempDir } from '../../test-helpers.js'

vi.mock('music-metadata', () => ({ parseFile: vi.fn() }))
vi.mock('../../../src/lib/albums/audio-tags.js', () => ({ writeAudioTagFix: vi.fn() }))

describe('organize-files CLI set-metadata filepath', () => {
  let destDir: string
  let sourceDir: string

  beforeEach(async () => {
    destDir = await createTempDir('organize-cli-metadata-dst-')
    sourceDir = await createTempDir('organize-cli-metadata-src-')
    vi.mocked(parseFile).mockReset()
    vi.mocked(writeAudioTagFix).mockReset()
    vi.spyOn(console, 'info').mockImplementation(() => undefined)
  })

  afterEach(async () => {
    await Promise.all([removeTempDir(destDir), removeTempDir(sourceDir)])
    vi.restoreAllMocks()
  })

  it.each([
    ['metadata.json', JSON.stringify([
      { album: 'New', artist: 'Artist', filename: 'one.flac', title: 'One', trackNumber: 1 },
    ])],
    ['metadata.csv', 'filename,artist,album,trackNumber,title\none.flac,Artist,New,1,One\n'],
  ])('retains %s filepath execution', async (manifestName, manifestContents) => {
    const sourcePath = await createTempFile(sourceDir, 'one.flac', 'source')
    const manifestPath = await createTempFile(destDir, manifestName, manifestContents)
    const original = makeAudioMetadata({
      album: 'Old', artist: 'Artist', title: 'Old', track: { no: 9, of: null },
    })
    const repaired = makeAudioMetadata({
      album: 'New', artist: 'Artist', title: 'One', track: { no: 1, of: null },
    })
    vi.mocked(parseFile).mockResolvedValueOnce(original).mockResolvedValueOnce(repaired)
    const program = new Command()
    registerOrganizeFilesCommand(program)

    await program.parseAsync([
      'node', 'test', 'organize-files',
      '--source-dir', sourceDir,
      '--dest-dir', destDir,
      '--set-metadata', manifestPath,
      '--execute',
    ])

    expect(await readFile(sourcePath, 'utf8')).toBe('source')
    expect(await readFile(join(destDir, 'Artist/New/01 - One.flac'), 'utf8')).toBe('source')
    expect(writeAudioTagFix).toHaveBeenCalledWith(expect.any(String), {
      album: 'New', artists: ['Artist'], title: 'One', trackNumber: 1,
    })
  })

  it.each([
    ['metadata.json', JSON.stringify([
      { album: 'New', artist: 'Artist', filename: 'track.flac', sourceIndex: 1, title: 'First', trackNumber: 4 },
      { album: 'New', artist: 'Artist', filename: 'track.flac', sourceIndex: 2, title: 'Second', trackNumber: 4 },
    ])],
    [
      'metadata.csv',
      'filename,artist,album,trackNumber,title,sourceIndex\n'
      + 'track.flac,Artist,New,4,First,1\ntrack.flac,Artist,New,4,Second,2\n',
    ],
  ])('disambiguates a repeated filename across --source-dirs from %s', async (manifestName, manifestContents) => {
    const firstDir = await createTempDir('organize-cli-metadata-first-')
    const secondDir = await createTempDir('organize-cli-metadata-second-')

    try {
      await Promise.all([createTempFile(firstDir, 'track.flac'), createTempFile(secondDir, 'track.flac')])
      const manifestPath = await createTempFile(destDir, manifestName, manifestContents)
      vi.mocked(parseFile).mockResolvedValue(makeAudioMetadata())
      const program = new Command()
      registerOrganizeFilesCommand(program)

      await program.parseAsync([
        'node', 'test', 'organize-files',
        '--source-dirs', firstDir, secondDir,
        '--dest-dir', destDir,
        '--disc-strategy', 'concatenate',
        '--set-metadata', manifestPath,
        '--format', 'json',
      ])

      const output = vi.mocked(console.info).mock.calls.map(([value]) => String(value)).join('\n')

      expect(output).toContain('Artist/New/104 - First.flac')
      expect(output).toContain('Artist/New/204 - Second.flac')
    }
    finally {
      await Promise.all([removeTempDir(firstDir), removeTempDir(secondDir)])
    }
  })

  it('treats a blank CSV sourceIndex column as absent for unambiguous rows', async () => {
    const firstDir = await createTempDir('organize-cli-metadata-blank-first-')
    const secondDir = await createTempDir('organize-cli-metadata-blank-second-')

    try {
      await Promise.all([
        createTempFile(firstDir, 'track.flac'),
        createTempFile(firstDir, 'solo.flac'),
        createTempFile(secondDir, 'track.flac'),
      ])
      const manifestPath = await createTempFile(
        destDir,
        'metadata.csv',
        'filename,artist,album,trackNumber,title,sourceIndex\n'
        + 'track.flac,Artist,New,1,First,1\ntrack.flac,Artist,New,1,Second,2\nsolo.flac,Artist,New,2,Solo,\n',
      )
      vi.mocked(parseFile).mockResolvedValue(makeAudioMetadata())
      const program = new Command()
      registerOrganizeFilesCommand(program)

      await program.parseAsync([
        'node', 'test', 'organize-files',
        '--source-dirs', firstDir, secondDir,
        '--dest-dir', destDir,
        '--disc-strategy', 'concatenate',
        '--set-metadata', manifestPath,
        '--format', 'json',
      ])

      const output = vi.mocked(console.info).mock.calls.map(([value]) => String(value)).join('\n')

      expect(output).toContain('Artist/New/101 - First.flac')
      expect(output).toContain('Artist/New/102 - Solo.flac')
      expect(output).toContain('Artist/New/201 - Second.flac')
    }
    finally {
      await Promise.all([removeTempDir(firstDir), removeTempDir(secondDir)])
    }
  })
})
