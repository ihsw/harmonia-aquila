import type { Command } from 'commander'
import { parseFile } from 'music-metadata'
import { copyFile, mkdir } from 'node:fs/promises'
import { dirname, relative, resolve } from 'node:path'
import pLimit from 'p-limit'

import { getMp3Files, parseLimit, pathExists } from '../command-utils.js'
import { writeMp3TagFix } from '../id3-tags.js'

interface FixTagsRow {
  action: string
  album: string
  albumartist: string
  artist: string
  destination: string
  filename: string
  grouping: string
  newAlbum: string
  newAlbumartist: string
  newTitle: string
  subtitle: string
  title: string
}

type DestinationStrategy = 'error' | 'ignore' | 'overwrite'

interface PlannedTagFix {
  destinationExists: boolean
  destinationPath: string
  hasChanges: boolean
  row: FixTagsRow
  sourcePath: string
  tagFix: {
    album: string
    title: string
  }
}

function createFixTagsError(message: string, cause: unknown): Error {
  return new Error(message, { cause })
}

function parseDestinationStrategy(command: Command, value: string | undefined): DestinationStrategy {
  const destinationStrategy = value ?? 'error'

  if (destinationStrategy !== 'error' && destinationStrategy !== 'ignore' && destinationStrategy !== 'overwrite') {
    command.error('--destination-strategy must be one of: error, ignore, overwrite')
  }

  return destinationStrategy
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
    .description('Replace MP3 album metadata with grouping, albumartist metadata with artist, and title metadata with subtitle')
    .requiredOption('--source-dir <sourceDir>', 'directory containing source MP3 files to copy and fix')
    .requiredOption('--dest-dir <destDir>', 'directory to copy fixed MP3 files into')
    .option('--limit <count>', 'maximum number of files to inspect')
    .option('--destination-strategy <strategy>', 'what to do when a destination file exists: error, ignore, overwrite', 'error')
    .option('--execute', 'copy files and write tag changes to destination files')
    .action(async (options: { destDir: string, destinationStrategy?: string, execute?: boolean, limit?: string, sourceDir: string }) => {
      const { files, targetDirectory: sourceDirectory } = await getMp3Files(fixTagsCommand, options.sourceDir)
      const destinationDirectory = resolve(options.destDir)
      const limit = parseLimit(fixTagsCommand, options.limit)
      const destinationStrategy = parseDestinationStrategy(fixTagsCommand, options.destinationStrategy)
      const filesToFix = limit === undefined ? files : files.slice(0, limit)
      const processMetadata = pLimit(16)
      const plannedTagFixes = await Promise.all(
        filesToFix.map(file => processMetadata(async (): Promise<PlannedTagFix> => {
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
          const albumartist = metadata.common.albumartist ?? ''
          const artist = metadata.common.artist ?? ''
          const grouping = metadata.common.grouping ?? ''
          const subtitle = metadata.common.subtitle?.[0] ?? ''
          const title = metadata.common.title ?? ''
          const hasChanges = album !== grouping || albumartist !== artist || title !== subtitle
          const destinationExists = await pathExists(destinationPath)
          const action = getAction(destinationStrategy, destinationExists, options.execute === true, hasChanges)

          return {
            destinationExists,
            destinationPath,
            hasChanges,
            row: {
              action,
              album,
              albumartist,
              artist,
              destination: relative(destinationDirectory, destinationPath),
              filename: file.name,
              grouping,
              newAlbum: grouping,
              newAlbumartist: artist,
              newTitle: subtitle,
              subtitle,
              title,
            },
            sourcePath,
            tagFix: {
              album: grouping,
              title: subtitle,
            },
          }
        })),
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
              writeMp3TagFix(plannedTagFix.destinationPath, plannedTagFix.tagFix)
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

      console.table(plannedTagFixes.map(plannedTagFix => plannedTagFix.row))
    })
}
