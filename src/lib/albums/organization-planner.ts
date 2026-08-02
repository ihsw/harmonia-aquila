import { join } from 'node:path'

import { UserInputError } from '../errors.js'

import { formatDiscNumber, isMultiDiscSet, throwForDiscSetIssues } from './disc-metadata.js'
import type { PlannedMetadataFix } from './metadata-fix-types.js'
import {
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

export function planOrganizationCopies(
  fixes: PlannedMetadataFix[],
  options: OrganizeFilesOptions,
  destinationDirectory: string,
): PlannedOrganizationCopy[] {
  const artistStrategy = parseArtistFilenameStrategy(options.artistFilenameStrategy)
  const titleStrategy = parseTitleFilenameStrategy(options.titleFilenameStrategy)
  const selectedFixes = fixes.filter((fix) => {
    return !(fix.effective.trackNumber === null && options.ignoreAudioFilesWithoutTracks === true)
  })
  const discRecords = selectedFixes.map(({ effective, source }) => ({
    discNumber: effective.discNumber,
    discTotal: effective.discTotal,
    filename: source.filename,
    trackNumber: effective.trackNumber,
  }))

  throwForDiscSetIssues(discRecords)
  const multiDisc = isMultiDiscSet(discRecords)
  const planned = selectedFixes.map((fix): PlannedOrganizationCopy => {
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
      { discNumber: effective.discNumber, multiDisc },
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
        filename: source.filename,
        tagChanges: fix.row,
        titleFilename,
        titleFilenameStrategy: titleStrategy,
        trackNumber: formatTrackNumber(effective.trackNumber),
      },
      sourcePath: source.sourcePath,
      tagFix: fix.tagFix,
    }
  })

  assertSingleAlbumDirectory(planned.map(plan => ({
    albumDirectory: sanitizePathSegment(plan.row.album),
    artistDirectory: sanitizePathSegment(plan.row.artistFilename),
  })))
  assertSingleArtistPerAlbumDirectory(planned.map(plan => ({
    albumDirectory: sanitizePathSegment(plan.row.album),
    artistDirectory: sanitizePathSegment(plan.row.artistFilename),
  })))
  return planned
}
