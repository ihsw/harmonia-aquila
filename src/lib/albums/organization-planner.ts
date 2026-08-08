import { join } from 'node:path'

import { UserInputError } from '../errors.js'

import { throwForDiscSetIssues } from './disc-metadata-error.js'
import { formatDiscNumber, isMultiDiscSet } from './disc-metadata.js'
import type { PlannedMetadataFix } from './metadata-fix-types.js'
import {
  type ArtistFilenameStrategy,
  assertSingleAlbumDirectory,
  assertSingleArtistPerAlbumDirectory,
  formatTrackNumber,
  getAlbumDestination,
  getArtistFilename,
  parseArtistFilenameStrategy,
  parseTitleFilenameStrategy,
  sanitizePathSegment,
} from './organization-plan.js'
import type {
  OrganizeFilesOptions,
  PlannedOrganizationCopy,
} from './organize-files-types.js'

function albumDestinationKey(fix: PlannedMetadataFix, artistStrategy: ArtistFilenameStrategy): string {
  const artistFilename = getArtistFilename(
    artistStrategy,
    fix.effective.artist,
    fix.effective.albumArtist,
    fix.source.labels,
    fix.effective.producers,
  )

  return join(sanitizePathSegment(artistFilename), sanitizePathSegment(fix.effective.album))
}

function groupFixesByAlbum(
  fixes: PlannedMetadataFix[],
  artistStrategy: ArtistFilenameStrategy,
  allowMultipleAlbums: boolean,
): PlannedMetadataFix[][] {
  if (!allowMultipleAlbums) {
    return [fixes]
  }
  const groups = new Map<string, PlannedMetadataFix[]>()

  for (const fix of fixes) {
    const key = albumDestinationKey(fix, artistStrategy)

    groups.set(key, [...(groups.get(key) ?? []), fix])
  }
  return [...groups.values()]
}

function resolveMultiDiscByFix(
  selectedFixes: PlannedMetadataFix[],
  artistStrategy: ArtistFilenameStrategy,
  allowMultipleAlbums: boolean,
): Map<PlannedMetadataFix, boolean> {
  const multiDiscByFix = new Map<PlannedMetadataFix, boolean>()

  for (const group of groupFixesByAlbum(selectedFixes, artistStrategy, allowMultipleAlbums)) {
    const discRecords = group.map(({ effective, source }) => ({
      discNumber: effective.discNumber,
      discTotal: effective.discTotal,
      filename: source.filename,
      trackNumber: effective.trackNumber,
    }))

    throwForDiscSetIssues(discRecords)
    const multiDisc = isMultiDiscSet(discRecords)

    for (const fix of group) {
      multiDiscByFix.set(fix, multiDisc)
    }
  }
  return multiDiscByFix
}

export function planOrganizationCopies(
  fixes: PlannedMetadataFix[],
  options: OrganizeFilesOptions,
  destinationDirectory: string,
): PlannedOrganizationCopy[] {
  const artistStrategy = parseArtistFilenameStrategy(options.artistFilenameStrategy)
  const titleStrategy = parseTitleFilenameStrategy(options.titleFilenameStrategy)
  const allowMultipleAlbums = options.allowMultipleAlbums === true
  const selectedFixes = fixes.filter((fix) => {
    return !(fix.effective.trackNumber === null && options.ignoreAudioFilesWithoutTracks === true)
  })
  const multiDiscByFix = resolveMultiDiscByFix(selectedFixes, artistStrategy, allowMultipleAlbums)
  const planned = selectedFixes.map((fix): PlannedOrganizationCopy => {
    const multiDisc = multiDiscByFix.get(fix) ?? false
    const { effective, source } = fix
    const artistFilename = getArtistFilename(
      artistStrategy,
      effective.artist,
      effective.albumArtist,
      source.labels,
      effective.producers,
    )
    const titleFilename = titleStrategy === 'subtitle' ? source.subtitle : effective.title
    const missingFields = [
      effective.album === '' ? 'album' : undefined,
      artistFilename === '' ? artistStrategy : undefined,
      effective.trackNumber === null ? 'track number' : undefined,
      titleFilename === '' ? titleStrategy : undefined,
    ].filter((field): field is string => field !== undefined)

    if (missingFields.length > 0) {
      throw new UserInputError(`${source.filename} is missing required metadata: ${missingFields.join(', ')}`)
    }
    if (effective.trackNumber === null) {
      throw new UserInputError(`${source.filename} is missing required metadata: track number`)
    }
    const destination = getAlbumDestination(
      artistFilename,
      effective.album,
      effective.trackNumber,
      titleFilename,
      source.filename,
      { discNumber: effective.discNumber, discTotal: effective.discTotal, multiDisc },
    )
    const albumDirectory = sanitizePathSegment(effective.album)
    const artistDirectory = sanitizePathSegment(artistFilename)

    return {
      albumDestinationPath: join(destinationDirectory, artistDirectory, albumDirectory),
      destinationExists: false,
      destinationPath: join(destinationDirectory, destination),
      destinationStrategy: 'error',
      row: {
        action: options.execute === true ? 'copied' : 'would copy',
        album: effective.album,
        artistFilename,
        artistFilenameStrategy: artistStrategy,
        destination,
        discNumber: formatDiscNumber(effective.discNumber),
        discTotal: formatDiscNumber(effective.discTotal),
        fileType: 'audio',
        filename: source.filename,
        ...(source.sourceDirectory === undefined ? {} : { sourceDirectory: source.sourceDirectory }),
        tagChanges: fix.row,
        titleFilename,
        titleFilenameStrategy: titleStrategy,
        trackNumber: formatTrackNumber(effective.trackNumber),
      },
      sourcePath: source.sourcePath,
      tagFix: fix.tagFix,
    }
  })

  const albumDirectories = planned.map((plan) => {
    if (plan.row.fileType !== 'audio') {
      throw new Error('Audio organization planner produced a non-audio row')
    }
    return {
      albumDirectory: sanitizePathSegment(plan.row.album),
      artistDirectory: sanitizePathSegment(plan.row.artistFilename),
    }
  })

  if (!allowMultipleAlbums) {
    assertSingleAlbumDirectory(albumDirectories)
    assertSingleArtistPerAlbumDirectory(albumDirectories)
  }
  return planned
}
