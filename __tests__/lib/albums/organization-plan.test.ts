import { describe, expect, it } from 'vitest'

import {
  type DiscDestinationContext,
  formatDiscTrackPrefix,
  getAlbumDestination,
} from '../../../src/lib/albums/organization-plan.js'

function destination(discContext?: DiscDestinationContext, trackNumber = 1): string {
  return getAlbumDestination('Artist', 'Album', trackNumber, 'Title', 'source.flac', discContext)
}

describe('formatDiscTrackPrefix', () => {
  it('leaves disc digits unpadded for totals below ten', () => {
    expect(formatDiscTrackPrefix(1, 2, 1)).toBe('101')
    expect(formatDiscTrackPrefix(2, 2, 1)).toBe('201')
    expect(formatDiscTrackPrefix(1, 9, 1)).toBe('101')
    expect(formatDiscTrackPrefix(9, 9, 12)).toBe('912')
  })

  it('pads disc digits to the width of a two-digit disc total', () => {
    expect(formatDiscTrackPrefix(1, 10, 1)).toBe('0101')
    expect(formatDiscTrackPrefix(10, 10, 5)).toBe('1005')
    expect(formatDiscTrackPrefix(3, 22, 1)).toBe('0301')
    expect(formatDiscTrackPrefix(22, 22, 5)).toBe('2205')
  })

  it('keeps track numbers padded to two digits independently of disc width', () => {
    expect(formatDiscTrackPrefix(1, 2, 7)).toBe('107')
    expect(formatDiscTrackPrefix(1, 2, 100)).toBe('1100')
    expect(formatDiscTrackPrefix(1, 100, 1)).toBe('00101')
  })
})

describe('getAlbumDestination disc prefixes', () => {
  it('embeds the disc number adjacent to the track number for multi-disc sets', () => {
    expect(destination({ discNumber: 1, discTotal: 2, multiDisc: true }))
      .toBe('Artist/Album/101 - Title.flac')
    expect(destination({ discNumber: 2, discTotal: 2, multiDisc: true }))
      .toBe('Artist/Album/201 - Title.flac')
    expect(destination({ discNumber: 3, discTotal: 22, multiDisc: true }))
      .toBe('Artist/Album/0301 - Title.flac')
  })

  it('never nests a disc directory', () => {
    expect(destination({ discNumber: 2, discTotal: 2, multiDisc: true })).not.toContain('Disc')
  })

  it('omits the disc prefix for single-disc sets', () => {
    expect(destination()).toBe('Artist/Album/01 - Title.flac')
    expect(destination({ discNumber: null, discTotal: null, multiDisc: false }))
      .toBe('Artist/Album/01 - Title.flac')
  })

  it('omits the disc prefix when multiDisc is false despite a resolved disc context', () => {
    expect(destination({ discNumber: 2, discTotal: 2, multiDisc: false }))
      .toBe('Artist/Album/01 - Title.flac')
  })

  it('omits the disc prefix when either disc field is missing', () => {
    expect(destination({ discNumber: null, discTotal: 2, multiDisc: true }))
      .toBe('Artist/Album/01 - Title.flac')
    expect(destination({ discNumber: 1, discTotal: null, multiDisc: true }))
      .toBe('Artist/Album/01 - Title.flac')
  })
})
