import { parseFile } from 'music-metadata'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { validateAlbumSourceDir } from '../../../src/lib/albums/validate.js'
import { createTempDir, createTempFile, makeAudioMetadata, removeTempDir } from '../../test-helpers.js'

vi.mock('music-metadata', () => ({ parseFile: vi.fn() }))

describe('validateAlbumSourceDir disc metadata', () => {
  let tempDir: string

  beforeEach(async () => {
    tempDir = await createTempDir('lib-validate-disc-')
    vi.mocked(parseFile).mockReset()
    await createTempFile(tempDir, 'disc1.flac')
    await createTempFile(tempDir, 'disc2.flac')
  })

  afterEach(async () => {
    await removeTempDir(tempDir)
    vi.restoreAllMocks()
  })

  it('validates a multi-disc album and creates disc destinations', async () => {
    vi.mocked(parseFile)
      .mockResolvedValueOnce(makeAudioMetadata({
        album: 'Album',
        artist: 'Artist',
        disk: { no: 1, of: 2 },
        title: 'First',
        track: { no: 1, of: null },
      }))
      .mockResolvedValueOnce(makeAudioMetadata({
        album: 'Album',
        artist: 'Artist',
        disk: { no: 2, of: 2 },
        title: 'Second',
        track: { no: 1, of: null },
      }))

    const rows = await validateAlbumSourceDir({ dirName: tempDir })

    expect(rows.map(row => ({
      destination: row.destination,
      discNumber: row.discNumber,
      discTotal: row.discTotal,
      status: row.status,
    }))).toEqual([
      { destination: 'Artist/Album/Disc 01/01 - First.flac', discNumber: '01', discTotal: '02', status: 'valid' },
      { destination: 'Artist/Album/Disc 02/01 - Second.flac', discNumber: '02', discTotal: '02', status: 'valid' },
    ])
  })
})
