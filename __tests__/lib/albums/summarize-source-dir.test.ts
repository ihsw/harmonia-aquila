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
      makeAudioMetadata({ album: 'Album', artist: 'Artist', disk: { no: 2, of: 3 }, title: 'Title' }),
    )

    const rows = await summarizeAlbumSourceDir({ dirName: tempDir })

    expect(rows).toMatchObject([{
      album: 'Album',
      artist: 'Artist',
      discNumber: '02',
      discTotal: '03',
      filename: 'track01.flac',
      title: 'Title',
    }])
  })

  it('reports bit depth for a lossless row', async () => {
    await createTempFile(tempDir, 'track01.flac')
    vi.mocked(parseFile).mockResolvedValue(
      makeAudioMetadata({}, { bitsPerSample: 24, sampleRate: 48_000 }),
    )

    const rows = await summarizeAlbumSourceDir({ dirName: tempDir })

    expect(rows).toMatchObject([{
      bitDepth: '24-bit',
      filename: 'track01.flac',
      sampleRate: '48 kHz',
    }])
  })

  it('reports empty bit depth for a lossy row while bitrate and sampleRate stay populated', async () => {
    await createTempFile(tempDir, 'track01.mp3')
    vi.mocked(parseFile).mockResolvedValue(
      makeAudioMetadata({}, { bitrate: 320_000, sampleRate: 44_100 }),
    )

    const rows = await summarizeAlbumSourceDir({ dirName: tempDir })

    expect(rows).toMatchObject([{
      bitDepth: '',
      bitrate: '320 kbps',
      filename: 'track01.mp3',
      sampleRate: '44.1 kHz',
    }])
  })

  it('reports populated and empty bit depth side by side for a mixed directory', async () => {
    await createTempFile(tempDir, 'track01.flac')
    await createTempFile(tempDir, 'track02.mp3')
    vi.mocked(parseFile).mockImplementation((filePath) => {
      if (filePath.endsWith('.flac')) {
        return Promise.resolve(makeAudioMetadata({}, { bitsPerSample: 16, sampleRate: 44_100 }))
      }

      return Promise.resolve(makeAudioMetadata({}, { bitrate: 320_000, sampleRate: 44_100 }))
    })

    const rows = await summarizeAlbumSourceDir({ dirName: tempDir })

    expect(rows).toHaveLength(2)
    expect(rows.find(row => row.filename === 'track01.flac')?.bitDepth).toBe('16-bit')
    expect(rows.find(row => row.filename === 'track02.mp3')?.bitDepth).toBe('')
  })
})
