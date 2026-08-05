import { reconcileSetMetadata, type SetMetadataRecord } from '../../commands/manage-albums/helpers/set-metadata.js'
import { getErrorMessage, UserInputError } from '../errors.js'

import type { ConcatenateSourceEntry } from './concatenate-album-sources.js'

export function assertNoDiscFieldsInRecords(records: SetMetadataRecord[]): void {
  const offending = records.filter(record => record.discNumber !== undefined || record.discTotal !== undefined)

  if (offending.length > 0) {
    throw new UserInputError(
      '--set-metadata records must not include discNumber/discTotal with --disc-strategy concatenate '
      + `(disc identity comes from sourceDirs order): ${offending.map(record => record.filename).join(', ')}`,
    )
  }
}

export function assertUniqueFilenamesAcrossSources(sourceEntries: ConcatenateSourceEntry[]): void {
  const directoriesByFilename = new Map<string, string[]>()

  for (const entry of sourceEntries) {
    for (const file of entry.files) {
      directoriesByFilename.set(file.name, [...(directoriesByFilename.get(file.name) ?? []), entry.sourceDirectory])
    }
  }
  const duplicates = [...directoriesByFilename.entries()].filter(([, directories]) => directories.length > 1)

  if (duplicates.length > 0) {
    throw new UserInputError(
      `--set-metadata requires unique filenames across sourceDirs: ${duplicates
        .map(([filename, directories]) => `"${filename}" (${directories.join(', ')})`).join('; ')}`,
    )
  }
}

export function reconcileConcatenateSetMetadata(
  records: SetMetadataRecord[],
  sourceEntries: ConcatenateSourceEntry[],
): Map<string, SetMetadataRecord> {
  assertNoDiscFieldsInRecords(records)
  assertUniqueFilenamesAcrossSources(sourceEntries)
  const allFilenames = sourceEntries.flatMap(entry => entry.files.map(file => file.name))

  try {
    return reconcileSetMetadata(records, allFilenames)
  }
  catch (error) {
    throw new UserInputError(getErrorMessage(error))
  }
}
