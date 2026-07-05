import type { Command } from 'commander'
import { parseFile } from 'music-metadata'
import { copyFile, mkdir } from 'node:fs/promises'
import { dirname, extname, join, relative, resolve } from 'node:path'
import pLimit from 'p-limit'

import { getAudioFiles, parseLimit, pathExists } from '../command-utils.js'

interface OrganizeFilesRow {
  action: string
  album: string
  artist: string
  destination: string
  filename: string
  title: string
  trackNumber: string
}

interface PlannedCopy {
  destinationPath: string
  row: OrganizeFilesRow
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

export function registerOrganizeFilesCommand(program: Command): void {
  const organizeFilesCommand = program
    .command('organize-files')
    .description('Copy FLAC and MP3 files into ArtistName/AlbumName/TrackNumber - TrackName.ext')
    .requiredOption('--source-dir <sourceDir>', 'directory containing FLAC and MP3 files to organize')
    .requiredOption('--dest-dir <destDir>', 'directory to copy organized files into')
    .option('--limit <count>', 'maximum number of files to copy')
    .option('--execute', 'copy files')
    .action(async (options: { destDir: string, execute?: boolean, limit?: string, sourceDir: string }) => {
      const { files, targetDirectory: sourceDirectory } = await getAudioFiles(organizeFilesCommand, options.sourceDir)
      const destinationDirectory = resolve(options.destDir)
      const limit = parseLimit(organizeFilesCommand, options.limit)
      const filesToOrganize = limit === undefined ? files : files.slice(0, limit)
      const parseMetadata = pLimit(8)
      const plannedCopies = await Promise.all(
        filesToOrganize.map(file => parseMetadata(async (): Promise<PlannedCopy> => {
          const sourcePath = resolve(sourceDirectory, file.name)
          const metadata = await parseFile(sourcePath)
          const album = metadata.common.album ?? ''
          const artist = metadata.common.albumartist ?? metadata.common.artist ?? ''
          const title = metadata.common.title ?? ''
          const trackNumber = metadata.common.track.no
          const missingFields = [
            album === '' ? 'album' : undefined,
            artist === '' ? 'artist' : undefined,
            trackNumber === null ? 'track number' : undefined,
            title === '' ? 'title' : undefined,
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
            sanitizePathSegment(artist),
            sanitizePathSegment(album),
            `${formattedTrackNumber} - ${sanitizePathSegment(title)}${extname(file.name)}`,
          )

          return {
            destinationPath,
            row: {
              action: options.execute === true ? 'copied' : 'would copy',
              album,
              artist,
              destination: relative(destinationDirectory, destinationPath),
              filename: file.name,
              title,
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
      else {
        console.info('Dry run: no files were copied. Pass --execute to copy files.')
      }

      console.table(plannedCopies.map(plannedCopy => plannedCopy.row))
    })
}
