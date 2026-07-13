import type { Command } from 'commander'

import { parseOutputFormat, writeRows } from '../../command-utils.js'

import { getAudiobookFile } from './helpers/audiobook-file.js'

export interface ValidateAudiobookJsonOutputRow {
  filename: string
  performer: string
  title: string
  valid: true
}

export type ValidateAudiobookJsonOutput = ValidateAudiobookJsonOutputRow[]

export function registerValidateAudiobookCommand(program: Command): void {
  const validateAudiobookCommand = program
    .command('validate')
    .description('Validate an M4B filename against its performer and title metadata')
    .requiredOption('--file-name <fileName>', 'M4B file to validate')
    .option('--format <format>', 'output format: plaintext, json', 'plaintext')
    .action(async (options: { fileName: string, format?: string }) => {
      const outputFormat = parseOutputFormat(validateAudiobookCommand, options.format)
      const audiobookFile = await getAudiobookFile(validateAudiobookCommand, options.fileName)

      if (audiobookFile.filename !== audiobookFile.expectedFilename) {
        validateAudiobookCommand.error(`${audiobookFile.filename} does not match metadata; expected "${audiobookFile.expectedFilename}"`)
      }

      const rows: ValidateAudiobookJsonOutput = [{
        filename: audiobookFile.filename,
        performer: audiobookFile.performer,
        title: audiobookFile.title,
        valid: true,
      }]

      writeRows(outputFormat, rows)
    })
}
