import type { Command } from 'commander'
import { constants } from 'node:fs'
import { copyFile, mkdir } from 'node:fs/promises'
import { basename, join, relative, resolve } from 'node:path'

import { parseOutputFormat, pathExists, writeRows } from '../../command-utils.js'

import { getAudiobookFile } from './helpers/audiobook-file.js'

export interface CopyAndRenameAudiobookJsonOutputRow {
  action: string
  destination: string
  filename: string
  performer: string
  title: string
}

export type CopyAndRenameAudiobookJsonOutput = CopyAndRenameAudiobookJsonOutputRow[]

export function registerCopyAndRenameAudiobookCommand(program: Command): void {
  const copyAndRenameAudiobookCommand = program
    .command('copy-and-rename')
    .description('Copy an M4B with a metadata-derived filename')
    .requiredOption('--file-name <fileName>', 'M4B file to copy and rename')
    .requiredOption('--dest-dir <destDir>', 'directory to copy the renamed M4B into')
    .option('--execute', 'copy the file')
    .option('--format <format>', 'output format: plaintext, json', 'plaintext')
    .action(async (options: { destDir: string, execute?: boolean, fileName: string, format?: string }) => {
      const outputFormat = parseOutputFormat(copyAndRenameAudiobookCommand, options.format)
      const audiobookFile = await getAudiobookFile(copyAndRenameAudiobookCommand, options.fileName)

      if (audiobookFile.filename === audiobookFile.expectedFilename) {
        copyAndRenameAudiobookCommand.error(`${audiobookFile.filename} already matches metadata`)
      }

      if (basename(audiobookFile.expectedFilename) !== audiobookFile.expectedFilename) {
        copyAndRenameAudiobookCommand.error(`${audiobookFile.filename} metadata cannot form a valid filename`)
      }

      const destinationDirectory = resolve(options.destDir)
      const destinationPath = join(destinationDirectory, audiobookFile.expectedFilename)

      if (await pathExists(destinationPath)) {
        copyAndRenameAudiobookCommand.error(`Destination file already exists: ${relative(destinationDirectory, destinationPath)}`)
      }

      if (options.execute === true) {
        await mkdir(destinationDirectory, { recursive: true })
        await copyFile(audiobookFile.sourcePath, destinationPath, constants.COPYFILE_EXCL)
      }

      const rows: CopyAndRenameAudiobookJsonOutput = [{
        action: options.execute === true ? 'copied' : 'would copy',
        destination: relative(destinationDirectory, destinationPath),
        filename: audiobookFile.filename,
        performer: audiobookFile.performer,
        title: audiobookFile.title,
      }]

      writeRows(
        outputFormat,
        rows,
        options.execute === true ? undefined : 'Dry run: no files were copied. Pass --execute to copy the file.',
      )
    })
}
