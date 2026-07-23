import type { Command } from 'commander'

import { parseOutputFormat, writeRows } from '../../command-utils.js'
import {
  listAlbumSourceDir,
  type ListAlbumSourceDirJsonOutput,
} from '../../lib/albums/list.js'
import { UserInputError } from '../../lib/errors.js'

export type { ListAlbumSourceDirJsonOutput } from '../../lib/albums/list.js'

interface ListCommandOptions {
  format?: string
  prefix: string
  sourceDir: string
}

export function registerListAlbumSourceDirCommand(program: Command): void {
  const listCommand = program
    .command('list')
    .description('List immediate entries of a source-root-relative directory')
    .requiredOption('--source-dir <dir>', 'source root directory to list')
    .option('--prefix <prefix>', 'source-root-relative subdirectory prefix (must end with /)', '')
    .option('--format <format>', 'output format: plaintext, json', 'plaintext')
    .action(async (options: ListCommandOptions) => {
      const outputFormat = parseOutputFormat(listCommand, options.format)
      let entries: ListAlbumSourceDirJsonOutput

      try {
        entries = await listAlbumSourceDir({
          prefix: options.prefix,
          sourceDir: options.sourceDir,
        })
      }
      catch (error) {
        if (error instanceof UserInputError) {
          listCommand.error(error.message)
        }

        throw error
      }

      writeRows(outputFormat, entries)
    })
}
