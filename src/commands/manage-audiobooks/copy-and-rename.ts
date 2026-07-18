import type { Command } from 'commander'

import { parseOutputFormat, writeRows } from '../../command-utils.js'
import {
  copyAndRenameAudiobook,
  type CopyAndRenameAudiobookJsonOutput,
  type CopyAndRenameAudiobookOptions,
} from '../../lib/audiobooks/copy-and-rename.js'
import { UserInputError } from '../../lib/errors.js'

export type { CopyAndRenameAudiobookJsonOutput, CopyAndRenameAudiobookJsonOutputRow } from '../../lib/audiobooks/copy-and-rename.js'

export function registerCopyAndRenameAudiobookCommand(program: Command): void {
  const copyAndRenameAudiobookCommand = program
    .command('copy-and-rename')
    .description('Copy an M4B with a metadata-derived filename')
    .requiredOption('--file-name <fileName>', 'M4B file to copy and rename')
    .requiredOption('--dest-dir <destDir>', 'directory to copy the renamed M4B into')
    .option('--execute', 'copy the file')
    .option('--format <format>', 'output format: plaintext, json', 'plaintext')
    .action(async (options: CopyAndRenameAudiobookOptions & { format?: string }) => {
      const outputFormat = parseOutputFormat(copyAndRenameAudiobookCommand, options.format)
      let rows: CopyAndRenameAudiobookJsonOutput

      try {
        rows = await copyAndRenameAudiobook(options)
      }
      catch (error) {
        if (error instanceof UserInputError) {
          copyAndRenameAudiobookCommand.error(error.message)
        }

        throw error
      }

      writeRows(
        outputFormat,
        rows,
        options.execute === true ? undefined : 'Dry run: no files were copied. Pass --execute to copy the file.',
      )
    })
}
