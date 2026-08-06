import { basename, extname, resolve } from 'node:path'

import { createSetMetadataError } from './set-metadata-file-parsers.js'
import { getSupportedAudioExtensions, isSupportedAudioExtension } from './utils.js'

export interface SetMetadataRecord {
  album: string
  artist: string
  discNumber?: number
  discTotal?: number
  filename: string
  sourceIndex?: number
  title: string
  trackNumber: number
  year?: number
}

const REQUIRED_FIELDS = ['filename', 'artist', 'album', 'trackNumber', 'title'] as const
const STRING_FIELDS = ['filename', 'artist', 'album', 'title'] as const
const MIN_YEAR = 1000
const MAX_YEAR = 9999

function asRawRecord(rawValue: unknown, context: string): Record<string, unknown> {
  if (typeof rawValue !== 'object' || rawValue === null || Array.isArray(rawValue)) {
    throw createSetMetadataError(`Metadata record ${context} must be an object`)
  }
  return rawValue as Record<string, unknown>
}

function positiveInteger(rawValue: unknown, fieldName: string, context: string): number {
  if (typeof rawValue === 'number' && Number.isInteger(rawValue) && rawValue > 0) {
    return rawValue
  }
  if (typeof rawValue === 'string' && /^\d+$/.test(rawValue.trim())) {
    const parsed = Number(rawValue.trim())
    if (Number.isInteger(parsed) && parsed > 0) {
      return parsed
    }
  }
  throw createSetMetadataError(
    `Metadata record ${context} has an invalid ${fieldName} ${JSON.stringify(rawValue)} (expected a positive integer)`,
  )
}

function yearValue(rawValue: unknown, context: string): number {
  const candidate = typeof rawValue === 'string' && /^\d+$/.test(rawValue.trim())
    ? Number(rawValue.trim())
    : rawValue

  if (typeof candidate === 'number'
    && Number.isInteger(candidate)
    && candidate >= MIN_YEAR
    && candidate <= MAX_YEAR) {
    return candidate
  }
  throw createSetMetadataError(
    `Metadata record ${context} has an invalid year ${JSON.stringify(rawValue)} `
    + `(expected an integer between ${MIN_YEAR.toString()} and ${MAX_YEAR.toString()})`,
  )
}

function nonEmptyString(rawValue: unknown, fieldName: string, context: string): string {
  if (typeof rawValue !== 'string') {
    throw createSetMetadataError(`Metadata record ${context} has a non-string ${fieldName} value`)
  }
  if (rawValue.trim() === '') {
    throw createSetMetadataError(`Metadata record ${context} has an empty ${fieldName} value`)
  }
  return rawValue
}

function buildRecord(rawValue: unknown, context: string): SetMetadataRecord {
  const rawRecord = asRawRecord(rawValue, context)
  for (const field of REQUIRED_FIELDS) {
    if (!(field in rawRecord)) {
      throw createSetMetadataError(`Metadata record ${context} is missing the required field "${field}"`)
    }
  }
  const values: Record<typeof STRING_FIELDS[number], string> = {
    album: '', artist: '', filename: '', title: '',
  }
  for (const field of STRING_FIELDS) {
    values[field] = nonEmptyString(rawRecord[field], field, context)
  }
  if (basename(values.filename) !== values.filename || values.filename.includes('\\')) {
    throw createSetMetadataError(
      `Metadata record ${context} has a filename "${values.filename}" that must be a bare file name without path separators`,
    )
  }
  if (!isSupportedAudioExtension(extname(values.filename))) {
    throw createSetMetadataError(
      `Metadata record ${context} has filename "${values.filename}" with an unsupported extension (expected ${getSupportedAudioExtensions().join(', ')})`,
    )
  }
  const discNumber = 'discNumber' in rawRecord
    ? positiveInteger(rawRecord.discNumber, 'discNumber', context)
    : undefined
  const discTotal = 'discTotal' in rawRecord
    ? positiveInteger(rawRecord.discTotal, 'discTotal', context)
    : undefined
  if (discTotal !== undefined && discNumber === undefined) {
    throw createSetMetadataError(`Metadata record ${context} has discTotal without discNumber`)
  }
  if (discNumber !== undefined && discTotal !== undefined && discNumber > discTotal) {
    throw createSetMetadataError(`Metadata record ${context} has discNumber greater than discTotal`)
  }
  const sourceIndex = !('sourceIndex' in rawRecord) || rawRecord.sourceIndex === ''
    ? undefined
    : positiveInteger(rawRecord.sourceIndex, 'sourceIndex', context)
  const year = !('year' in rawRecord) || rawRecord.year === ''
    ? undefined
    : yearValue(rawRecord.year, context)
  return {
    album: values.album,
    artist: values.artist,
    ...(discNumber === undefined ? {} : { discNumber }),
    ...(discTotal === undefined ? {} : { discTotal }),
    filename: values.filename,
    ...(sourceIndex === undefined ? {} : { sourceIndex }),
    title: values.title,
    trackNumber: positiveInteger(rawRecord.trackNumber, 'trackNumber', context),
    ...(year === undefined ? {} : { year }),
  }
}

export function normalizeSetMetadataRecords(
  rawRecords: readonly unknown[],
  sourceDescription = 'Inline metadata',
): SetMetadataRecord[] {
  if (rawRecords.length === 0) {
    throw createSetMetadataError(`${sourceDescription} does not contain any records`)
  }
  const records = rawRecords.map((record, index) => buildRecord(record, `at index ${index.toString()}`))
  const groupsByFilename = new Map<string, SetMetadataRecord[]>()
  for (const record of records) {
    groupsByFilename.set(record.filename, [...(groupsByFilename.get(record.filename) ?? []), record])
  }
  for (const [filename, group] of groupsByFilename) {
    const sourceIndexes = group.map(record => record.sourceIndex)
    if (group.length > 1
      && (sourceIndexes.includes(undefined) || new Set(sourceIndexes).size !== group.length)) {
      throw createSetMetadataError(`${sourceDescription} has a duplicate record for filename "${filename}"`)
    }
  }
  return records
}

export function assertNoSourceIndexInRecords(records: SetMetadataRecord[]): void {
  const offending = records.filter(record => record.sourceIndex !== undefined)

  if (offending.length > 0) {
    throw createSetMetadataError(
      'sourceIndex is only supported with sourceDirs and --disc-strategy concatenate: '
      + offending.map(record => record.filename).join(', '),
    )
  }
}

export function reconcileSetMetadata(
  records: SetMetadataRecord[],
  sourceDirectory: string,
  sourceFilenames: string[],
): Map<string, SetMetadataRecord> {
  assertNoSourceIndexInRecords(records)
  const recordLookup = new Map(records.map(record => [record.filename, record]))
  const sourceFilenameSet = new Set(sourceFilenames)
  const unknownFilenames = records.map(record => record.filename)
    .filter(filename => !sourceFilenameSet.has(filename))
  if (unknownFilenames.length > 0) {
    throw createSetMetadataError(
      `Metadata records reference files that are not present in the source directory: ${unknownFilenames.join(', ')}`,
    )
  }
  const missingFilenames = sourceFilenames.filter(filename => !recordLookup.has(filename))
  if (missingFilenames.length > 0) {
    throw createSetMetadataError(`Source audio files are missing metadata records: ${missingFilenames.join(', ')}`)
  }
  return new Map(sourceFilenames.flatMap((filename) => {
    const record = recordLookup.get(filename)

    return record === undefined ? [] : [[resolve(sourceDirectory, filename), record] as const]
  }))
}
