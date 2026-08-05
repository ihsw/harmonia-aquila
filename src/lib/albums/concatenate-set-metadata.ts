import { resolve } from 'node:path'

import type { SetMetadataRecord } from '../../commands/manage-albums/helpers/set-metadata.js'
import { UserInputError } from '../errors.js'

import type { ConcatenateSourceEntry } from './concatenate-album-sources.js'

interface ConcatenateTarget {
  filename: string
  sourceDirectory: string
  sourceIndex: number
  sourcePath: string
}

interface ResolvedRecord {
  record: SetMetadataRecord
  target: ConcatenateTarget
}

export function assertNoDiscFieldsInRecords(records: SetMetadataRecord[]): void {
  const offending = records.filter(record => record.discNumber !== undefined || record.discTotal !== undefined)

  if (offending.length > 0) {
    throw new UserInputError(
      '--set-metadata records must not include discNumber/discTotal with --disc-strategy concatenate '
      + `(disc identity comes from sourceDirs order): ${offending.map(record => record.filename).join(', ')}`,
    )
  }
}

function buildTargets(sourceEntries: ConcatenateSourceEntry[]): ConcatenateTarget[] {
  return sourceEntries.flatMap(entry => entry.files.map(file => ({
    filename: file.name,
    sourceDirectory: entry.sourceDirectory,
    sourceIndex: entry.sourceIndex + 1,
    sourcePath: resolve(entry.sourceDirectory, file.name),
  })))
}

function describeTargets(targets: ConcatenateTarget[]): string {
  return targets.map(target => `${target.sourceDirectory} (${target.sourceIndex.toString()})`).join(', ')
}

function assertSourceIndexRange(records: SetMetadataRecord[], sourceCount: number): void {
  const offending = records.filter(record => record.sourceIndex !== undefined && record.sourceIndex > sourceCount)

  if (offending.length > 0) {
    throw new UserInputError(
      `--set-metadata sourceIndex is out of range (expected 1..${sourceCount.toString()}): ${offending
        .map(record => `"${record.filename}" (${record.sourceIndex?.toString() ?? ''})`)
        .join(', ')}`,
    )
  }
}

function selectTarget(record: SetMetadataRecord, candidates: ConcatenateTarget[]): ConcatenateTarget | undefined {
  if (record.sourceIndex === undefined) {
    return candidates.length === 1 ? candidates[0] : undefined
  }

  return candidates.find(candidate => candidate.sourceIndex === record.sourceIndex)
}

function assertResolvable(
  records: SetMetadataRecord[],
  targetsByFilename: Map<string, ConcatenateTarget[]>,
): void {
  const unknown = records.filter(record => !targetsByFilename.has(record.filename))

  if (unknown.length > 0) {
    throw new UserInputError(
      'Metadata records reference files that are not present in the source directory: '
      + unknown.map(record => record.filename).join(', '),
    )
  }
  const ambiguous = records.filter(record => record.sourceIndex === undefined
    && (targetsByFilename.get(record.filename) ?? []).length > 1)

  if (ambiguous.length > 0) {
    throw new UserInputError(
      `--set-metadata requires sourceIndex to disambiguate filenames present in multiple sourceDirs: ${ambiguous
        .map(record => `"${record.filename}" (${describeTargets(targetsByFilename.get(record.filename) ?? [])})`)
        .join('; ')}`,
    )
  }
  const misdirected = records.filter(record => record.sourceIndex !== undefined
    && selectTarget(record, targetsByFilename.get(record.filename) ?? []) === undefined)

  if (misdirected.length > 0) {
    throw new UserInputError(
      `--set-metadata sourceIndex names a directory that does not contain the file: ${misdirected
        .map(record => `"${record.filename}" (${record.sourceIndex?.toString() ?? ''}); present in `
          + describeTargets(targetsByFilename.get(record.filename) ?? []))
        .join('; ')}`,
    )
  }
}

function assertNoDuplicateTargets(resolved: ResolvedRecord[]): void {
  const countsBySourcePath = new Map<string, number>()

  for (const { target } of resolved) {
    countsBySourcePath.set(target.sourcePath, (countsBySourcePath.get(target.sourcePath) ?? 0) + 1)
  }
  const duplicates = [...countsBySourcePath.entries()].filter(([, count]) => count > 1).map(([path]) => path)

  if (duplicates.length > 0) {
    throw new UserInputError(
      `--set-metadata has multiple records resolving to the same file: ${duplicates.join(', ')}`,
    )
  }
}

function assertFullCoverage(
  resolved: ResolvedRecord[],
  targets: ConcatenateTarget[],
  targetsByFilename: Map<string, ConcatenateTarget[]>,
): void {
  const covered = new Set(resolved.map(({ target }) => target.sourcePath))
  const missing = targets.filter(target => !covered.has(target.sourcePath))

  if (missing.length > 0) {
    throw new UserInputError(
      `Source audio files are missing metadata records: ${missing
        .map(target => (targetsByFilename.get(target.filename) ?? []).length > 1
          ? `${target.filename} (${target.sourceDirectory})`
          : target.filename)
        .join(', ')}`,
    )
  }
}

export function reconcileConcatenateSetMetadata(
  records: SetMetadataRecord[],
  sourceEntries: ConcatenateSourceEntry[],
): Map<string, SetMetadataRecord> {
  assertNoDiscFieldsInRecords(records)
  const targets = buildTargets(sourceEntries)
  const targetsByFilename = new Map<string, ConcatenateTarget[]>()

  for (const target of targets) {
    targetsByFilename.set(target.filename, [...(targetsByFilename.get(target.filename) ?? []), target])
  }
  assertSourceIndexRange(records, sourceEntries.length)
  assertResolvable(records, targetsByFilename)
  const resolved = records.flatMap((record) => {
    const target = selectTarget(record, targetsByFilename.get(record.filename) ?? [])

    return target === undefined ? [] : [{ record, target }]
  })

  assertNoDuplicateTargets(resolved)
  assertFullCoverage(resolved, targets, targetsByFilename)
  return new Map(resolved.map(({ record, target }) => [target.sourcePath, record]))
}
