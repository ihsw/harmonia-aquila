import { parseFile } from 'music-metadata'
import { readdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { writeAudioTagFix } from '../../../src/lib/albums/audio-tags.js'
import { organizeAlbumFiles } from '../../../src/lib/albums/organize-files.js'
import { createTempDir, createTempFile, makeAudioMetadata, removeTempDir } from '../../test-helpers.js'

vi.mock('music-metadata', () => ({ parseFile: vi.fn() }))
vi.mock('../../../src/lib/albums/audio-tags.js', () => ({ writeAudioTagFix: vi.fn() }))

describe('organize-files set-metadata input sources', () => {
  let destDir: string
  let manifestDir: string
  let sourceDir: string

  beforeEach(async () => {
    destDir = await createTempDir('organize-inline-dst-')
    manifestDir = await createTempDir('organize-inline-manifest-')
    sourceDir = await createTempDir('organize-inline-src-')
    vi.mocked(parseFile).mockReset()
    vi.mocked(writeAudioTagFix).mockReset()
  })

  afterEach(async () => {
    await Promise.all([destDir, manifestDir, sourceDir].map(removeTempDir))
    vi.restoreAllMocks()
  })

  it('produces the same dry-run plan from file and inline records', async () => {
    await createTempFile(sourceDir, 'one.flac')
    await createTempFile(sourceDir, 'two.flac')
    const records = [
      { album: 'New', artist: 'Artist', filename: 'one.flac', title: 'One', trackNumber: 1 },
      { album: 'New', artist: 'Artist', filename: 'two.flac', title: 'Two', trackNumber: 2 },
    ]
    const metadataPath = await createTempFile(manifestDir, 'metadata.json', JSON.stringify(records))
    vi.mocked(parseFile).mockResolvedValue(makeAudioMetadata({
      album: 'Old', artist: 'Artist', title: 'Old', track: { no: null, of: null },
    }))

    const filePlan = await organizeAlbumFiles({ destDir, setMetadata: metadataPath, sourceDir })
    const inlinePlan = await organizeAlbumFiles({ destDir, setMetadataRecords: records, sourceDir })

    expect(inlinePlan).toEqual(filePlan)
    expect(inlinePlan.map(row => row.destination)).toEqual([
      'Artist/New/01 - One.flac',
      'Artist/New/02 - Two.flac',
    ])
    expect(await readdir(destDir)).toEqual([])
  })

  it('rejects invalid record sources before writes', async () => {
    await createTempFile(sourceDir, 'one.flac')
    vi.mocked(parseFile).mockResolvedValue(makeAudioMetadata({
      album: 'Old', artist: 'Artist', title: 'Old', track: { no: 1, of: null },
    }))
    const validRecord = {
      album: 'New', artist: 'Artist', filename: 'one.flac', title: 'One', trackNumber: 1,
    }

    await expect(organizeAlbumFiles({
      destDir, setMetadataRecords: [], sourceDir,
    })).rejects.toThrow('Inline metadata does not contain any records')
    await expect(organizeAlbumFiles({
      destDir,
      setMetadata: 'metadata.json',
      setMetadataRecords: [validRecord],
      sourceDir,
    })).rejects.toThrow('conflicts with inline setMetadata records')
    await expect(organizeAlbumFiles({
      destDir,
      setMetadataRecords: [{ ...validRecord, filename: '../one.flac' }],
      sourceDir,
    })).rejects.toThrow('must be a bare file name')
    expect(await readdir(destDir)).toEqual([])
  })

  it('executes file and inline records with equivalent repaired output', async () => {
    const secondDestDir = await createTempDir('organize-inline-second-dst-')
    try {
      const sourcePath = await createTempFile(sourceDir, 'one.flac', 'source')
      const records = [
        { album: 'New', artist: 'Artist', filename: 'one.flac', title: 'One', trackNumber: 1 },
      ]
      const metadataPath = await createTempFile(manifestDir, 'metadata.json', JSON.stringify(records))
      const original = makeAudioMetadata({
        album: 'Old', artist: 'Artist', title: 'Old', track: { no: 9, of: null },
      })
      const repaired = makeAudioMetadata({
        album: 'New', artist: 'Artist', title: 'One', track: { no: 1, of: null },
      })
      vi.mocked(parseFile)
        .mockResolvedValueOnce(original).mockResolvedValueOnce(repaired)
        .mockResolvedValueOnce(original).mockResolvedValueOnce(repaired)

      const fileRows = await organizeAlbumFiles({ destDir, execute: true, setMetadata: metadataPath, sourceDir })
      const inlineRows = await organizeAlbumFiles({
        destDir: secondDestDir, execute: true, setMetadataRecords: records, sourceDir,
      })

      expect(inlineRows).toEqual(fileRows)
      expect(vi.mocked(writeAudioTagFix).mock.calls.map(call => call[1])).toEqual([
        { album: 'New', artists: ['Artist'], title: 'One', trackNumber: 1 },
        { album: 'New', artists: ['Artist'], title: 'One', trackNumber: 1 },
      ])
      expect(await readFile(sourcePath, 'utf8')).toBe('source')
      expect(await readFile(join(secondDestDir, 'Artist/New/01 - One.flac'), 'utf8')).toBe('source')
    }
    finally {
      await removeTempDir(secondDestDir)
    }
  })
})
