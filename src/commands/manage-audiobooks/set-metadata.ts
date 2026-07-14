import type { Command } from 'commander'
import { parseFile } from 'music-metadata'
import { stat } from 'node:fs/promises'
import { basename, dirname, extname, resolve } from 'node:path'

import { parseOutputFormat, writeRows } from '../../command-utils.js'

import { setM4bToolMetadata } from './helpers/m4b-tool.js'

interface SetMetadataOptions {
  author: string
  execute?: boolean
  fileName: string
  format?: string
  narrator?: string
  title: string
}

interface SetMetadataRow {
  action: 'set metadata' | 'would set metadata'
  author: string
  filename: string
  narrator: string
  title: string
}

async function getM4bSourcePath(fileName: string): Promise<string> {
  const sourcePath = resolve(fileName)

  if (extname(sourcePath).toLowerCase() !== '.m4b') {
    throw new Error(`"${fileName}" must be an M4B file`)
  }

  if (!(await stat(sourcePath)).isFile()) {
    throw new Error(`"${fileName}" is not a file`)
  }

  return sourcePath
}

async function assertMetadataWasSet(sourcePath: string, author: string, narrator: string, title: string): Promise<void> {
  const metadata = await parseFile(sourcePath)

  if (
    metadata.common.artist !== author
    || metadata.common.album !== title
    || !metadata.common.composer?.includes(narrator)
  ) {
    throw new Error(`${basename(sourcePath)} metadata was not set as requested`)
  }
}

export function registerSetAudiobookMetadataCommand(program: Command): void {
  const setMetadataCommand = program
    .command('set-metadata')
    .description('Set missing M4B audiobook metadata')
    .requiredOption('--file-name <fileName>', 'M4B file whose metadata to set')
    .requiredOption('--title <title>', 'audiobook title; stored as album metadata')
    .requiredOption('--author <author>', 'audiobook author; stored as artist metadata')
    .option('--narrator <narrator>', 'audiobook narrator; stored as writer metadata')
    .option('--execute', 'write metadata with m4b-tool')
    .option('--format <format>', 'output format: plaintext, json', 'plaintext')
    .action(async (options: SetMetadataOptions) => {
      const outputFormat = parseOutputFormat(setMetadataCommand, options.format)
      const sourcePath = await getM4bSourcePath(options.fileName)
      const narrator = options.narrator ?? options.author

      if (options.execute === true) {
        await setM4bToolMetadata({
          author: options.author,
          narrator,
          sourceDirectory: dirname(sourcePath),
          sourcePath,
          title: options.title,
        })
        await assertMetadataWasSet(sourcePath, options.author, narrator, options.title)
      }

      const rows: SetMetadataRow[] = [{
        action: options.execute === true ? 'set metadata' : 'would set metadata',
        author: options.author,
        filename: basename(sourcePath),
        narrator,
        title: options.title,
      }]

      writeRows(
        outputFormat,
        rows,
        options.execute === true ? undefined : 'Dry run: no metadata was changed. Pass --execute to run m4b-tool.',
      )
    })
}
