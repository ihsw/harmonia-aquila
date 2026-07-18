import type { Command } from 'commander'

import { parseOutputFormat, writeRows } from '../../command-utils.js'
import {
  validateAudiobook,
  type ValidateAudiobookJsonOutput,
  type ValidateAudiobookOptions,
} from '../../lib/audiobooks/validate.js'
import { UserInputError } from '../../lib/errors.js'

export type { ValidateAudiobookJsonOutput, ValidateAudiobookJsonOutputRow } from '../../lib/audiobooks/validate.js'

export function registerValidateAudiobookCommand(program: Command): void {
  const validateAudiobookCommand = program
    .command('validate')
    .description('Validate an M4B filename against its performer and title metadata')
    .requiredOption('--file-name <fileName>', 'M4B file to validate')
    .option('--format <format>', 'output format: plaintext, json', 'plaintext')
    .action(async (options: ValidateAudiobookOptions & { format?: string }) => {
      const outputFormat = parseOutputFormat(validateAudiobookCommand, options.format)
      let rows: ValidateAudiobookJsonOutput

      try {
        rows = await validateAudiobook(options)
      }
      catch (error) {
        if (error instanceof UserInputError) {
          validateAudiobookCommand.error(error.message)
        }

        throw error
      }

      writeRows(outputFormat, rows)
    })
}
