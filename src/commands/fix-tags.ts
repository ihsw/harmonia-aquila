import type { Command } from 'commander'
import { parseFile } from 'music-metadata'
import { resolve } from 'node:path'
import pLimit from 'p-limit'

import { getMp3Files, parseLimit } from '../command-utils.js'
import { writeMp3TagFix } from '../id3-tags.js'

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

export function registerFixTagsCommand(program: Command): void {
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
}
