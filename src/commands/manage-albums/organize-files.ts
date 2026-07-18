import type { Command } from 'commander'

import { parseOutputFormat, writeRows } from '../../command-utils.js'
import {
  organizeAlbumFiles,
  type OrganizeFilesJsonOutput,
  type OrganizeFilesOptions,
} from '../../lib/albums/organize-files.js'
import { UserInputError } from '../../lib/errors.js'

export type { OrganizeFilesJsonOutput, OrganizeFilesJsonOutputRow } from '../../lib/albums/organize-files.js'

export function registerOrganizeFilesCommand(program: Command): void {
  const organizeFilesCommand = program
    .command('organize-files')
    .description('Copy FLAC and MP3 files into ArtistName/AlbumName/TrackNumber - Title.ext')
    .requiredOption('--source-dir <sourceDir>', 'directory containing FLAC and MP3 files to organize')
    .requiredOption('--dest-dir <destDir>', 'directory to copy organized files into')
    .option('--limit <count>', 'maximum number of files to copy')
    .option('--artist-filename-strategy <strategy>', 'metadata field to use for the artist portion of the filename: artist, albumartist, label, producer', 'artist')
    .option('--title-filename-strategy <strategy>', 'metadata field to use for the title portion of the filename: subtitle, title', 'title')
    .option('--ignore-non-audio-files', 'ignore non-audio files in the source directory')
    .option('--ignore-audio-files-without-tracks', 'ignore audio files without track number metadata')
    .option('--execute', 'copy files')
    .option('--format <format>', 'output format: plaintext, json', 'plaintext')
    .action(async (options: OrganizeFilesOptions & { format?: string }) => {
      const outputFormat = parseOutputFormat(organizeFilesCommand, options.format)
      let outputRows: OrganizeFilesJsonOutput

      try {
        outputRows = await organizeAlbumFiles(options)
      }
      catch (error) {
        if (error instanceof UserInputError) {
          organizeFilesCommand.error(error.message)
        }

        throw error
      }
      writeRows(
        outputFormat,
        outputRows,
        options.execute === true ? undefined : 'Dry run: no files were copied. Pass --execute to copy files.',
      )
    })
}
