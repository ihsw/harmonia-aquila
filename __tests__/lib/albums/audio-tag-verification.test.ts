import { parseFile } from 'music-metadata'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { findUnpersistedTagFields, verifyTagFix } from '../../../src/lib/albums/audio-tag-verification.js'
import { type FormatOverrides, makeAudioMetadata } from '../../test-helpers.js'

vi.mock('music-metadata', () => ({ parseFile: vi.fn() }))

const id3v23: FormatOverrides = { tagTypes: ['ID3v2.3', 'ID3v1'] }
const vorbis: FormatOverrides = { tagTypes: ['vorbis'] }

describe('findUnpersistedTagFields', () => {
  it('accepts a read-back matching every requested field exactly', () => {
    const metadata = makeAudioMetadata({
      album: 'Album',
      albumartists: ['A', 'B'],
      artists: ['X'],
      disk: { no: 1, of: 2 },
      producer: ['P1'],
      title: 'Title',
      track: { no: 3, of: null },
    }, vorbis)

    expect(findUnpersistedTagFields(metadata, {
      album: 'Album',
      albumArtists: ['A', 'B'],
      artists: ['X'],
      discNumber: { kind: 'set', value: 1 },
      discTotal: { kind: 'set', value: 2 },
      producers: ['P1'],
      title: 'Title',
      trackNumber: 3,
    })).toEqual([])
  })

  it('accepts a slash-joined album-artist list on ID3v2.3', () => {
    const metadata = makeAudioMetadata({ albumartists: ['AmIEviL/Mazedude/The Fat Man'] }, id3v23)

    expect(findUnpersistedTagFields(metadata, {
      albumArtists: ['AmIEviL', 'Mazedude', 'The Fat Man'],
    })).toEqual([])
  })

  it('still rejects an album-artist list that genuinely did not persist', () => {
    const metadata = makeAudioMetadata({ albumartists: ['Somebody Else'] }, id3v23)

    expect(findUnpersistedTagFields(metadata, { albumArtists: ['A', 'B'] })).toEqual(['albumArtists'])
  })

  it('rejects the joined form when the container is not ID3v2.3', () => {
    const metadata = makeAudioMetadata({ albumartists: ['A/B'] }, vorbis)

    expect(findUnpersistedTagFields(metadata, { albumArtists: ['A', 'B'] })).toEqual(['albumArtists'])
  })

  it('requires exact equality for a single-entry request (FR-3a)', () => {
    const metadata = makeAudioMetadata({ albumartists: ['A/B'] }, id3v23)

    expect(findUnpersistedTagFields(metadata, { albumArtists: ['A'] })).toEqual(['albumArtists'])
  })

  it('applies the joined-list tolerance to artists as well (FR-3b)', () => {
    const metadata = makeAudioMetadata({ artists: ['X/Y'] }, id3v23)

    expect(findUnpersistedTagFields(metadata, { artists: ['X', 'Y'] })).toEqual([])
  })

  it('falls back to the singular albumartist when the list is absent', () => {
    const metadata = makeAudioMetadata({ albumartist: 'A/B' }, id3v23)

    expect(findUnpersistedTagFields(metadata, { albumArtists: ['A', 'B'] })).toEqual([])
  })

  it('accepts producers surfaced on common.producer', () => {
    const metadata = makeAudioMetadata({ producer: ['P1', 'P2'] }, vorbis)

    expect(findUnpersistedTagFields(metadata, { producers: ['P1', 'P2'] })).toEqual([])
  })

  it('reads producers from the ID3v2.3 involved-people frame', () => {
    const metadata = makeAudioMetadata({}, id3v23, {
      'ID3v2.3': [{ id: 'TPE2', value: 'A' }, { id: 'IPLS', value: { producer: ['P1', 'P2'] } }],
    })

    expect(findUnpersistedTagFields(metadata, { producers: ['P1', 'P2'] })).toEqual([])
  })

  it('reads producers from the ID3v2.4 involved-people frame', () => {
    const metadata = makeAudioMetadata({}, { tagTypes: ['ID3v2.4'] }, {
      'ID3v2.4': [{ id: 'TIPL', value: { producer: ['P1'] } }],
    })

    expect(findUnpersistedTagFields(metadata, { producers: ['P1'] })).toEqual([])
  })

  it('prefers common.producer over the involved-people frame', () => {
    const metadata = makeAudioMetadata({ producer: ['Correct'] }, id3v23, {
      'ID3v2.3': [{ id: 'IPLS', value: { producer: ['Stale'] } }],
    })

    expect(findUnpersistedTagFields(metadata, { producers: ['Correct'] })).toEqual([])
  })

  it('still rejects producers that genuinely did not persist', () => {
    const metadata = makeAudioMetadata({}, id3v23, {
      'ID3v2.3': [{ id: 'IPLS', value: { producer: ['P1'] } }],
    })

    expect(findUnpersistedTagFields(metadata, { producers: ['P1', 'P2'] })).toEqual(['producers'])
  })

  it.each([
    ['null', null],
    ['a string', 'not an object'],
    ['a non-string array', { producer: [1, 2] }],
    ['a missing producer entry', { arranger: ['A'] }],
  ])('falls through safely when the involved-people value is %s', (_label, value) => {
    const metadata = makeAudioMetadata({}, id3v23, { 'ID3v2.3': [{ id: 'IPLS', value }] })

    expect(findUnpersistedTagFields(metadata, { producers: ['P1'] })).toEqual(['producers'])
  })

  it.each([null, 0])('treats a cleared disc number as satisfied by %s', (value) => {
    const metadata = makeAudioMetadata({ disk: { no: value, of: value } }, id3v23)

    expect(findUnpersistedTagFields(metadata, {
      discNumber: { kind: 'clear' },
      discTotal: { kind: 'clear' },
    })).toEqual([])
  })

  it('rejects a cleared disc number that is still set', () => {
    const metadata = makeAudioMetadata({ disk: { no: 2, of: null } }, id3v23)

    expect(findUnpersistedTagFields(metadata, { discNumber: { kind: 'clear' } })).toEqual(['discNumber'])
  })

  it('names every failed field in requirements order', () => {
    const metadata = makeAudioMetadata({
      album: 'Wrong', title: 'Wrong', track: { no: 9, of: null },
    }, id3v23)

    expect(findUnpersistedTagFields(metadata, {
      album: 'Album', title: 'Title', trackNumber: 1,
    })).toEqual(['album', 'title', 'trackNumber'])
  })
})

describe('verifyTagFix', () => {
  beforeEach(() => {
    vi.mocked(parseFile).mockReset()
  })

  it('resolves without reading the file when the fix is empty', async () => {
    await expect(verifyTagFix('/does/not/matter.mp3', {})).resolves.toBeUndefined()
    expect(parseFile).not.toHaveBeenCalled()
  })

  it('resolves when the joined read-back is acceptable', async () => {
    vi.mocked(parseFile).mockResolvedValue(makeAudioMetadata({ albumartists: ['A/B'] }, id3v23))

    await expect(verifyTagFix('/track.mp3', { albumArtists: ['A', 'B'] })).resolves.toBeUndefined()
  })

  it('throws naming the failed field and the requested fix', async () => {
    vi.mocked(parseFile).mockResolvedValue(makeAudioMetadata({ albumartists: ['Nope'] }, id3v23))

    await expect(verifyTagFix('/track.mp3', { albumArtists: ['A', 'B'] }))
      .rejects.toThrow(/^Metadata was not persisted: albumArtists \(requested \{"albumArtists":\["A","B"\]\}\)$/)
  })
})
