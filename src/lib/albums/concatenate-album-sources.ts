import type { Dirent } from 'node:fs'
import { realpath } from 'node:fs/promises'

import { UserInputError } from '../errors.js'

import { getAudioFiles } from './audio-files.js'
import { parseAlbumSources } from './metadata-fix-sources.js'
import type { NormalizedMetadataFixOptions, ParsedAlbumSource } from './metadata-fix-types.js'
import type { OrganizeFilesOptions } from './organize-files-types.js'

export interface ConcatenateSourceEntry {
  albumArtFiles: Dirent[]
  files: Dirent[]
  sourceDirectory: string
  sourceIndex: number
}

export interface ConcatenateAlbumSources {
  globalTracksBySourcePath: Map<string, number>
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
    normalized.setMetadata === undefined && normalized.setMetadataRecords === undefined ? undefined : '--set-metadata',
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

function getLocalTrackNumber(source: ParsedAlbumSource): number {
  if (source.trackNumber === null || !Number.isInteger(source.trackNumber) || source.trackNumber < 1) {
    throw new UserInputError(`${source.sourcePath} must have a positive integer track number for concatenation`)
  }
  return source.trackNumber
}

function normalizeSourceTracks(sourceDirectory: string, parsedSources: ParsedAlbumSource[]): ParsedAlbumSource[] {
  const countsByTrack = new Map<number, string[]>()

  for (const source of parsedSources) {
    const trackNumber = getLocalTrackNumber(source)
    countsByTrack.set(trackNumber, [...(countsByTrack.get(trackNumber) ?? []), source.filename])
  }
  const duplicates = [...countsByTrack.entries()]
    .filter(([, filenames]) => filenames.length > 1)
    .map(([trackNumber, filenames]) => `${String(trackNumber)} (${filenames.join(', ')})`)

  if (duplicates.length > 0) {
    throw new UserInputError(`Concatenate source "${sourceDirectory}" has duplicate track numbers: ${duplicates.join('; ')}`)
  }
  return [...parsedSources]
    .sort((left, right) => getLocalTrackNumber(left) - getLocalTrackNumber(right))
    .map(source => ({ ...source, sourceDirectory }))
}

export async function readConcatenateAlbumSources(
  options: OrganizeFilesOptions,
  normalized: NormalizedMetadataFixOptions,
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

  const parsedByEntry = await Promise.all(sourceEntries.map(async (entry) => {
    const parsedSources = await parseAlbumSources(entry.sourceDirectory, entry.files.map(file => file.name))

    return {
      entry,
      sources: normalizeSourceTracks(entry.sourceDirectory, parsedSources),
    }
  }))
  const globalTracksBySourcePath = new Map<string, number>()
  const sources: ParsedAlbumSource[] = []
  let globalTrackNumber = 1

  for (const { sources: entrySources } of parsedByEntry) {
    for (const source of entrySources) {
      globalTracksBySourcePath.set(source.sourcePath, globalTrackNumber)
      sources.push(source)
      globalTrackNumber += 1
    }
  }
  return { globalTracksBySourcePath, sourceEntries, sources }
}
