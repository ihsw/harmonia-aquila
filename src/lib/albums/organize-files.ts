import { parseFile } from 'music-metadata'
import { join, resolve } from 'node:path'
import pLimit from 'p-limit'

import { UserInputError } from '../errors.js'

import { getAudioFiles, parseLimit } from './audio-files.js'
import {
  formatDiscNumber,
  isMultiDiscSet,
  throwForDiscSetIssues,
} from './disc-metadata.js'
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
  type TitleFilenameStrategy,
} from './organization-plan.js'
import {
  assertOrganizationDestinationsAvailable,
  assertUniqueOrganizationDestinations,
  executeOrganizationCopies,
} from './organize-files-execution.js'

export interface OrganizeFilesJsonOutputRow {
  action: string
  album: string
  artistFilename: string
  artistFilenameStrategy: ArtistFilenameStrategy
  destination: string
  discNumber: string
  discTotal: string
  filename: string
  titleFilename: string
  titleFilenameStrategy: TitleFilenameStrategy
  trackNumber: string
}

export interface OrganizeFilesOptions {
  artistFilenameStrategy?: string
  destDir: string
  execute?: boolean
  ignoreAudioFilesWithoutTracks?: boolean
  ignoreNonAudioFiles?: boolean
  limit?: string
  sourceDir: string
  titleFilenameStrategy?: string
}

export type OrganizeFilesJsonOutput = OrganizeFilesJsonOutputRow[]

interface PlannedCopy {
  albumDestinationPath: string
  albumDirectory: string
  artistDirectory: string
  destinationPath: string
  row: OrganizeFilesJsonOutputRow
  sourcePath: string
}

interface ParsedCopy {
  album: string
  albumDirectory: string
  artistDirectory: string
  artistFilename: string
  discNumber: number | null
  discTotal: number | null
  filename: string
  sourcePath: string
  titleFilename: string
  trackNumber: number
}

export async function organizeAlbumFiles(options: OrganizeFilesOptions): Promise<OrganizeFilesJsonOutput> {
  const limit = parseLimit(options.limit)
  const artistFilenameStrategy = parseArtistFilenameStrategy(options.artistFilenameStrategy)
  const titleFilenameStrategy = parseTitleFilenameStrategy(options.titleFilenameStrategy)
  const destinationDirectory = resolve(options.destDir)
  const { files, targetDirectory: sourceDirectory } = await getAudioFiles(
    options.sourceDir,
    { ignoreNonAudioFiles: options.ignoreNonAudioFiles === true },
  )
  const filesToOrganize = limit === undefined ? files : files.slice(0, limit)
  const parseMetadata = pLimit(16)
  const parsedCopiesOrSkipped = await Promise.all(
    filesToOrganize.map(file => parseMetadata(async (): Promise<ParsedCopy | undefined> => {
      const sourcePath = resolve(sourceDirectory, file.name)
      const metadata = await parseFile(sourcePath)
      const album = metadata.common.album ?? ''
      const albumartist = metadata.common.albumartist ?? ''
      const artist = metadata.common.artist ?? ''
      const label = metadata.common.label ?? []
      const producer = metadata.common.producer ?? []
      const artistFilename = getArtistFilename(artistFilenameStrategy, artist, albumartist, label, producer)
      const title = metadata.common.title ?? ''
      const subtitle = metadata.common.subtitle?.[0] ?? ''
      const titleFilename = titleFilenameStrategy === 'subtitle' ? subtitle : title
      const trackNumber = metadata.common.track.no
      const discNumber = metadata.common.disk.no
      const discTotal = metadata.common.disk.of

      if (trackNumber === null && options.ignoreAudioFilesWithoutTracks === true) {
        return undefined
      }

      const missingFields = [
        album === '' ? 'album' : undefined,
        artistFilename === '' ? artistFilenameStrategy : undefined,
        trackNumber === null ? 'track number' : undefined,
        titleFilename === '' ? titleFilenameStrategy : undefined,
      ].filter((field): field is string => field !== undefined)

      if (missingFields.length > 0) {
        throw new UserInputError(`${file.name} is missing required metadata: ${missingFields.join(', ')}`)
      }

      if (trackNumber === null) {
        throw new UserInputError(`${file.name} is missing required metadata: track number`)
      }

      return {
        album,
        albumDirectory: sanitizePathSegment(album),
        artistDirectory: sanitizePathSegment(artistFilename),
        artistFilename,
        discNumber,
        discTotal,
        filename: file.name,
        sourcePath,
        titleFilename,
        trackNumber,
      }
    })),
  )
  const parsedCopies = parsedCopiesOrSkipped.filter((copy): copy is ParsedCopy => copy !== undefined)
  const discRecords = parsedCopies.map(copy => ({
    discNumber: copy.discNumber,
    discTotal: copy.discTotal,
    filename: copy.filename,
    trackNumber: copy.trackNumber,
  }))

  throwForDiscSetIssues(discRecords)
  const multiDisc = isMultiDiscSet(discRecords)
  const plannedCopies: PlannedCopy[] = parsedCopies.map((copy) => {
    const destination = getAlbumDestination(
      copy.artistFilename,
      copy.album,
      copy.trackNumber,
      copy.titleFilename,
      copy.filename,
      { discNumber: copy.discNumber, multiDisc },
    )

    return {
      albumDestinationPath: join(destinationDirectory, copy.artistDirectory, copy.albumDirectory),
      albumDirectory: copy.albumDirectory,
      artistDirectory: copy.artistDirectory,
      destinationPath: join(destinationDirectory, destination),
      row: {
        action: options.execute === true ? 'copied' : 'would copy',
        album: copy.album,
        artistFilename: copy.artistFilename,
        artistFilenameStrategy,
        destination,
        discNumber: formatDiscNumber(copy.discNumber),
        discTotal: formatDiscNumber(copy.discTotal),
        filename: copy.filename,
        titleFilename: copy.titleFilename,
        titleFilenameStrategy,
        trackNumber: formatTrackNumber(copy.trackNumber),
      },
      sourcePath: copy.sourcePath,
    }
  })

  assertUniqueOrganizationDestinations(plannedCopies, destinationDirectory)
  assertSingleAlbumDirectory(plannedCopies)
  assertSingleArtistPerAlbumDirectory(plannedCopies)
  await assertOrganizationDestinationsAvailable(plannedCopies, destinationDirectory)

  if (options.execute === true) {
    await executeOrganizationCopies(plannedCopies)
  }

  return plannedCopies.map(plannedCopy => plannedCopy.row)
}
