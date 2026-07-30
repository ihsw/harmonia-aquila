import { readFile } from 'node:fs/promises'
import { basename, extname } from 'node:path'

import {
  createSetMetadataError,
  parseCsvRecords,
  parseJsonRecords,
} from './set-metadata-file-parsers.js'
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

function toPositiveInteger(rawValue: unknown, fieldName: string, context: string): number {
  if (typeof rawValue === 'number') {
    if (!Number.isInteger(rawValue) || rawValue <= 0) {
      throw createSetMetadataError(
        `Metadata record ${context} has an invalid ${fieldName} ${JSON.stringify(rawValue)} (expected a positive integer)`,
      )
    }

    return rawValue
  }

  if (typeof rawValue === 'string') {
    const trimmed = rawValue.trim()

    if (!/^\d+$/.test(trimmed)) {
      throw createSetMetadataError(
        `Metadata record ${context} has an invalid ${fieldName} ${JSON.stringify(rawValue)} (expected a positive integer)`,
      )
    }

    const parsed = Number(trimmed)

    if (!Number.isInteger(parsed) || parsed <= 0) {
      throw createSetMetadataError(
        `Metadata record ${context} has an invalid ${fieldName} ${JSON.stringify(rawValue)} (expected a positive integer)`,
      )
    }

    return parsed
  }

  throw createSetMetadataError(
    `Metadata record ${context} has an invalid ${fieldName} ${JSON.stringify(rawValue)} (expected a positive integer)`,
  )
}

function requireNonEmptyString(rawValue: unknown, fieldName: string, context: string): string {
  if (typeof rawValue !== 'string') {
    throw createSetMetadataError(`Metadata record ${context} has a non-string ${fieldName} value`)
  }

  if (rawValue.trim() === '') {
    throw createSetMetadataError(`Metadata record ${context} has an empty ${fieldName} value`)
  }

  return rawValue
}

function buildRecord(rawRecord: Record<string, unknown>, context: string): SetMetadataRecord {
  for (const field of REQUIRED_FIELDS) {
    if (!(field in rawRecord)) {
      throw createSetMetadataError(`Metadata record ${context} is missing the required field "${field}"`)
    }
  }

  const values: Record<typeof STRING_FIELDS[number], string> = {
    album: '',
    artist: '',
    filename: '',
    title: '',
  }

  for (const field of STRING_FIELDS) {
    values[field] = requireNonEmptyString(rawRecord[field], field, context)
  }

  const filename = values.filename

  if (basename(filename) !== filename) {
    throw createSetMetadataError(
      `Metadata record ${context} has a filename "${filename}" that must be a bare file name without path separators`,
    )
  }

  if (!isSupportedAudioExtension(extname(filename))) {
    throw createSetMetadataError(
      `Metadata record ${context} has filename "${filename}" with an unsupported extension (expected ${getSupportedAudioExtensions().join(', ')})`,
    )
  }

  const discNumber = 'discNumber' in rawRecord
    ? toPositiveInteger(rawRecord.discNumber, 'discNumber', context)
    : undefined
  const discTotal = 'discTotal' in rawRecord
    ? toPositiveInteger(rawRecord.discTotal, 'discTotal', context)
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
    filename,
    title: values.title,
    trackNumber: toPositiveInteger(rawRecord.trackNumber, 'trackNumber', context),
  }
}

export async function parseSetMetadataFile(filePath: string): Promise<SetMetadataRecord[]> {
  const extension = extname(filePath).toLowerCase()
  let fileContents: string

  try {
    fileContents = await readFile(filePath, 'utf8')
  }
  catch (error) {
    throw createSetMetadataError(`Failed to read metadata file "${filePath}"`, error)
  }

  let rawRecords: Array<Record<string, unknown>>

  if (extension === '.json') {
    rawRecords = parseJsonRecords(fileContents, filePath)
  }
  else if (extension === '.csv') {
    rawRecords = parseCsvRecords(fileContents, filePath, REQUIRED_FIELDS)
  }
  else {
    throw createSetMetadataError(
      `Unsupported metadata file extension "${extension}" for "${filePath}" (expected .json or .csv)`,
    )
  }

  if (rawRecords.length === 0) {
    throw createSetMetadataError(`Metadata file "${filePath}" does not contain any records`)
  }

  const records = rawRecords.map((rawRecord, index) => buildRecord(rawRecord, `at index ${index.toString()}`))
  const seenFilenames = new Set<string>()

  for (const record of records) {
    if (seenFilenames.has(record.filename)) {
      throw createSetMetadataError(`Metadata file "${filePath}" has a duplicate record for filename "${record.filename}"`)
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
  const unknownFilenames = records
    .map(record => record.filename)
    .filter(filename => !sourceFilenameSet.has(filename))

  if (unknownFilenames.length > 0) {
    throw createSetMetadataError(
      `Metadata records reference files that are not present in the source directory: ${unknownFilenames.join(', ')}`,
    )
  }

  const missingFilenames = sourceFilenames.filter(filename => !recordsByFilename.has(filename))

  if (missingFilenames.length > 0) {
    throw createSetMetadataError(
      `Source audio files are missing metadata records: ${missingFilenames.join(', ')}`,
    )
  }

  return recordsByFilename
}
