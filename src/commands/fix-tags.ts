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

interface PlannedTagFix {
  destinationPath: string
  hasChanges: boolean
  row: FixTagsRow
  sourcePath: string
  tagFix: {
    album: string
    albumartist: string
    title: string
  }
}

function createFixTagsError(message: string, cause: unknown): Error {
  return new Error(message, { cause })
}

export function registerFixTagsCommand(program: Command): void {
  const fixTagsCommand = program
    .command('fix-tags')
    .description('Replace MP3 album metadata with grouping, albumartist metadata with artist, and title metadata with subtitle')
    .requiredOption('--source-dir <sourceDir>', 'directory containing source MP3 files to copy and fix')
    .requiredOption('--dest-dir <destDir>', 'directory to copy fixed MP3 files into')
    .option('--limit <count>', 'maximum number of files to inspect')
    .option('--execute', 'copy files and write tag changes to destination files')
    .action(async (options: { destDir: string, execute?: boolean, limit?: string, sourceDir: string }) => {
      const { files, targetDirectory: sourceDirectory } = await getMp3Files(fixTagsCommand, options.sourceDir)
      const destinationDirectory = resolve(options.destDir)
      const limit = parseLimit(fixTagsCommand, options.limit)
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
          const action = options.execute === true
            ? hasChanges ? 'copied and updated' : 'copied'
            : hasChanges ? 'would copy and update' : 'would copy'

          return {
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
              albumartist: artist,
              title: subtitle,
            },
          }
        })),
      )
      const existingDestinations = await Promise.all(
        plannedTagFixes.map(async plannedTagFix => ({
          exists: await pathExists(plannedTagFix.destinationPath),
          plannedTagFix,
        })),
      )
      const conflictingDestinations = existingDestinations.filter(destination => destination.exists)

      if (conflictingDestinations.length > 0) {
        fixTagsCommand.error(`Destination files already exist: ${conflictingDestinations
          .map(destination => relative(destinationDirectory, destination.plannedTagFix.destinationPath))
          .join(', ')}`)
      }

      if (options.execute === true) {
        for (const plannedTagFix of plannedTagFixes) {
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
