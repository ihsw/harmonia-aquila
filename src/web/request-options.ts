import { UserInputError } from '../lib/errors.js'

type QueryValue = string | string[] | undefined

export type QueryRecord = Record<string, QueryValue>
export type BodyRecord = Record<string, unknown>

export function bodyRecord(body: unknown): BodyRecord {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    throw new UserInputError('JSON body must be an object')
  }

  return body as BodyRecord
}

export function optionalBoolean(value: unknown): boolean | undefined {
  if (value === undefined) {
    return undefined
  }

  if (typeof value === 'boolean') {
    return value
  }

  if (value === 'true') {
    return true
  }

  if (value === 'false') {
    return false
  }

  throw new UserInputError('boolean values must be true or false')
}

export function optionalString(record: BodyRecord | QueryRecord, key: string): string | undefined {
  const value = record[key]

  if (value === undefined) {
    return undefined
  }

  if (typeof value === 'string') {
    return value
  }

  throw new UserInputError(`${key} must be a string`)
}

export function requiredString(record: BodyRecord | QueryRecord, key: string): string {
  const value = optionalString(record, key)

  if (value === undefined) {
    throw new UserInputError(`${key} is required`)
  }

  return value
}

export function stringArray(record: BodyRecord, key: string): string[] {
  const value = record[key]

  if (value === undefined) {
    return []
  }

  if (Array.isArray(value) && value.every(item => typeof item === 'string')) {
    return value
  }

  if (typeof value === 'string') {
    return [value]
  }

  throw new UserInputError(`${key} must be a string or string array`)
}

export function optionalEntry<T>(key: string, value: T | undefined): Record<string, T> {
  return value === undefined ? {} : { [key]: value }
}
