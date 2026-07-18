import { parseFile } from 'music-metadata'
import { copyFile, mkdir } from 'node:fs/promises'
import { dirname, extname, join, relative, resolve } from 'node:path'
import pLimit from 'p-limit'

import { pathExists } from '../../command-utils.js'
import { UserInputError } from '../errors.js'

import { getAudioFiles, parseLimit } from './audio-files.js'

export interface OrganizeFilesJsonOutputRow {
  action: string
  album: string
  artistFilename: string
  artistFilenameStrategy: ArtistFilenameStrategy
  destination: string
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

type ArtistFilenameStrategy = 'albumartist' | 'artist' | 'label' | 'producer'
type TitleFilenameStrategy = 'subtitle' | 'title'

interface PlannedCopy {
  destinationPath: string
  row: OrganizeFilesJsonOutputRow
  sourcePath: string
}

function sanitizePathSegment(value: string): string {
  return Array.from(value).map((character) => {
    if (character.charCodeAt(0) < 32 || '<>:"/\\|?*'.includes(character)) {
      return '-'
    }

    return character
  }).join('').replaceAll(/\s+/g, ' ').trim()
}

function formatTrackNumber(trackNumber: number): string {
  return trackNumber.toString().padStart(2, '0')
}

function formatMetadataValues(values: string[] | undefined): string {
  return values?.filter(value => value !== '').join('; ') ?? ''
}

function parseArtistFilenameStrategy(value: string | undefined): ArtistFilenameStrategy {
  const strategy = value ?? 'artist'

  if (strategy !== 'albumartist' && strategy !== 'artist' && strategy !== 'label' && strategy !== 'producer') {
    throw new UserInputError('--artist-filename-strategy must be one of: artist, albumartist, label, producer')
  }

  return strategy
}

function parseTitleFilenameStrategy(value: string | undefined): TitleFilenameStrategy {
  const strategy = value ?? 'title'

  if (strategy !== 'subtitle' && strategy !== 'title') {
    throw new UserInputError('--title-filename-strategy must be one of: subtitle, title')
  }

  return strategy
}

function getArtistFilename(strategy: ArtistFilenameStrategy, artist: string, albumartist: string, label: string[], producer: string[]): string {
  if (strategy === 'albumartist') {
    return albumartist
  }

  if (strategy === 'label') {
    return formatMetadataValues(label)
  }

  if (strategy === 'producer') {
    return formatMetadataValues(producer)
  }

  return artist
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
  const plannedCopiesOrSkipped = await Promise.all(
    filesToOrganize.map(file => parseMetadata(async (): Promise<PlannedCopy | undefined> => {
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

      const formattedTrackNumber = formatTrackNumber(trackNumber)
      const destinationPath = join(
        destinationDirectory,
        sanitizePathSegment(artistFilename),
        sanitizePathSegment(album),
        `${formattedTrackNumber} - ${sanitizePathSegment(titleFilename)}${extname(file.name)}`,
      )

      return {
        destinationPath,
        row: {
          action: options.execute === true ? 'copied' : 'would copy',
          album,
          artistFilename,
          artistFilenameStrategy,
          destination: relative(destinationDirectory, destinationPath),
          filename: file.name,
          titleFilename,
          titleFilenameStrategy,
          trackNumber: formattedTrackNumber,
        },
        sourcePath,
      }
    })),
  )
  const plannedCopies = plannedCopiesOrSkipped.filter((plannedCopy): plannedCopy is PlannedCopy => plannedCopy !== undefined)
  const duplicateDestinations = new Map<string, string[]>()

  for (const plannedCopy of plannedCopies) {
    const matchingFiles = duplicateDestinations.get(plannedCopy.destinationPath) ?? []

    matchingFiles.push(plannedCopy.row.filename)
    duplicateDestinations.set(plannedCopy.destinationPath, matchingFiles)
  }

  const duplicateDestinationEntries = [...duplicateDestinations.entries()].filter(([, filenames]) => filenames.length > 1)

  if (duplicateDestinationEntries.length > 0) {
    throw new UserInputError(`Multiple files resolve to the same destination: ${duplicateDestinationEntries
      .map(([destinationPath, filenames]) => `${relative(destinationDirectory, destinationPath)} (${filenames.join(', ')})`)
      .join('; ')}`)
  }

  const albumDestinationPaths = [...new Set(plannedCopies.map(plannedCopy => dirname(plannedCopy.destinationPath)))]
  const existingAlbumDestinations = await Promise.all(
    albumDestinationPaths.map(async albumDestinationPath => ({
      albumDestinationPath,
      exists: await pathExists(albumDestinationPath),
    })),
  )
  const conflictingAlbumDestinations = existingAlbumDestinations.filter(destination => destination.exists)

  if (conflictingAlbumDestinations.length > 0) {
    throw new UserInputError(`Destination album directories already exist: ${conflictingAlbumDestinations
      .map(destination => relative(destinationDirectory, destination.albumDestinationPath))
      .join(', ')}`)
  }

  const existingDestinations = await Promise.all(
    plannedCopies.map(async plannedCopy => ({
      exists: await pathExists(plannedCopy.destinationPath),
      plannedCopy,
    })),
  )
  const conflictingDestinations = existingDestinations.filter(destination => destination.exists)

  if (conflictingDestinations.length > 0) {
    throw new UserInputError(`Destination files already exist: ${conflictingDestinations
      .map(destination => relative(destinationDirectory, destination.plannedCopy.destinationPath))
      .join(', ')}`)
  }

  if (options.execute === true) {
    for (const plannedCopy of plannedCopies) {
      await mkdir(dirname(plannedCopy.destinationPath), { recursive: true })
      await copyFile(plannedCopy.sourcePath, plannedCopy.destinationPath)
    }
  }

  return plannedCopies.map(plannedCopy => plannedCopy.row)
}
