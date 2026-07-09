import type { Command } from 'commander'
import { parseFile } from 'music-metadata'
import { copyFile, mkdir } from 'node:fs/promises'
import { dirname, extname, join, relative, resolve } from 'node:path'
import pLimit from 'p-limit'

import { getAudioFiles, parseLimit, parseOutputFormat, pathExists, writeRows } from '../command-utils.js'

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

export type OrganizeFilesJsonOutput = OrganizeFilesJsonOutputRow[]

type ArtistFilenameStrategy = 'albumartist' | 'artist' | 'label' | 'producer'
type TitleFilenameStrategy = 'subtitle' | 'title'

interface PlannedCopy {
  destinationPath: string
  row: OrganizeFilesJsonOutputRow
  sourcePath: string
}

function sanitizePathSegment(value: string): string {
  const sanitizedCharacters = Array.from(value).map((character) => {
    if (character.charCodeAt(0) < 32 || '<>:"/\\|?*'.includes(character)) {
      return '-'
    }

    return character
  })

  return sanitizedCharacters
    .join('')
    .replaceAll(/\s+/g, ' ')
    .trim()
}

function formatTrackNumber(trackNumber: number): string {
  return trackNumber.toString().padStart(2, '0')
}

function formatMetadataValues(values: string[] | undefined): string {
  return values?.filter(value => value !== '').join('; ') ?? ''
}

function parseArtistFilenameStrategy(command: Command, value: string | undefined): ArtistFilenameStrategy {
  const artistFilenameStrategy = value ?? 'artist'

  if (artistFilenameStrategy !== 'albumartist' && artistFilenameStrategy !== 'artist' && artistFilenameStrategy !== 'label' && artistFilenameStrategy !== 'producer') {
    command.error('--artist-filename-strategy must be one of: artist, albumartist, label, producer')
  }

  return artistFilenameStrategy
}

function parseTitleFilenameStrategy(command: Command, value: string | undefined): TitleFilenameStrategy {
  const titleFilenameStrategy = value ?? 'title'

  if (titleFilenameStrategy !== 'subtitle' && titleFilenameStrategy !== 'title') {
    command.error('--title-filename-strategy must be one of: subtitle, title')
  }

  return titleFilenameStrategy
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

export function registerOrganizeFilesCommand(program: Command): void {
  const organizeFilesCommand = program
    .command('organize-files')
    .description('Copy FLAC and MP3 files into ArtistName/AlbumName/TrackNumber - Title.ext')
    .requiredOption('--source-dir <sourceDir>', 'directory containing FLAC and MP3 files to organize')
    .requiredOption('--dest-dir <destDir>', 'directory to copy organized files into')
    .option('--limit <count>', 'maximum number of files to copy')
    .option('--artist-filename-strategy <strategy>', 'metadata field to use for the artist portion of the filename: artist, albumartist, label, producer', 'artist')
    .option('--title-filename-strategy <strategy>', 'metadata field to use for the title portion of the filename: subtitle, title', 'title')
    .option('--execute', 'copy files')
    .option('--format <format>', 'output format: plaintext, json', 'plaintext')
    .action(async (options: { artistFilenameStrategy?: string, destDir: string, execute?: boolean, format?: string, limit?: string, sourceDir: string, titleFilenameStrategy?: string }) => {
      const limit = parseLimit(organizeFilesCommand, options.limit)
      const outputFormat = parseOutputFormat(organizeFilesCommand, options.format)
      const artistFilenameStrategy = parseArtistFilenameStrategy(organizeFilesCommand, options.artistFilenameStrategy)
      const titleFilenameStrategy = parseTitleFilenameStrategy(organizeFilesCommand, options.titleFilenameStrategy)
      const destinationDirectory = resolve(options.destDir)
      const { files, targetDirectory: sourceDirectory } = await getAudioFiles(organizeFilesCommand, options.sourceDir)
      const filesToOrganize = limit === undefined ? files : files.slice(0, limit)
      const parseMetadata = pLimit(16)
      const plannedCopies = await Promise.all(
        filesToOrganize.map(file => parseMetadata(async (): Promise<PlannedCopy> => {
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
          const missingFields = [
            album === '' ? 'album' : undefined,
            artistFilename === '' ? artistFilenameStrategy : undefined,
            trackNumber === null ? 'track number' : undefined,
            titleFilename === '' ? titleFilenameStrategy : undefined,
          ].filter((field): field is string => field !== undefined)

          if (missingFields.length > 0) {
            organizeFilesCommand.error(`${file.name} is missing required metadata: ${missingFields.join(', ')}`)
          }

          if (trackNumber === null) {
            organizeFilesCommand.error(`${file.name} is missing required metadata: track number`)
            throw new Error('unreachable')
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
      const duplicateDestinations = new Map<string, string[]>()

      for (const plannedCopy of plannedCopies) {
        const matchingFiles = duplicateDestinations.get(plannedCopy.destinationPath) ?? []

        matchingFiles.push(plannedCopy.row.filename)
        duplicateDestinations.set(plannedCopy.destinationPath, matchingFiles)
      }

      const duplicateDestinationEntries = [...duplicateDestinations.entries()].filter(([, filenames]) => filenames.length > 1)

      if (duplicateDestinationEntries.length > 0) {
        organizeFilesCommand.error(`Multiple files resolve to the same destination: ${duplicateDestinationEntries
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
        organizeFilesCommand.error(`Destination album directories already exist: ${conflictingAlbumDestinations
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
        organizeFilesCommand.error(`Destination files already exist: ${conflictingDestinations
          .map(destination => relative(destinationDirectory, destination.plannedCopy.destinationPath))
          .join(', ')}`)
      }

      if (options.execute === true) {
        for (const plannedCopy of plannedCopies) {
          await mkdir(dirname(plannedCopy.destinationPath), { recursive: true })
          await copyFile(plannedCopy.sourcePath, plannedCopy.destinationPath)
        }
      }

      const outputRows: OrganizeFilesJsonOutput = plannedCopies.map(plannedCopy => plannedCopy.row)

      writeRows(
        outputFormat,
        outputRows,
        options.execute === true ? undefined : 'Dry run: no files were copied. Pass --execute to copy files.',
      )
    })
}
