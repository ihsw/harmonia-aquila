import { parseFile } from 'music-metadata'
import { File } from 'node-taglib-sharp'
import { constants } from 'node:fs'
import { copyFile, mkdir, stat } from 'node:fs/promises'
import { basename, dirname, extname, resolve } from 'node:path'

import { pathExists } from '../../command-utils.js'
import { UserInputError } from '../errors.js'

export interface SetAudiobookMetadataOptions {
  author: string
  destFilepath: string
  execute?: boolean
  narrator?: string
  sourceFilepath: string
  title: string
}

export interface SetMetadataRow {
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
    throw new UserInputError(`"${filePath}" must be an M4B file`)
  }

  if (!(await stat(sourcePath)).isFile()) {
    throw new UserInputError(`"${filePath}" is not a file`)
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

export async function setAudiobookMetadata(options: SetAudiobookMetadataOptions): Promise<SetMetadataRow[]> {
  const sourcePath = await getM4bFilePath(options.sourceFilepath)
  const destinationPath = resolve(options.destFilepath)
  const narrator = options.narrator ?? options.author

  if (sourcePath === destinationPath) {
    throw new UserInputError('--dest-filepath must differ from --source-filepath')
  }

  if (extname(destinationPath).toLowerCase() !== '.m4b') {
    throw new UserInputError(`"${options.destFilepath}" must be an M4B file`)
  }

  if (await pathExists(destinationPath)) {
    throw new UserInputError(`Destination file already exists: ${basename(destinationPath)}`)
  }

  if (options.execute === true) {
    await mkdir(dirname(destinationPath), { recursive: true })
    await copyFile(sourcePath, destinationPath, constants.COPYFILE_EXCL)
    writeMetadata(destinationPath, options.author, narrator, options.title)
    await assertMetadataWasSet(destinationPath, options.author, narrator, options.title)
  }

  return [{
    action: options.execute === true ? 'set metadata' : 'would set metadata',
    author: options.author,
    destination: basename(destinationPath),
    narrator,
    source: basename(sourcePath),
    title: options.title,
  }]
}
