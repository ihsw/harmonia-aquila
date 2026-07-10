import { readFile } from 'node:fs/promises'
import { basename, extname } from 'node:path'

import { getSupportedAudioExtensions, isSupportedAudioExtension } from './command-utils.js'

export interface SetMetadataRecord {
  album: string
  artist: string
  filename: string
  title: string
  trackNumber: number
}

const REQUIRED_FIELDS = ['filename', 'artist', 'album', 'trackNumber', 'title'] as const
const STRING_FIELDS = ['filename', 'artist', 'album', 'title'] as const

function createSetMetadataError(message: string, cause?: unknown): Error {
  return cause === undefined ? new Error(message) : new Error(message, { cause })
}

function toPositiveIntegerTrackNumber(rawValue: unknown, context: string): number {
  if (typeof rawValue === 'number') {
    if (!Number.isInteger(rawValue) || rawValue <= 0) {
      throw createSetMetadataError(
        `Metadata record ${context} has an invalid trackNumber ${JSON.stringify(rawValue)} (expected a positive integer)`,
      )
    }

    return rawValue
  }

  if (typeof rawValue === 'string') {
    const trimmed = rawValue.trim()

    if (!/^\d+$/.test(trimmed)) {
      throw createSetMetadataError(
        `Metadata record ${context} has an invalid trackNumber ${JSON.stringify(rawValue)} (expected a positive integer)`,
      )
    }

    const parsed = Number(trimmed)

    if (!Number.isInteger(parsed) || parsed <= 0) {
      throw createSetMetadataError(
        `Metadata record ${context} has an invalid trackNumber ${JSON.stringify(rawValue)} (expected a positive integer)`,
      )
    }

    return parsed
  }

  throw createSetMetadataError(
    `Metadata record ${context} has an invalid trackNumber ${JSON.stringify(rawValue)} (expected a positive integer)`,
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

  return {
    album: values.album,
    artist: values.artist,
    filename,
    title: values.title,
    trackNumber: toPositiveIntegerTrackNumber(rawRecord.trackNumber, context),
  }
}

function asRawRecord(rawValue: unknown, context: string): Record<string, unknown> {
  if (typeof rawValue !== 'object' || rawValue === null || Array.isArray(rawValue)) {
    throw createSetMetadataError(`Metadata record ${context} must be an object`)
  }

  return rawValue as Record<string, unknown>
}

function parseJsonRecords(fileContents: string, filePath: string): Array<Record<string, unknown>> {
  let parsed: unknown

  try {
    parsed = JSON.parse(fileContents)
  }
  catch (error) {
    throw createSetMetadataError(`Failed to parse metadata JSON file "${filePath}"`, error)
  }

  if (!Array.isArray(parsed)) {
    throw createSetMetadataError(`Metadata JSON file "${filePath}" must contain an array of records`)
  }

  return parsed.map((rawValue, index) => asRawRecord(rawValue, `at index ${index.toString()}`))
}

function parseCsvRows(fileContents: string): string[][] {
  const rows: string[][] = []
  let currentRow: string[] = []
  let field = ''
  let inQuotes = false
  let quotedFieldClosed = false
  let index = 0

  while (index < fileContents.length) {
    const character = fileContents[index]

    if (character === undefined) {
      break
    }

    if (inQuotes) {
      if (character === '"') {
        if (fileContents[index + 1] === '"') {
          field += '"'
          index += 2

          continue
        }

        inQuotes = false
        quotedFieldClosed = true
        index += 1

        continue
      }

      field += character
      index += 1

      continue
    }

    if (quotedFieldClosed && character !== ',' && character !== '\r' && character !== '\n') {
      throw createSetMetadataError('Metadata CSV file has unquoted content after a quoted field')
    }

    if (character === '"') {
      if (field !== '') {
        throw createSetMetadataError('Metadata CSV file has a quote within an unquoted field')
      }

      inQuotes = true
      index += 1

      continue
    }

    if (character === ',') {
      currentRow.push(field)
      field = ''
      quotedFieldClosed = false
      index += 1

      continue
    }

    if (character === '\r' || character === '\n') {
      currentRow.push(field)
      field = ''
      rows.push(currentRow)
      currentRow = []
      quotedFieldClosed = false

      if (character === '\r' && fileContents[index + 1] === '\n') {
        index += 2
      }
      else {
        index += 1
      }

      continue
    }

    field += character
    index += 1
  }

  if (inQuotes) {
    throw createSetMetadataError('Metadata CSV file has an unterminated quoted field')
  }

  if (field !== '' || currentRow.length > 0) {
    currentRow.push(field)
    rows.push(currentRow)
  }

  return rows.filter(row => !(row.length === 1 && row[0] === ''))
}

function parseCsvRecords(fileContents: string, filePath: string): Array<Record<string, unknown>> {
  const rows = parseCsvRows(fileContents)
  const header = rows[0]

  if (header === undefined) {
    throw createSetMetadataError(`Metadata CSV file "${filePath}" must contain a header row and at least one record`)
  }

  const seenColumns = new Set<string>()

  for (const column of header) {
    if (seenColumns.has(column)) {
      throw createSetMetadataError(`Metadata CSV file "${filePath}" has a duplicate column "${column}"`)
    }

    seenColumns.add(column)
  }

  for (const field of REQUIRED_FIELDS) {
    if (!seenColumns.has(field)) {
      throw createSetMetadataError(`Metadata CSV file "${filePath}" is missing the required column "${field}"`)
    }
  }

  const dataRows = rows.slice(1)

  if (dataRows.length === 0) {
    throw createSetMetadataError(`Metadata CSV file "${filePath}" must contain at least one record row`)
  }

  return dataRows.map((row, rowIndex) => {
    if (row.length !== header.length) {
      throw createSetMetadataError(
        `Metadata CSV file "${filePath}" record on line ${(rowIndex + 2).toString()} has ${row.length.toString()} fields but the header has ${header.length.toString()}`,
      )
    }

    const record: Record<string, unknown> = {}

    header.forEach((column, columnIndex) => {
      record[column] = row[columnIndex]
    })

    return record
  })
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
    rawRecords = parseCsvRecords(fileContents, filePath)
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
