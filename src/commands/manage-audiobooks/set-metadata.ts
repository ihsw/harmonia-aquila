import type { Command } from 'commander'

import { parseOutputFormat, writeRows } from '../../command-utils.js'
import {
  setAudiobookMetadata,
  type SetAudiobookMetadataOptions,
  type SetMetadataRow,
} from '../../lib/audiobooks/set-metadata.js'
import { UserInputError } from '../../lib/errors.js'

export function registerSetAudiobookMetadataCommand(program: Command): void {
  const setMetadataCommand = program
    .command('set-metadata')
    .description('Copy an M4B and set missing metadata on the copy')
    .requiredOption('--source-filepath <sourceFilepath>', 'source M4B file to preserve')
    .requiredOption('--dest-filepath <destFilepath>', 'new M4B file to receive metadata')
    .requiredOption('--title <title>', 'audiobook title; stored as album metadata')
    .requiredOption('--author <author>', 'audiobook author; stored as artist metadata')
    .option('--narrator <narrator>', 'audiobook narrator; stored as writer metadata')
    .option('--execute', 'write metadata with m4b-tool')
    .option('--format <format>', 'output format: plaintext, json', 'plaintext')
    .action(async (options: SetAudiobookMetadataOptions & { format?: string }) => {
      const outputFormat = parseOutputFormat(setMetadataCommand, options.format)
      let rows: SetMetadataRow[]

      try {
        rows = await setAudiobookMetadata(options)
      }
      catch (error) {
        if (error instanceof UserInputError) {
          setMetadataCommand.error(error.message)
        }

        throw error
      }

      writeRows(
        outputFormat,
        rows,
        options.execute === true ? undefined : 'Dry run: no files or metadata were changed. Pass --execute to run m4b-tool.',
      )
    })
}
