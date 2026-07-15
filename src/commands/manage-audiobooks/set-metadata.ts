import type { Command } from 'commander'
import { parseFile } from 'music-metadata'
import { File } from 'node-taglib-sharp'
import { constants } from 'node:fs'
import { copyFile, mkdir, stat } from 'node:fs/promises'
import { basename, dirname, extname, resolve } from 'node:path'

import { parseOutputFormat, pathExists, writeRows } from '../../command-utils.js'

interface SetMetadataOptions {
  author: string
  destFilepath: string
  execute?: boolean
  format?: string
  narrator?: string
  sourceFilepath: string
  title: string
}

interface SetMetadataRow {
  action: 'set metadata' | 'would set metadata'
  author: string
  destination: string
  narrator: string
  source: string
  title: string
}

async function getM4bFilePath(filePath: string): Promise<string> {
  const sourcePath = resolve(filePath)

  if (extname(sourcePath).toLowerCase() !== '.m4b') {
    throw new Error(`"${filePath}" must be an M4B file`)
  }

  if (!(await stat(sourcePath)).isFile()) {
    throw new Error(`"${filePath}" is not a file`)
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

function writeMetadata(filePath: string, author: string, narrator: string, title: string): void {
  const audioFile = File.createFromPath(filePath)

  try {
    audioFile.tag.album = title
    audioFile.tag.composers = [narrator]
    audioFile.tag.performers = [author]
    audioFile.save()
  }
  finally {
    audioFile.dispose()
  }
}

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
    .action(async (options: SetMetadataOptions) => {
      const outputFormat = parseOutputFormat(setMetadataCommand, options.format)
      const sourcePath = await getM4bFilePath(options.sourceFilepath)
      const destinationPath = resolve(options.destFilepath)
      const narrator = options.narrator ?? options.author

      if (sourcePath === destinationPath) {
        setMetadataCommand.error('--dest-filepath must differ from --source-filepath')
      }

      if (extname(destinationPath).toLowerCase() !== '.m4b') {
        setMetadataCommand.error(`"${options.destFilepath}" must be an M4B file`)
      }

      if (await pathExists(destinationPath)) {
        setMetadataCommand.error(`Destination file already exists: ${basename(destinationPath)}`)
      }

      if (options.execute === true) {
        await mkdir(dirname(destinationPath), { recursive: true })
        await copyFile(sourcePath, destinationPath, constants.COPYFILE_EXCL)
        writeMetadata(destinationPath, options.author, narrator, options.title)
        await assertMetadataWasSet(destinationPath, options.author, narrator, options.title)
      }

      const rows: SetMetadataRow[] = [{
        action: options.execute === true ? 'set metadata' : 'would set metadata',
        author: options.author,
        destination: basename(destinationPath),
        narrator,
        source: basename(sourcePath),
        title: options.title,
      }]

      writeRows(
        outputFormat,
        rows,
        options.execute === true ? undefined : 'Dry run: no files or metadata were changed. Pass --execute to run m4b-tool.',
      )
    })
}
