import type { Command } from 'commander'

import { parseOutputFormat, writeRows } from '../../command-utils.js'
import {
  validateAlbumSourceDir,
  type ValidateAlbumSourceDirJsonOutput,
  type ValidateAlbumSourceDirOptions,
} from '../../lib/albums/validate.js'
import { UserInputError } from '../../lib/errors.js'

export type { ValidateAlbumSourceDirJsonOutput, ValidateAlbumSourceDirJsonOutputRow } from '../../lib/albums/validate.js'

export function registerValidateAlbumSourceDirCommand(program: Command): void {
  const validateCommand = program
    .command('validate')
    .description('Validate FLAC and MP3 metadata needed to organize an album source directory')
    .requiredOption('--dir-name <dirName>', 'directory to validate')
    .option('--limit <count>', 'maximum number of files to validate')
    .option('--artist-filename-strategy <strategy>', 'metadata field to use for the artist portion of the filename: artist, albumartist, label, producer', 'artist')
    .option('--title-filename-strategy <strategy>', 'metadata field to use for the title portion of the filename: subtitle, title', 'title')
    .option('--ignore-non-audio-files', 'ignore non-audio files in the source directory')
    .option('--format <format>', 'output format: plaintext, json', 'plaintext')
    .action(async (options: ValidateAlbumSourceDirOptions & { format?: string }) => {
      const outputFormat = parseOutputFormat(validateCommand, options.format)
      let rows: ValidateAlbumSourceDirJsonOutput

      try {
        rows = await validateAlbumSourceDir(options)
      }
      catch (error) {
        if (error instanceof UserInputError) {
          validateCommand.error(error.message)
        }

        throw error
      }

      writeRows(outputFormat, rows)
    })
}
