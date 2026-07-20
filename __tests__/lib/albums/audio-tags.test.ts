/* eslint-disable max-classes-per-file -- Mocked taglib classes must support instanceof checks. */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { writeAudioTagFix } from '../../../src/lib/albums/audio-tags.js'

interface MockAudioFile {
  dispose: ReturnType<typeof vi.fn>
  getTag: ReturnType<typeof vi.fn>
  save: ReturnType<typeof vi.fn>
  tag: {
    album?: string
    albumArtists?: string[]
    performers?: string[]
    title?: string
    track?: number
  }
}

const {
  MockId3v2Tag,
  MockXiphComment,
  mockCreateFromPath,
} = vi.hoisted(() => {
  class HoistedMockId3v2Tag {
    public readonly getFramesByIdentifier = vi.fn(() => [{ text: ['engineer', 'Existing Engineer', 'producer', 'Old Producer'] }])
    public readonly setTextFrame = vi.fn()
  }

  class HoistedMockXiphComment {
    public readonly setFieldAsStrings = vi.fn()
  }

  return {
    MockId3v2Tag: HoistedMockId3v2Tag,
    MockXiphComment: HoistedMockXiphComment,
    mockCreateFromPath: vi.fn<() => MockAudioFile>(),
  }
})

vi.mock('node-taglib-sharp', () => ({
  File: {
    createFromPath: mockCreateFromPath,
  },
  Id3v2FrameClassType: {
    TextInformationFrame: 'TextInformationFrame',
  },
  Id3v2FrameIdentifiers: {
    TIPL: 'TIPL',
  },
  Id3v2Tag: MockId3v2Tag,
  TagTypes: {
    Id3v2: 'Id3v2',
    Xiph: 'Xiph',
  },
  XiphComment: MockXiphComment,
}))

function makeAudioFile(tag = {}): MockAudioFile {
  return {
    dispose: vi.fn(),
    getTag: vi.fn(),
    save: vi.fn(),
    tag,
  }
}

describe('writeAudioTagFix', () => {
  beforeEach(() => {
    mockCreateFromPath.mockReset()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('writes common tag fields and disposes the audio file', () => {
    const audioFile = makeAudioFile()
    mockCreateFromPath.mockReturnValue(audioFile)

    writeAudioTagFix('/music/track.mp3', {
      album: 'Album',
      albumArtists: ['Album Artist'],
      artists: ['Artist'],
      title: 'Title',
      trackNumber: 3,
    })

    expect(audioFile.tag).toEqual({
      album: 'Album',
      albumArtists: ['Album Artist'],
      performers: ['Artist'],
      title: 'Title',
      track: 3,
    })
    expect(audioFile.save).toHaveBeenCalledOnce()
    expect(audioFile.dispose).toHaveBeenCalledOnce()
  })

  it('replaces MP3 producer frames while preserving other involved people', () => {
    const id3v2Tag = new MockId3v2Tag()
    const audioFile = makeAudioFile()
    audioFile.getTag.mockReturnValue(id3v2Tag)
    mockCreateFromPath.mockReturnValue(audioFile)

    writeAudioTagFix('/music/track.mp3', { producers: ['New Producer'] })

    expect(audioFile.getTag).toHaveBeenCalledWith('Id3v2', true)
    expect(id3v2Tag.setTextFrame).toHaveBeenCalledWith(
      'TIPL',
      'engineer',
      'Existing Engineer',
      'producer',
      'New Producer',
    )
  })

  it('writes FLAC producers to the Xiph producer field', () => {
    const xiphComment = new MockXiphComment()
    const audioFile = makeAudioFile()
    audioFile.getTag.mockReturnValue(xiphComment)
    mockCreateFromPath.mockReturnValue(audioFile)

    writeAudioTagFix('/music/track.flac', { producers: ['Producer A', 'Producer B'] })

    expect(audioFile.getTag).toHaveBeenCalledWith('Xiph', true)
    expect(xiphComment.setFieldAsStrings).toHaveBeenCalledWith('PRODUCER', 'Producer A', 'Producer B')
  })

  it('disposes the audio file when saving fails', () => {
    const audioFile = makeAudioFile()
    audioFile.save.mockImplementation(() => {
      throw new Error('save failed')
    })
    mockCreateFromPath.mockReturnValue(audioFile)

    expect(() => {
      writeAudioTagFix('/music/track.mp3', { album: 'Album' })
    }).toThrow('save failed')
    expect(audioFile.dispose).toHaveBeenCalledOnce()
  })
})
