import { describe, expect, it } from 'vitest'

import {
  type DiscTrackMetadata,
  validateDiscSet,
} from '../../../src/lib/albums/disc-metadata.js'

function record(
  filename: string,
  trackNumber: number,
  discNumber: number | null = null,
  discTotal: number | null = null,
): DiscTrackMetadata {
  return { discNumber, discTotal, filename, trackNumber }
}

function messages(records: DiscTrackMetadata[]): string[] {
  return validateDiscSet(records).map(issue => issue.message)
}

describe('validateDiscSet', () => {
  it('accepts legacy unique tracks and a complete multi-disc set', () => {
    expect(messages([record('a.mp3', 1), record('b.mp3', 2)])).toEqual([])
    expect(messages([
      record('a.mp3', 1, 1, 2),
      record('b.mp3', 2, 1, 2),
      record('c.mp3', 1, 2, 2),
    ])).toEqual([])
  })

  it('requires disc numbers for repeated tracks', () => {
    expect(messages([record('a.mp3', 1), record('b.mp3', 1)]))
      .toEqual(['missing disc number', 'missing disc number'])
  })

  it('requires disc numbers for partial metadata and orphan totals', () => {
    expect(messages([record('a.mp3', 1, 1), record('b.mp3', 2)]))
      .toEqual(['missing disc number'])
    expect(messages([record('a.mp3', 1, null, 2)]))
      .toEqual(['missing disc number'])
  })

  it('reports duplicate tuple and invalid totals', () => {
    expect(messages([
      record('a.mp3', 1, 1, 1),
      record('b.mp3', 1, 1, 2),
    ])).toEqual([
      'duplicate disc and track number: 1/1',
      'inconsistent disc totals: 1, 2',
    ])
  })

  it('reports missing totals, gaps, and an excessive number', () => {
    expect(messages([
      record('a.mp3', 1, 1, 2),
      record('b.mp3', 1, 3),
    ])).toEqual([
      'missing disc total',
      'non-contiguous disc numbers: 1, 3',
    ])
  })

  it('reports non-positive and fractional values', () => {
    expect(messages([record('a.mp3', 1, 0, 1.5)]))
      .toEqual(['invalid disc number', 'invalid disc total'])
  })
})
