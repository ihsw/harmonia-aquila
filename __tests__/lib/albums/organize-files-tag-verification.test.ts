import { parseFile } from 'music-metadata'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { writeAudioTagFix } from '../../../src/lib/albums/audio-tags.js'
import { organizeAlbumFiles } from '../../../src/lib/albums/organize-files.js'
import { createTempDir, createTempFile, makeAudioMetadata, removeTempDir } from '../../test-helpers.js'

vi.mock('music-metadata', () => ({ parseFile: vi.fn() }))
vi.mock('../../../src/lib/albums/audio-tags.js', () => ({ writeAudioTagFix: vi.fn() }))

function sourceTrack(artist: string, trackNumber: number) {
  return makeAudioMetadata({
    album: 'Album', artist, grouping: 'Group', title: `Title ${String(trackNumber)}`, track: { no: trackNumber, of: null },
  })
}

function readBack(artist: string, trackNumber: number, albumartists: string[]) {
  return makeAudioMetadata({
    album: 'Album',
    albumartists,
    artist,
    grouping: 'Group',
    title: `Title ${String(trackNumber)}`,
    track: { no: trackNumber, of: null },
  }, { tagTypes: ['ID3v2.3', 'ID3v1'] })
}

describe('organize-files tag verification', () => {
  let destDir: string
  let sourceDir: string

  beforeEach(async () => {
    sourceDir = await createTempDir('organize-verify-src-')
    destDir = await createTempDir('organize-verify-dst-')
    vi.mocked(parseFile).mockReset()
    vi.mocked(writeAudioTagFix).mockReset()
  })

  afterEach(async () => {
    await removeTempDir(sourceDir)
    await removeTempDir(destDir)
    vi.restoreAllMocks()
  })

  it('publishes when ID3v2.3 stores an aggregated album-artist list slash-joined', async () => {
    await createTempFile(sourceDir, 'track01.mp3', 'one')
    await createTempFile(sourceDir, 'track02.mp3', 'two')
    vi.mocked(parseFile)
      .mockResolvedValueOnce(sourceTrack('Artist A', 1))
      .mockResolvedValueOnce(sourceTrack('Artist B', 2))
      .mockResolvedValueOnce(readBack('Artist A', 1, ['Artist A/Artist B']))
      .mockResolvedValueOnce(readBack('Artist B', 2, ['Artist A/Artist B']))

    const rows = await organizeAlbumFiles({
      albumArtistsStrategy: 'aggregate', artistFilenameStrategy: 'albumartist', destDir, execute: true, sourceDir,
    })

    expect(rows.map(row => row.action)).toEqual(['copied', 'copied'])
    expect(vi.mocked(writeAudioTagFix).mock.calls.map(call => call[1])).toEqual([
      { albumArtists: ['Artist A', 'Artist B'] },
      { albumArtists: ['Artist A', 'Artist B'] },
    ])
  })

  it('still refuses to publish when the album-artist list genuinely did not persist', async () => {
    await createTempFile(sourceDir, 'track01.mp3', 'one')
    await createTempFile(sourceDir, 'track02.mp3', 'two')
    vi.mocked(parseFile)
      .mockResolvedValueOnce(sourceTrack('Artist A', 1))
      .mockResolvedValueOnce(sourceTrack('Artist B', 2))
      .mockResolvedValueOnce(readBack('Artist A', 1, ['Something Else']))

    await expect(organizeAlbumFiles({
      albumArtistsStrategy: 'aggregate', artistFilenameStrategy: 'albumartist', destDir, execute: true, sourceDir,
    })).rejects.toThrow('Failed to repair and organize')
  })
})
