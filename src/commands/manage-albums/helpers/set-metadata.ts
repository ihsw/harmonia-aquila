import { readFile } from 'node:fs/promises'
import { extname } from 'node:path'

import {
  createSetMetadataError,
  parseCsvRecords,
  parseJsonRecords,
} from './set-metadata-file-parsers.js'
import {
  normalizeSetMetadataRecords,
  type SetMetadataRecord,
} from './set-metadata-records.js'

export type { SetMetadataRecord } from './set-metadata-records.js'
export { normalizeSetMetadataRecords, reconcileSetMetadata } from './set-metadata-records.js'

const REQUIRED_FIELDS = ['filename', 'artist', 'album', 'trackNumber', 'title'] as const

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

  return normalizeSetMetadataRecords(rawRecords, `Metadata file "${filePath}"`)
}
