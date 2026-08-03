import { basename, extname } from 'node:path'

import { createSetMetadataError } from './set-metadata-file-parsers.js'
import { getSupportedAudioExtensions, isSupportedAudioExtension } from './utils.js'

export interface SetMetadataRecord {
  album: string
  artist: string
  discNumber?: number
  discTotal?: number
  filename: string
  title: string
  trackNumber: number
}

const REQUIRED_FIELDS = ['filename', 'artist', 'album', 'trackNumber', 'title'] as const
const STRING_FIELDS = ['filename', 'artist', 'album', 'title'] as const

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
  return {
    album: values.album,
    artist: values.artist,
    ...(discNumber === undefined ? {} : { discNumber }),
    ...(discTotal === undefined ? {} : { discTotal }),
    filename: values.filename,
    title: values.title,
    trackNumber: positiveInteger(rawRecord.trackNumber, 'trackNumber', context),
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
  const seenFilenames = new Set<string>()
  for (const record of records) {
    if (seenFilenames.has(record.filename)) {
      throw createSetMetadataError(`${sourceDescription} has a duplicate record for filename "${record.filename}"`)
    }
    seenFilenames.add(record.filename)
  }
  return records
}

export function reconcileSetMetadata(
  records: SetMetadataRecord[],
  sourceFilenames: string[],
): Map<string, SetMetadataRecord> {
  const recordsByFilename = new Map(records.map(record => [record.filename, record]))
  const sourceFilenameSet = new Set(sourceFilenames)
  const unknownFilenames = records.map(record => record.filename)
    .filter(filename => !sourceFilenameSet.has(filename))
  if (unknownFilenames.length > 0) {
    throw createSetMetadataError(
      `Metadata records reference files that are not present in the source directory: ${unknownFilenames.join(', ')}`,
    )
  }
  const missingFilenames = sourceFilenames.filter(filename => !recordsByFilename.has(filename))
  if (missingFilenames.length > 0) {
    throw createSetMetadataError(`Source audio files are missing metadata records: ${missingFilenames.join(', ')}`)
  }
  return recordsByFilename
}
