import type { Dirent } from 'node:fs'
import { join, relative } from 'node:path'

import { UserInputError } from '../errors.js'

import type { AlbumArtStrategy } from './metadata-fix-types.js'
import { sanitizePathSegment } from './organization-plan.js'
import type {
  OrganizeFilesAlbumArtJsonOutputRow,
  PlannedOrganizationCopy,
} from './organize-files-types.js'

export interface ArtSourceEntry {
  albumArtFiles: Dirent[]
  sourceDirectory: string
  sourceIndex: number
}

export type AlbumArtPlanItem
  = | { plan: PlannedOrganizationCopy, type: 'planned' }
    | { row: OrganizeFilesAlbumArtJsonOutputRow, type: 'excluded' }

interface PlannedArtCandidate {
  albumDestinationPath: string
  destinationPath: string
  filenameSortKey: string
  row: OrganizeFilesAlbumArtJsonOutputRow
  sourceIndex: number
  sourcePath: string
}

function toPlannedCopy(candidate: PlannedArtCandidate): PlannedOrganizationCopy {
  return {
    albumDestinationPath: candidate.albumDestinationPath,
    destinationExists: false,
    destinationPath: candidate.destinationPath,
    destinationStrategy: 'error',
    row: candidate.row,
    sourcePath: candidate.sourcePath,
  }
}

function selectCollisionIndex(length: number, strategy: AlbumArtStrategy): number | undefined {
  if (strategy === 'first') {
    return 0
  }
  if (strategy === 'last') {
    return length - 1
  }
  return undefined
}

function compareBasenames(left: string, right: string): number {
  const insensitive = left.toLowerCase().localeCompare(right.toLowerCase())

  if (insensitive !== 0 || left === right) {
    return insensitive
  }
  return left < right ? -1 : 1
}

export function planAlbumArtCopies(
  artSources: ArtSourceEntry[],
  destinationDirectory: string,
  audioPlans: PlannedOrganizationCopy[],
  albumArtStrategy: AlbumArtStrategy | undefined,
  execute: boolean,
): AlbumArtPlanItem[] {
  const albumDestinationPath = audioPlans[0]?.albumDestinationPath
  const includeSourceDirectory = artSources.length > 1
  const isConcatenate = artSources.length > 1

  if (albumDestinationPath === undefined) {
    return []
  }
  const candidates = artSources.flatMap(source => source.albumArtFiles.map((file): PlannedArtCandidate => {
    const destinationPath = join(albumDestinationPath, isConcatenate ? sanitizePathSegment(file.name) : file.name)

    return {
      albumDestinationPath,
      destinationPath,
      filenameSortKey: file.name,
      row: {
        action: execute ? 'copied' : 'would copy',
        destination: relative(destinationDirectory, destinationPath),
        fileType: 'albumArt',
        filename: file.name,
        ...(includeSourceDirectory ? { sourceDirectory: source.sourceDirectory } : {}),
      },
      sourceIndex: source.sourceIndex,
      sourcePath: join(source.sourceDirectory, file.name),
    }
  })).sort((left, right) => {
    const sourceIndexComparison = left.sourceIndex - right.sourceIndex

    return sourceIndexComparison !== 0 ? sourceIndexComparison : compareBasenames(left.filenameSortKey, right.filenameSortKey)
  })
  const grouped = new Map<string, PlannedArtCandidate[]>()

  for (const candidate of candidates) {
    grouped.set(candidate.destinationPath, [...(grouped.get(candidate.destinationPath) ?? []), candidate])
  }
  const collisions = [...grouped.entries()].filter(([, group]) => group.length > 1)

  if (collisions.length > 0 && albumArtStrategy === undefined) {
    throw new UserInputError(`Album art collisions require --album-art-strategy: ${collisions
      .map(([destinationPath, group]) => `${relative(destinationDirectory, destinationPath)} (${group
        .map(candidate => candidate.sourcePath)
        .join(', ')})`)
      .join('; ')}`)
  }
  return [...grouped.values()].flatMap((group) => {
    if (group.length === 1) {
      const candidate = group[0]

      if (candidate === undefined) {
        return []
      }
      return [{ plan: toPlannedCopy(candidate), type: 'planned' }]
    }
    const selectedIndex = albumArtStrategy === undefined ? undefined : selectCollisionIndex(group.length, albumArtStrategy)

    return group.map((candidate, index): AlbumArtPlanItem => {
      if (selectedIndex === index) {
        return { plan: toPlannedCopy(candidate), type: 'planned' }
      }
      return {
        row: {
          ...candidate.row,
          action: execute ? 'excluded' : 'would exclude',
        },
        type: 'excluded',
      }
    })
  })
}
