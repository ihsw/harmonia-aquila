import { describe, expect, it } from 'vitest'

import { getErrorMessage, requireUserInput, UserInputError } from '../../src/lib/errors.js'

describe('errors', () => {
  it('creates user input errors for failed requirements', () => {
    expect(() => {
      requireUserInput(false, 'invalid input')
    }).toThrow(UserInputError)
    expect(() => {
      requireUserInput(false, 'invalid input')
    }).toThrow('invalid input')
  })

  it('does not throw when user input requirements pass', () => {
    expect(() => {
      requireUserInput(true, 'valid input')
    }).not.toThrow()
  })

  it('normalizes Error and non-Error messages', () => {
    expect(getErrorMessage(new Error('boom'))).toBe('boom')
    expect(getErrorMessage(42)).toBe('42')
  })
})
