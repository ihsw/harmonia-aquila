import type { Dirent } from 'node:fs'
import { realpath } from 'node:fs/promises'

import type { SetMetadataRecord } from '../../commands/manage-albums/helpers/set-metadata.js'
import { UserInputError } from '../errors.js'

import { getAudioFiles } from './audio-files.js'
import { reconcileConcatenateSetMetadata } from './concatenate-set-metadata.js'
import { parseAlbumSources } from './metadata-fix-sources.js'
import type { NormalizedMetadataFixOptions, ParsedAlbumSource } from './metadata-fix-types.js'
import type { OrganizeFilesOptions } from './organize-files-types.js'

export interface ConcatenateSourceEntry {
  albumArtFiles: Dirent[]
  files: Dirent[]
  sourceDirectory: string
  sourceIndex: number
}

export interface ConcatenateDiscContext {
  discNumber: number
  discTotal: number
}

export interface ConcatenateAlbumSources {
  discsBySourcePath: Map<string, ConcatenateDiscContext>
  recordsBySourcePath: Map<string, SetMetadataRecord> | undefined
  sourceEntries: ConcatenateSourceEntry[]
  sources: ParsedAlbumSource[]
}

function assertConcatenateOptions(
  options: OrganizeFilesOptions,
  normalized: NormalizedMetadataFixOptions,
): readonly string[] {
  if (options.sourceDirs === undefined) {
    throw new UserInputError('Concatenate requires sourceDirs')
  }
  if (options.sourceDirs.length < 2) {
    throw new UserInputError('Concatenate requires at least two source directories')
  }
  const conflicts = [
    options.limit === undefined ? undefined : '--limit',
    normalized.resetTrack ? '--reset-track' : undefined,
    options.ignoreAudioFilesWithoutTracks === true ? '--ignore-audio-files-without-tracks' : undefined,
  ].filter((value): value is string => value !== undefined)

  if (conflicts.length > 0) {
    throw new UserInputError(`--disc-strategy concatenate conflicts with ${conflicts.join(', ')}`)
  }
  return options.sourceDirs
}

async function assertUniqueSourceDirs(sourceEntries: ConcatenateSourceEntry[]): Promise<void> {
  const realPaths = await Promise.all(
    sourceEntries.map(entry => realpath(entry.sourceDirectory).catch(() => entry.sourceDirectory)),
  )
  const entriesByRealPath = new Map<string, Array<{ index: number, sourceDirectory: string }>>()

  sourceEntries.forEach((entry, i) => {
    const realPath = realPaths[i] ?? entry.sourceDirectory
    const existing = entriesByRealPath.get(realPath) ?? []

    entriesByRealPath.set(realPath, [...existing, { index: entry.sourceIndex, sourceDirectory: entry.sourceDirectory }])
  })
  const duplicates = [...entriesByRealPath.values()]
    .filter(entries => entries.length > 1)
    .map(entries => `${entries.map(e => e.sourceDirectory).join(', ')} (${entries.map(e => e.index + 1).join(', ')})`)

  if (duplicates.length > 0) {
    throw new UserInputError(`Concatenate source directories must be unique: ${duplicates.join('; ')}`)
  }
}

function getLocalTrackNumber(source: ParsedAlbumSource, record: SetMetadataRecord | undefined): number {
  const trackNumber = source.trackNumber ?? record?.trackNumber ?? null

  if (trackNumber === null || !Number.isInteger(trackNumber) || trackNumber < 1) {
    throw new UserInputError(`${source.sourcePath} must have a positive integer track number for concatenation`)
  }
  return trackNumber
}

function normalizeSourceTracks(
  sourceDirectory: string,
  parsedSources: ParsedAlbumSource[],
  recordsBySourcePath: Map<string, SetMetadataRecord> | undefined,
): ParsedAlbumSource[] {
  const countsByTrack = new Map<number, string[]>()

  for (const source of parsedSources) {
    const trackNumber = getLocalTrackNumber(source, recordsBySourcePath?.get(source.sourcePath))
    countsByTrack.set(trackNumber, [...(countsByTrack.get(trackNumber) ?? []), source.filename])
  }
  const duplicates = [...countsByTrack.entries()]
    .filter(([, filenames]) => filenames.length > 1)
    .map(([trackNumber, filenames]) => `${String(trackNumber)} (${filenames.join(', ')})`)

  if (duplicates.length > 0) {
    throw new UserInputError(`Concatenate source "${sourceDirectory}" has duplicate track numbers: ${duplicates.join('; ')}`)
  }
  return [...parsedSources]
    .sort((left, right) => (
      getLocalTrackNumber(left, recordsBySourcePath?.get(left.sourcePath))
      - getLocalTrackNumber(right, recordsBySourcePath?.get(right.sourcePath))
    ))
    .map(source => ({ ...source, sourceDirectory }))
}

export async function readConcatenateAlbumSources(
  options: OrganizeFilesOptions,
  normalized: NormalizedMetadataFixOptions,
  records: SetMetadataRecord[] | undefined,
): Promise<ConcatenateAlbumSources> {
  const requestedSourceDirs = assertConcatenateOptions(options, normalized)
  const sourceEntries = await Promise.all(requestedSourceDirs.map(async (sourceDir, sourceIndex) => {
    const filesResult = await getAudioFiles(sourceDir, {
      acceptAlbumArt: true,
      ignoreNonAudioFiles: options.ignoreNonAudioFiles === true,
    })

    return {
      albumArtFiles: filesResult.albumArtFiles,
      files: filesResult.files,
      sourceDirectory: filesResult.targetDirectory,
      sourceIndex,
    }
  }))
  await assertUniqueSourceDirs(sourceEntries)
  const recordsBySourcePath = records === undefined
    ? undefined
    : reconcileConcatenateSetMetadata(records, sourceEntries)

  const parsedByEntry = await Promise.all(sourceEntries.map(async (entry) => {
    const parsedSources = await parseAlbumSources(entry.sourceDirectory, entry.files.map(file => file.name))

    return {
      entry,
      sources: normalizeSourceTracks(entry.sourceDirectory, parsedSources, recordsBySourcePath),
    }
  }))
  const discsBySourcePath = new Map<string, ConcatenateDiscContext>()
  const sources: ParsedAlbumSource[] = []
  const discTotal = parsedByEntry.length

  for (const [sourceIndex, { sources: entrySources }] of parsedByEntry.entries()) {
    for (const source of entrySources) {
      discsBySourcePath.set(source.sourcePath, { discNumber: sourceIndex + 1, discTotal })
      sources.push(source)
    }
  }
  return { discsBySourcePath, recordsBySourcePath, sourceEntries, sources }
}
