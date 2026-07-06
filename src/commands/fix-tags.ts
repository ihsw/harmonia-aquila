import type { Command } from 'commander'
import { parseFile } from 'music-metadata'
import { copyFile, mkdir } from 'node:fs/promises'
import { dirname, relative, resolve } from 'node:path'
import pLimit from 'p-limit'

import { writeAudioTagFix } from '../audio-tags.js'
import { getAudioFiles, parseLimit, pathExists } from '../command-utils.js'

interface FixTagsRow {
  action: string
  album: string
  albumartists?: string[]
  destination: string
  filename: string
  grouping: string
  newAlbum?: string
  newAlbumartists?: string[]
  newProducers?: string[]
  producers?: string[]
  title: string
  artist: string
}

type DestinationStrategy = 'error' | 'ignore' | 'overwrite'
type AlbumArtistsStrategy = 'aggregate' | 'blank' | 'no change'
type AlbumStrategy = 'grouping' | 'no change'
type ProducerStrategy = 'aggregate' | 'blank' | 'copy-from-album-artists' | 'no change'

interface ParsedTagFixSource {
  album: string
  albumArtists: string[]
  artists: string[]
  destinationPath: string
  filename: string
  grouping: string
  producers: string[]
  sourcePath: string
  title: string
  artist: string
}

interface PlannedTagFix {
  destinationExists: boolean
  destinationPath: string
  hasChanges: boolean
  row: FixTagsRow
  sourcePath: string
  tagFix: {
    album?: string
    albumArtists?: string[]
    producers?: string[]
  }
}

function createFixTagsError(message: string, cause: unknown): Error {
  return new Error(message, { cause })
}

function getMetadataArtists(artists: string[] | undefined, artist: string | undefined): string[] {
  return artists ?? (artist === undefined || artist === '' ? [] : [artist])
}

function areStringArraysEqual(left: string[], right: string[]): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index])
}

function uniqueSorted(values: string[]): string[] {
  return [...new Set(values)].sort((left, right) => left.localeCompare(right))
}

function parseDestinationStrategy(command: Command, value: string | undefined): DestinationStrategy {
  const destinationStrategy = value ?? 'error'

  if (destinationStrategy !== 'error' && destinationStrategy !== 'ignore' && destinationStrategy !== 'overwrite') {
    command.error('--destination-strategy must be one of: error, ignore, overwrite')
  }

  return destinationStrategy
}

function parseAlbumArtistsStrategy(command: Command, value: string | undefined): AlbumArtistsStrategy {
  const albumArtistsStrategy = value ?? 'no change'

  if (albumArtistsStrategy !== 'no change' && albumArtistsStrategy !== 'aggregate' && albumArtistsStrategy !== 'blank') {
    command.error('--album-artists-strategy must be one of: no change, aggregate, blank')
  }

  return albumArtistsStrategy
}

function parseAlbumStrategy(command: Command, value: string | undefined): AlbumStrategy {
  const albumStrategy = value ?? 'no change'

  if (albumStrategy !== 'no change' && albumStrategy !== 'grouping') {
    command.error('--album-strategy must be one of: no change, grouping')
  }

  return albumStrategy
}

function parseProducerStrategy(command: Command, value: string | undefined): ProducerStrategy {
  const producerStrategy = value ?? 'no change'

  if (producerStrategy !== 'no change' && producerStrategy !== 'blank' && producerStrategy !== 'aggregate' && producerStrategy !== 'copy-from-album-artists') {
    command.error('--producer-strategy must be one of: no change, blank, aggregate, copy-from-album-artists')
  }

  return producerStrategy
}

function getAction(destinationStrategy: DestinationStrategy, destinationExists: boolean, execute: boolean, hasChanges: boolean): string {
  if (destinationExists && destinationStrategy === 'ignore') {
    return execute ? 'ignored' : 'would ignore'
  }

  if (destinationExists && destinationStrategy === 'overwrite') {
    return execute
      ? hasChanges ? 'overwritten and updated' : 'overwritten'
      : hasChanges ? 'would overwrite and update' : 'would overwrite'
  }

  return execute
    ? hasChanges ? 'copied and updated' : 'copied'
    : hasChanges ? 'would copy and update' : 'would copy'
}

export function registerFixTagsCommand(program: Command): void {
  const fixTagsCommand = program
    .command('fix-tags')
    .description('Fix FLAC and MP3 album metadata')
    .requiredOption('--source-dir <sourceDir>', 'directory containing source FLAC and MP3 files to copy and fix')
    .requiredOption('--dest-dir <destDir>', 'directory to copy fixed FLAC and MP3 files into')
    .option('--limit <count>', 'maximum number of files to inspect')
    .option('--destination-strategy <strategy>', 'what to do when a destination file exists: error, ignore, overwrite', 'error')
    .option('--album-strategy <strategy>', 'how to update album: no change, grouping', 'no change')
    .option('--album-artists-strategy <strategy>', 'how to update albumartists: no change, aggregate, blank', 'no change')
    .option('--producer-strategy <strategy>', 'how to update producers: no change, blank, aggregate, copy-from-album-artists', 'no change')
    .option('--execute', 'copy files and write tag changes to destination files')
    .action(async (options: { albumArtistsStrategy?: string, albumStrategy?: string, destDir: string, destinationStrategy?: string, execute?: boolean, limit?: string, producerStrategy?: string, sourceDir: string }) => {
      const limit = parseLimit(fixTagsCommand, options.limit)
      const destinationStrategy = parseDestinationStrategy(fixTagsCommand, options.destinationStrategy)
      const albumStrategy = parseAlbumStrategy(fixTagsCommand, options.albumStrategy)
      const albumArtistsStrategy = parseAlbumArtistsStrategy(fixTagsCommand, options.albumArtistsStrategy)
      const producerStrategy = parseProducerStrategy(fixTagsCommand, options.producerStrategy)
      const { files, targetDirectory: sourceDirectory } = await getAudioFiles(fixTagsCommand, options.sourceDir)
      const destinationDirectory = resolve(options.destDir)
      const filesToFix = limit === undefined ? files : files.slice(0, limit)
      const processMetadata = pLimit(16)
      const parsedTagFixSources = await Promise.all(
        filesToFix.map(file => processMetadata(async (): Promise<ParsedTagFixSource> => {
          const sourcePath = resolve(sourceDirectory, file.name)
          const destinationPath = resolve(destinationDirectory, file.name)
          let metadata

          try {
            metadata = await parseFile(sourcePath)
          }
          catch (error) {
            throw createFixTagsError(
              `Failed to read metadata for fix-tags source "${sourcePath}" with destination "${destinationPath}"`,
              error,
            )
          }

          const album = metadata.common.album ?? ''
          const albumArtists = getMetadataArtists(metadata.common.albumartists, metadata.common.albumartist)
          const artists = getMetadataArtists(metadata.common.artists, metadata.common.artist)
          const grouping = metadata.common.grouping ?? ''
          const producers = metadata.common.producer ?? []
          const title = metadata.common.title ?? ''
          const artist = metadata.common.artist ?? ''

          return {
            album,
            albumArtists,
            artist,
            artists,
            destinationPath,
            filename: file.name,
            grouping,
            producers,
            sourcePath,
            title,
          }
        })),
      )
      const artistsByAlbum = new Map<string, string[]>()

      for (const parsedTagFixSource of parsedTagFixSources) {
        const albumArtists = artistsByAlbum.get(parsedTagFixSource.grouping) ?? []

        albumArtists.push(...parsedTagFixSource.artists)
        artistsByAlbum.set(parsedTagFixSource.grouping, albumArtists)
      }

      for (const [album, artists] of artistsByAlbum.entries()) {
        artistsByAlbum.set(album, uniqueSorted(artists))
      }

      const producersByAlbum = new Map<string, string[]>()

      for (const parsedTagFixSource of parsedTagFixSources) {
        const producers = producersByAlbum.get(parsedTagFixSource.grouping) ?? []

        producers.push(...parsedTagFixSource.producers)
        producersByAlbum.set(parsedTagFixSource.grouping, producers)
      }

      for (const [album, producers] of producersByAlbum.entries()) {
        producersByAlbum.set(album, uniqueSorted(producers))
      }

      const plannedTagFixes = await Promise.all(
        parsedTagFixSources.map(async (parsedTagFixSource): Promise<PlannedTagFix> => {
          const albumArtists = albumArtistsStrategy === 'aggregate'
            ? artistsByAlbum.get(parsedTagFixSource.grouping) ?? []
            : []
          const shouldUpdateAlbumArtists = albumArtistsStrategy !== 'no change'
          const shouldUpdateAlbum = albumStrategy !== 'no change'
          const producers = producerStrategy === 'aggregate'
            ? producersByAlbum.get(parsedTagFixSource.grouping) ?? []
            : producerStrategy === 'copy-from-album-artists'
              ? parsedTagFixSource.albumArtists
              : []
          const shouldUpdateProducers = producerStrategy !== 'no change'
          const album = albumStrategy === 'grouping' ? parsedTagFixSource.grouping : undefined
          const hasAlbumArtistsChanges = shouldUpdateAlbumArtists && !areStringArraysEqual(parsedTagFixSource.albumArtists, albumArtists)
          const hasAlbumChanges = shouldUpdateAlbum && parsedTagFixSource.album !== parsedTagFixSource.grouping
          const hasProducerChanges = shouldUpdateProducers && !areStringArraysEqual(parsedTagFixSource.producers, producers)
          const hasChanges = hasAlbumChanges || hasAlbumArtistsChanges || hasProducerChanges
          const destinationExists = await pathExists(parsedTagFixSource.destinationPath)
          const action = getAction(destinationStrategy, destinationExists, options.execute === true, hasChanges)
          const tagFix = {
            ...(album === undefined ? {} : { album }),
            ...(shouldUpdateAlbumArtists ? { albumArtists } : {}),
            ...(shouldUpdateProducers ? { producers } : {}),
          }

          return {
            destinationExists,
            destinationPath: parsedTagFixSource.destinationPath,
            hasChanges,
            row: {
              action,
              album: parsedTagFixSource.album,
              albumartists: parsedTagFixSource.albumArtists,
              artist: parsedTagFixSource.artist,
              destination: relative(destinationDirectory, parsedTagFixSource.destinationPath),
              filename: parsedTagFixSource.filename,
              grouping: parsedTagFixSource.grouping,
              title: parsedTagFixSource.title,
              ...(shouldUpdateAlbum ? { newAlbum: parsedTagFixSource.grouping } : {}),
              ...(shouldUpdateAlbumArtists
                ? {
                    albumartists: parsedTagFixSource.albumArtists,
                    newAlbumartists: albumArtists,
                  }
                : {}),
              ...(shouldUpdateProducers
                ? {
                    newProducers: producers,
                    producers: parsedTagFixSource.producers,
                  }
                : {}),
            },
            sourcePath: parsedTagFixSource.sourcePath,
            tagFix,
          }
        }),
      )
      const conflictingDestinations = plannedTagFixes.filter(plannedTagFix => plannedTagFix.destinationExists)

      if (destinationStrategy === 'error' && conflictingDestinations.length > 0) {
        fixTagsCommand.error(`Destination files already exist: ${conflictingDestinations
          .map(plannedTagFix => relative(destinationDirectory, plannedTagFix.destinationPath))
          .join(', ')}`)
      }

      if (options.execute === true) {
        for (const plannedTagFix of plannedTagFixes) {
          if (plannedTagFix.destinationExists && destinationStrategy === 'ignore') {
            continue
          }

          try {
            await mkdir(dirname(plannedTagFix.destinationPath), { recursive: true })
            await copyFile(plannedTagFix.sourcePath, plannedTagFix.destinationPath)

            if (plannedTagFix.hasChanges) {
              writeAudioTagFix(plannedTagFix.destinationPath, plannedTagFix.tagFix)
            }
          }
          catch (error) {
            throw createFixTagsError(
              `Failed to copy/fix tags for source "${plannedTagFix.sourcePath}" to destination "${plannedTagFix.destinationPath}" with metadata ${JSON.stringify(plannedTagFix.tagFix)}`,
              error,
            )
          }
        }
      }
      else {
        console.info('Dry run: no files were copied or changed. Pass --execute to copy and write updates.')
      }

      console.table(plannedTagFixes.map((plannedTagFix) => {
        const row = {
          album: plannedTagFix.row.album,
          artist: plannedTagFix.row.artist,
          title: plannedTagFix.row.title,
          ...(albumStrategy !== 'no change' ? { newAlbum: plannedTagFix.row.newAlbum } : {}),
        }

        if (albumArtistsStrategy !== 'no change') {
          Object.assign(row, {
            ...row,
            albumartists: plannedTagFix.row.albumartists,
            newAlbumartists: plannedTagFix.row.newAlbumartists,
          })
        }

        if (producerStrategy !== 'no change') {
          return {
            ...row,
            newProducers: plannedTagFix.row.newProducers,
            producers: plannedTagFix.row.producers,
          }
        }

        return row
      }))
    })
}
