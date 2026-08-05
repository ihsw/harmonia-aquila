import { parseFile } from 'music-metadata'
import { readdir } from 'node:fs/promises'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { assertUniqueOrganizationDestinations } from '../../../src/lib/albums/organize-files-execution.js'
import type { PlannedOrganizationCopy } from '../../../src/lib/albums/organize-files-types.js'
import { organizeAlbumFiles } from '../../../src/lib/albums/organize-files.js'
import { createTempDir, createTempFile, makeAudioMetadata, removeTempDir } from '../../test-helpers.js'

vi.mock('music-metadata', () => ({ parseFile: vi.fn() }))

describe('organize-files optional disc metadata policy', () => {
  let destDir: string
  let sourceDir: string

  beforeEach(async () => {
    sourceDir = await createTempDir('organize-disc-policy-src-')
    destDir = await createTempDir('organize-disc-policy-dst-')
    vi.mocked(parseFile).mockReset()
  })

  afterEach(async () => {
    await removeTempDir(sourceDir)
    await removeTempDir(destDir)
    vi.restoreAllMocks()
  })

  it('rejects repeated tracks by default and infers only when requested', async () => {
    await createTracks('01.flac', '02.flac')
    await createTempFile(sourceDir, 'cover.jpg')
    vi.mocked(parseFile)
      .mockResolvedValueOnce(metadata('First', 1))
      .mockResolvedValueOnce(metadata('Second', 1))

    await expect(organizeAlbumFiles({ destDir, sourceDir })).rejects.toThrow(
      /Duplicate track numbers were detected:\n {2}Track 1: 01\.flac, 02\.flac[\s\S]*setMetadata[\s\S]*discStrategy "infer"[\s\S]*No files were written/,
    )
    expect(await readdir(destDir)).toEqual([])

    vi.mocked(parseFile).mockReset()
      .mockResolvedValueOnce(metadata('First', 1))
      .mockResolvedValueOnce(metadata('Second', 1))
    const planned = await organizeAlbumFiles({ destDir, discStrategy: 'infer', sourceDir })
    const rows = planned.filter(row => row.fileType === 'audio')

    expect(rows.map(row => [row.destination, row.tagChanges.newDiscNumber])).toEqual([
      ['Artist/Album/101 - First.flac', 1],
      ['Artist/Album/201 - Second.flac', 2],
    ])
    expect(planned.at(-1)).toMatchObject({ destination: 'Artist/Album/cover.jpg', fileType: 'albumArt' })
    expect(await readdir(destDir)).toEqual([])
  })

  it('keeps unique tracks flat and album art at the album root', async () => {
    await createTracks('01.flac', '02.flac')
    await createTempFile(sourceDir, 'cover.jpg')
    vi.mocked(parseFile)
      .mockResolvedValueOnce(metadata('First', 1))
      .mockResolvedValueOnce(metadata('Second', 2))

    const rows = await organizeAlbumFiles({ destDir, sourceDir })

    expect(rows.map(row => [row.fileType, row.destination])).toEqual([
      ['audio', 'Artist/Album/01 - First.flac'],
      ['audio', 'Artist/Album/02 - Second.flac'],
      ['albumArt', 'Artist/Album/cover.jpg'],
    ])
  })

  it('rejects an orphan total and applies limit before validation', async () => {
    await createTracks('01.flac', '02.flac')
    vi.mocked(parseFile).mockResolvedValueOnce(metadata('First', 1, { no: null, of: 2 }))

    await expect(organizeAlbumFiles({ destDir, limit: '1', sourceDir })).rejects.toThrow('missing disc number')

    vi.mocked(parseFile).mockReset().mockResolvedValueOnce(metadata('First', 1))
    const rows = await organizeAlbumFiles({ destDir, limit: '1', sourceDir })
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({ destination: 'Artist/Album/01 - First.flac', discNumber: '', discTotal: '' })
  })

  it('filters trackless audio before disc-set validation', async () => {
    await createTracks('01.flac', '02.flac')
    vi.mocked(parseFile)
      .mockResolvedValueOnce(metadata('First', 1, { no: 1, of: null }))
      .mockResolvedValueOnce(metadata('Trackless', null))

    const rows = await organizeAlbumFiles({ destDir, ignoreAudioFilesWithoutTracks: true, sourceDir })

    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({ discNumber: '01', filename: '01.flac' })
  })

  it('retains combined-plan duplicate destination preflight', () => {
    const plan = plannedArt('cover.jpg')

    expect(() => {
      assertUniqueOrganizationDestinations([plan, plannedArt('other.jpg')], destDir)
    })
      .toThrow('Multiple files resolve to the same destination')
  })

  async function createTracks(...filenames: string[]): Promise<void> {
    await Promise.all(filenames.map(filename => createTempFile(sourceDir, filename)))
  }

  function metadata(title: string, track: number | null, disk = { no: null, of: null }) {
    return makeAudioMetadata({ album: 'Album', artist: 'Artist', disk, title, track: { no: track, of: null } })
  }

  function plannedArt(filename: string): PlannedOrganizationCopy {
    return {
      albumDestinationPath: `${destDir}/Artist/Album`, destinationExists: false,
      destinationPath: `${destDir}/Artist/Album/cover.jpg`, destinationStrategy: 'error',
      row: { action: 'would copy', destination: 'Artist/Album/cover.jpg', fileType: 'albumArt', filename },
      sourcePath: `${sourceDir}/${filename}`,
    }
  }
})
