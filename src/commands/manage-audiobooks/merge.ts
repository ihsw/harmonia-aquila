import type { Command } from 'commander'

import { parseOutputFormat, writeRows } from '../../command-utils.js'
import * as mergeLibrary from '../../lib/audiobooks/merge.js'
import { UserInputError } from '../../lib/errors.js'

export function registerMergeAudiobooksCommand(program: Command): void {
  const mergeAudiobooksCommand = program
    .command('merge')
    .description('Merge M4B or MP3 audiobook groups into M4B files')
    .requiredOption('--source-dir <sourceDir>', 'directory to recursively scan for M4B or MP3 audiobook files')
    .requiredOption('--dest-dir <destDir>', 'directory for converted M4B files')
    .option('--jobs <jobs>', 'm4b-tool merge jobs per audiobook', '16')
    .option('--bypass-metadata', 'merge all source files into one source-folder-named M4B without metadata checks')
    .option('--execute', 'run m4b-tool merges')
    .option('--format <format>', 'output format: plaintext, json', 'plaintext')
    .action(async (options: mergeLibrary.MergeOptions & { format?: string }) => {
      const outputFormat = parseOutputFormat(mergeAudiobooksCommand, options.format)
      let rows: mergeLibrary.MergeAudiobookRow[]

      try {
        rows = await mergeLibrary.mergeAudiobooks(options)
      }
      catch (error) {
        if (error instanceof UserInputError) {
          mergeAudiobooksCommand.error(error.message)
        }

        throw error
      }
      writeRows(
        outputFormat,
        rows,
        options.execute === true ? undefined : 'Dry run: no files were merged. Pass --execute to run m4b-tool.',
      )
    })
}
