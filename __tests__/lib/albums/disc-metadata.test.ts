import { describe, expect, it } from 'vitest'

import { formatDiscNumber, isMultiDiscSet } from '../../../src/lib/albums/disc-metadata.js'

describe('disc metadata', () => {
  it('formats missing and present values', () => {
    expect(formatDiscNumber(null)).toBe('')
    expect(formatDiscNumber(1)).toBe('01')
    expect(formatDiscNumber(12)).toBe('12')
  })

  it('detects multi-disc evidence from number or total', () => {
    expect(isMultiDiscSet([{ discNumber: null, discTotal: null }])).toBe(false)
    expect(isMultiDiscSet([{ discNumber: 1, discTotal: null }])).toBe(false)
    expect(isMultiDiscSet([{ discNumber: 2, discTotal: null }])).toBe(true)
    expect(isMultiDiscSet([{ discNumber: 1, discTotal: 2 }])).toBe(true)
  })
})
