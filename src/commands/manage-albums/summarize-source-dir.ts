import type { Command } from 'commander'

import { parseOutputFormat, writeRows } from '../../command-utils.js'
import {
  summarizeAlbumSourceDir,
  type SummarizeSourceDirJsonOutput,
  type SummarizeSourceDirOptions,
} from '../../lib/albums/summarize-source-dir.js'
import { UserInputError } from '../../lib/errors.js'

export type { SummarizeSourceDirJsonOutput, SummarizeSourceDirJsonOutputRow } from '../../lib/albums/summarize-source-dir.js'

export function registerSummarizeSourceDirCommand(program: Command): void {
  const summarizeSourceDirCommand = program
    .command('summarize-source-dir')
    .description('List FLAC and MP3 files and metadata in a source directory')
    .requiredOption('--dir-name <dirName>', 'directory to list')
    .option('--limit <count>', 'maximum number of files to list')
    .option('--ignore-non-audio-files', 'ignore non-audio files in the source directory')
    .option('--format <format>', 'output format: plaintext, json', 'plaintext')
    .action(async (options: SummarizeSourceDirOptions & { format?: string }) => {
      const outputFormat = parseOutputFormat(summarizeSourceDirCommand, options.format)
      let metadataRows: SummarizeSourceDirJsonOutput

      try {
        metadataRows = await summarizeAlbumSourceDir(options)
      }
      catch (error) {
        if (error instanceof UserInputError) {
          summarizeSourceDirCommand.error(error.message)
        }

        throw error
      }

      writeRows(outputFormat, metadataRows)
    })
}
