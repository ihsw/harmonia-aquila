#!/usr/bin/env node

import { type Command, program } from 'commander'
import { parseFile } from 'music-metadata'
import { mkdir, readdir, rename, stat } from 'node:fs/promises'
import { dirname, extname, join, relative, resolve } from 'node:path'
import pLimit from 'p-limit'

import { writeMp3TagFix } from './id3-tags.js'

interface Mp3MetadataRow {
  album: string
  grouping: string
  artist: string
  albumartist: string
  bitrate: string
  duration: string
  filename: string
  sampleRate: string
  title: string
  year: number | string
  subtitle: string
}

interface FixTagsRow {
  action: string
  album: string
  albumartist: string
  artist: string
  filename: string
  grouping: string
  newAlbum: string
  newAlbumartist: string
  newTitle: string
  subtitle: string
  title: string
}

interface OrganizeFilesRow {
  album: string
  artist: string
  destination: string
  filename: string
  title: string
  trackNumber: string
}

interface PlannedMove {
  destinationPath: string
  row: OrganizeFilesRow
  sourcePath: string
}

function formatMp3Duration(durationInSeconds: number | undefined): string {
  if (durationInSeconds === undefined) {
    return ''
  }

  const totalSeconds = Math.round(durationInSeconds)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  const formattedMinutes = minutes.toString()
  const paddedSeconds = seconds.toString().padStart(2, '0')

  if (hours > 0) {
    const formattedHours = hours.toString()
    const paddedMinutes = minutes.toString().padStart(2, '0')

    return `${formattedHours}:${paddedMinutes}:${paddedSeconds}`
  }

  return `${formattedMinutes}:${paddedSeconds}`
}

function formatMp3Bitrate(bitrateInBitsPerSecond: number | undefined): string {
  if (bitrateInBitsPerSecond === undefined) {
    return ''
  }

  const bitrateInKilobitsPerSecond = bitrateInBitsPerSecond / 1000

  return `${new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 1,
  }).format(bitrateInKilobitsPerSecond)} kbps`
}

function formatMp3SampleRate(sampleRateInHertz: number | undefined): string {
  if (sampleRateInHertz === undefined) {
    return ''
  }

  const sampleRateInKilohertz = sampleRateInHertz / 1000

  return `${new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 1,
  }).format(sampleRateInKilohertz)} kHz`
}

async function getMp3Files(command: Command, dirName: string) {
  const targetDirectory = resolve(dirName)
  const directoryStats = await stat(targetDirectory)

  if (!directoryStats.isDirectory()) {
    command.error(`"${dirName}" is not a directory`)
  }

  const files = await readdir(targetDirectory, { withFileTypes: true })
  const invalidFiles = files.filter(
    file => !file.isFile() || !file.name.toLowerCase().endsWith('.mp3'),
  )

  if (invalidFiles.length > 0) {
    command.error(
      `"${dirName}" must contain only MP3 files. Invalid entries: ${invalidFiles
        .map(file => file.name)
        .join(', ')}`,
    )
  }

  return {
    files,
    targetDirectory,
  }
}

function parseLimit(command: Command, limitOption: string | undefined): number | undefined {
  const limit = limitOption === undefined ? undefined : Number(limitOption)

  if (limit !== undefined && (!Number.isInteger(limit) || limit < 0)) {
    command.error('--limit must be a non-negative integer')
  }

  return limit
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

async function pathExists(path: string): Promise<boolean> {
  try {
    await stat(path)

    return true
  }
  catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
      return false
    }

    throw error
  }
}

program
  .name('harmonia-aquila')
  .description('Analyze local music files')

const summarizeSourceDirCommand = program
  .command('summarize-source-dir')
  .description('List MP3 files and metadata in a source directory')
  .requiredOption('--dir-name <dirName>', 'directory to list')
  .option('--limit <count>', 'maximum number of files to list')
  .action(async (options: { dirName: string, limit?: string }) => {
    const { files, targetDirectory } = await getMp3Files(summarizeSourceDirCommand, options.dirName)
    const limit = parseLimit(summarizeSourceDirCommand, options.limit)
    const filesToSummarize = limit === undefined ? files : files.slice(0, limit)
    const parseMetadata = pLimit(16)
    const metadataRows = await Promise.all(
      filesToSummarize.map(file => parseMetadata(async (): Promise<Mp3MetadataRow> => {
        const metadata = await parseFile(resolve(targetDirectory, file.name))

        return {
          album: metadata.common.album ?? '',
          albumartist: metadata.common.albumartist ?? '',
          artist: metadata.common.artist ?? '',
          bitrate: formatMp3Bitrate(metadata.format.bitrate),
          duration: formatMp3Duration(metadata.format.duration),
          filename: file.name,
          grouping: metadata.common.grouping ?? '',
          sampleRate: formatMp3SampleRate(metadata.format.sampleRate),
          subtitle: metadata.common.subtitle?.[0] ?? '',
          title: metadata.common.title ?? '',
          year: metadata.common.year ?? '',
        }
      })),
    )

    console.table(metadataRows)
  })

const fixTagsCommand = program
  .command('fix-tags')
  .description('Replace MP3 album metadata with grouping, albumartist metadata with artist, and title metadata with subtitle')
  .requiredOption('--dir-name <dirName>', 'directory containing MP3 files to fix')
  .option('--limit <count>', 'maximum number of files to inspect')
  .option('--execute', 'write tag changes to files')
  .action(async (options: { dirName: string, execute?: boolean, limit?: string }) => {
    const { files, targetDirectory } = await getMp3Files(fixTagsCommand, options.dirName)
    const limit = parseLimit(fixTagsCommand, options.limit)
    const filesToFix = limit === undefined ? files : files.slice(0, limit)
    const processMetadata = pLimit(8)
    const metadataRows = await Promise.all(
      filesToFix.map(file => processMetadata(async (): Promise<FixTagsRow> => {
        const filePath = resolve(targetDirectory, file.name)
        const metadata = await parseFile(filePath)
        const album = metadata.common.album ?? ''
        const albumartist = metadata.common.albumartist ?? ''
        const artist = metadata.common.artist ?? ''
        const grouping = metadata.common.grouping ?? ''
        const subtitle = metadata.common.subtitle?.[0] ?? ''
        const title = metadata.common.title ?? ''
        const hasChanges = album !== grouping || albumartist !== artist || title !== subtitle

        if (options.execute === true && hasChanges) {
          writeMp3TagFix(filePath, {
            album: grouping,
            albumartist: artist,
            title: subtitle,
          })
        }

        return {
          action: hasChanges ? options.execute === true ? 'updated' : 'would update' : 'unchanged',
          album,
          albumartist,
          artist,
          filename: file.name,
          grouping,
          newAlbum: grouping,
          newAlbumartist: artist,
          newTitle: subtitle,
          subtitle,
          title,
        }
      })),
    )

    if (options.execute !== true) {
      console.info('Dry run: no files were changed. Pass --execute to write updates.')
    }

    console.table(metadataRows)
  })

const organizeFilesCommand = program
  .command('organize-files')
  .description('Move MP3 files into ArtistName/AlbumName/TrackNumber - TrackName.ext')
  .requiredOption('--source-dir <sourceDir>', 'directory containing MP3 files to organize')
  .requiredOption('--dest-dir <destDir>', 'directory to move organized files into')
  .option('--limit <count>', 'maximum number of files to move')
  .action(async (options: { destDir: string, limit?: string, sourceDir: string }) => {
    const { files, targetDirectory: sourceDirectory } = await getMp3Files(organizeFilesCommand, options.sourceDir)
    const destinationDirectory = resolve(options.destDir)
    const limit = parseLimit(organizeFilesCommand, options.limit)
    const filesToOrganize = limit === undefined ? files : files.slice(0, limit)
    const parseMetadata = pLimit(8)
    const plannedMoves = await Promise.all(
      filesToOrganize.map(file => parseMetadata(async (): Promise<PlannedMove> => {
        const sourcePath = resolve(sourceDirectory, file.name)
        const metadata = await parseFile(sourcePath)
        const album = metadata.common.album ?? ''
        const artist = metadata.common.artist ?? ''
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

    for (const plannedMove of plannedMoves) {
      const matchingFiles = duplicateDestinations.get(plannedMove.destinationPath) ?? []

      matchingFiles.push(plannedMove.row.filename)
      duplicateDestinations.set(plannedMove.destinationPath, matchingFiles)
    }

    const duplicateDestinationEntries = [...duplicateDestinations.entries()].filter(([, filenames]) => filenames.length > 1)

    if (duplicateDestinationEntries.length > 0) {
      organizeFilesCommand.error(`Multiple files resolve to the same destination: ${duplicateDestinationEntries
        .map(([destinationPath, filenames]) => `${relative(destinationDirectory, destinationPath)} (${filenames.join(', ')})`)
        .join('; ')}`)
    }

    const existingDestinations = await Promise.all(
      plannedMoves.map(async plannedMove => ({
        exists: await pathExists(plannedMove.destinationPath),
        plannedMove,
      })),
    )
    const conflictingDestinations = existingDestinations.filter(destination => destination.exists)

    if (conflictingDestinations.length > 0) {
      organizeFilesCommand.error(`Destination files already exist: ${conflictingDestinations
        .map(destination => relative(destinationDirectory, destination.plannedMove.destinationPath))
        .join(', ')}`)
    }

    for (const plannedMove of plannedMoves) {
      await mkdir(dirname(plannedMove.destinationPath), { recursive: true })
      await rename(plannedMove.sourcePath, plannedMove.destinationPath)
    }

    console.table(plannedMoves.map(plannedMove => plannedMove.row))
  })

await program.parseAsync()
