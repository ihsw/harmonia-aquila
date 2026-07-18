import type { Command } from 'commander'

import { parseOutputFormat, writeRows } from '../../command-utils.js'
import { fixAlbumTags, type FixTagsJsonOutput, type FixTagsOptions } from '../../lib/albums/fix-tags.js'
import { UserInputError } from '../../lib/errors.js'

export type { FixTagsJsonOutput, FixTagsJsonOutputRow } from '../../lib/albums/fix-tags.js'

export function registerFixTagsCommand(program: Command): void {
  const fixTagsCommand = program
    .command('fix-tags')
    .description('Fix FLAC and MP3 album metadata')
    .requiredOption('--source-dir <sourceDir>', 'directory containing source FLAC and MP3 files to copy and fix')
    .requiredOption('--dest-dir <destDir>', 'directory to copy fixed FLAC and MP3 files into')
    .option('--limit <count>', 'maximum number of files to inspect')
    .option('--destination-strategy <strategy>', 'what to do when a destination file exists: error, ignore, overwrite', 'error')
    .option('--album-strategy <strategy>', 'how to update album: no change, grouping, originalalbum', 'no change')
    .option('--set-album <album>', 'set album metadata to the provided value')
    .option('--album-artists-strategy <strategy>', 'how to update albumartists: no change, aggregate, blank', 'no change')
    .option('--set-album-artist <albumArtist>', 'set album artist metadata to the provided value')
    .option('--set-artist <artist>', 'set artist metadata to the provided value')
    .option('--set-metadata <path>', 'set whole-album per-track metadata (filename, artist, album, trackNumber, title) from a JSON or CSV file')
    .option('--producer-strategy <strategy>', 'how to update producers: no change, blank, aggregate, copy-from-album-artists', 'no change')
    .option('--reset-track', 'reset track number metadata from each song file alphabetical index within its album')
    .option('--swap-artist-albumartist', 'swap artist and albumartist metadata')
    .option('--execute', 'copy files and write tag changes to destination files')
    .option('--format <format>', 'output format: plaintext, json', 'plaintext')
    .action(async (options: FixTagsOptions & { format?: string }) => {
      const outputFormat = parseOutputFormat(fixTagsCommand, options.format)
      let outputRows: FixTagsJsonOutput

      try {
        outputRows = await fixAlbumTags(options)
      }
      catch (error) {
        if (error instanceof UserInputError) {
          fixTagsCommand.error(error.message)
        }

        throw error
      }

      writeRows(
        outputFormat,
        outputRows,
        options.execute === true ? undefined : 'Dry run: no files were copied or changed. Pass --execute to copy and write updates.',
      )
    })
}
