import type { Command } from 'commander'

import { parseOutputFormat, writeRows } from '../../command-utils.js'
import {
  convertAudiobookFiles,
  type ConvertFileOptions,
  type ConvertFileRow,
} from '../../lib/audiobooks/convert-file.js'
import { UserInputError } from '../../lib/errors.js'

function collectFileName(fileName: string, fileNames: string[]): string[] {
  return [...fileNames, fileName]
}

export function registerConvertAudiobookFileCommand(program: Command): void {
  const convertFileCommand = program
    .command('convert-file')
    .description('Convert audiobook files into metadata-named M4B files')
    .option('--file-name <fileName>', 'audiobook file to convert; repeat for additional files', collectFileName, [])
    .requiredOption('--dest-dir <destDir>', 'directory for the converted M4B file')
    .option('--author <author>', 'author override; requires --title and --narrator')
    .option('--title <title>', 'title override; requires --author and --narrator')
    .option('--narrator <narrator>', 'narrator override; requires --author and --title')
    .option('--jobs <jobs>', 'm4b-tool merge jobs', '16')
    .option('--concurrency <concurrency>', 'maximum simultaneous file conversions', '4')
    .option('--execute', 'run m4b-tool merge')
    .option('--format <format>', 'output format: plaintext, json', 'plaintext')
    .action(async (options: ConvertFileOptions & { format?: string }) => {
      const outputFormat = parseOutputFormat(convertFileCommand, options.format)
      let rows: ConvertFileRow[]

      try {
        rows = await convertAudiobookFiles(options)
      }
      catch (error) {
        if (error instanceof UserInputError) {
          convertFileCommand.error(error.message)
        }

        throw error
      }
      writeRows(
        outputFormat,
        rows,
        options.execute === true ? undefined : 'Dry run: no files were converted. Pass --execute to run m4b-tool.',
      )
    })
}
