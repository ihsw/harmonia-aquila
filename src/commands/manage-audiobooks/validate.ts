import type { Command } from 'commander'
import { parseFile } from 'music-metadata'
import { stat } from 'node:fs/promises'
import { basename, extname, resolve } from 'node:path'

import { parseOutputFormat, writeRows } from '../../command-utils.js'

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
      const filePath = resolve(options.fileName)
      const filename = basename(filePath)

      if (extname(filename).toLowerCase() !== '.m4b') {
        validateAudiobookCommand.error(`"${options.fileName}" must be an M4B file`)
      }

      const fileStats = await stat(filePath)

      if (!fileStats.isFile()) {
        validateAudiobookCommand.error(`"${options.fileName}" is not a file`)
      }

      const metadata = await parseFile(filePath)
      const performer = metadata.common.artist ?? ''
      const title = metadata.common.title ?? ''
      const missingFields = [
        performer === '' ? 'performer' : undefined,
        title === '' ? 'title' : undefined,
      ].filter((field): field is string => field !== undefined)

      if (missingFields.length > 0) {
        validateAudiobookCommand.error(`${filename} is missing required metadata: ${missingFields.join(', ')}`)
      }

      const expectedFilename = `${performer} - ${title}.m4b`

      if (filename !== expectedFilename) {
        validateAudiobookCommand.error(`${filename} does not match metadata; expected "${expectedFilename}"`)
      }

      const rows: ValidateAudiobookJsonOutput = [{
        filename,
        performer,
        title,
        valid: true,
      }]

      writeRows(outputFormat, rows)
    })
}
