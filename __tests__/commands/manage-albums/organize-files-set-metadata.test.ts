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
})
