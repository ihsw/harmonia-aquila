import { parseFile } from 'music-metadata'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { summarizeAlbumSourceDir } from '../../../src/lib/albums/summarize-source-dir.js'
import { createTempDir, createTempFile, makeAudioMetadata, removeTempDir } from '../../test-helpers.js'

vi.mock('music-metadata', () => ({
  parseFile: vi.fn(),
}))

describe('summarizeAlbumSourceDir', () => {
  let tempDir: string

  beforeEach(async () => {
    tempDir = await createTempDir('lib-summarize-')
    vi.mocked(parseFile).mockReset()
  })

  afterEach(async () => {
    await removeTempDir(tempDir)
    vi.restoreAllMocks()
  })

  it('returns metadata rows for supported audio files', async () => {
    await createTempFile(tempDir, 'track01.flac')
    vi.mocked(parseFile).mockResolvedValue(
      makeAudioMetadata({ album: 'Album', artist: 'Artist', title: 'Title' }),
    )

    const rows = await summarizeAlbumSourceDir({ dirName: tempDir })

    expect(rows).toMatchObject([{ album: 'Album', artist: 'Artist', filename: 'track01.flac', title: 'Title' }])
  })
})
