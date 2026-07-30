import { describe, expect, it } from 'vitest'

import {
  type DiscTrackMetadata,
  inferDiscSet,
} from '../../../src/lib/albums/disc-metadata.js'

function record(
  filename: string,
  trackNumber: number | null,
  discNumber: number | null = null,
  discTotal: number | null = null,
): DiscTrackMetadata {
  return { discNumber, discTotal, filename, trackNumber }
}

describe('inferDiscSet', () => {
  it('splits filename-ordered tracks into increasing runs', () => {
    const inferred = inferDiscSet([
      record('04.mp3', 1),
      record('02.mp3', 2),
      record('01.mp3', 1),
      record('03.mp3', 3),
    ])

    expect([...inferred.entries()]).toEqual([
      ['01.mp3', { discNumber: 1, discTotal: 2 }],
      ['02.mp3', { discNumber: 1, discTotal: 2 }],
      ['03.mp3', { discNumber: 1, discTotal: 2 }],
      ['04.mp3', { discNumber: 2, discTotal: 2 }],
    ])
  })

  it('assigns repeated tracks to successive discs', () => {
    expect([...inferDiscSet([record('a.mp3', 4), record('b.mp3', 4)]).values()])
      .toEqual([
        { discNumber: 1, discTotal: 2 },
        { discNumber: 2, discTotal: 2 },
      ])
  })

  it('preserves compatible existing values', () => {
    const inferred = inferDiscSet([
      record('a.mp3', 1, 1, 2),
      record('b.mp3', 1, 2, 2),
    ])

    expect(inferred.get('b.mp3')).toEqual({ discNumber: 2, discTotal: 2 })
  })

  it('rejects missing tracks, one run, and contradictions', () => {
    expect(() => inferDiscSet([record('a.mp3', null), record('b.mp3', 1)]))
      .toThrow('a.mp3 is missing a positive track number')
    expect(() => inferDiscSet([record('a.mp3', 1), record('b.mp3', 2)]))
      .toThrow('track numbers do not contain a repeated or decreasing boundary')
    expect(() => inferDiscSet([
      record('a.mp3', 1, 2),
      record('b.mp3', 1, 2),
    ])).toThrow('a.mp3 has contradictory existing disc metadata')
  })
})
