import { constants } from 'node:fs'
import { copyFile, mkdir } from 'node:fs/promises'
import { basename, join, relative, resolve } from 'node:path'

import { pathExists } from '../../command-utils.js'
import { UserInputError } from '../errors.js'

import { readAudiobookFile } from './audiobook-file.js'

export interface CopyAndRenameAudiobookOptions {
  destDir: string
  execute?: boolean
  fileName: string
}

export interface CopyAndRenameAudiobookJsonOutputRow {
  action: string
  destination: string
  filename: string
  performer: string
  title: string
}

export type CopyAndRenameAudiobookJsonOutput = CopyAndRenameAudiobookJsonOutputRow[]

export async function copyAndRenameAudiobook(options: CopyAndRenameAudiobookOptions): Promise<CopyAndRenameAudiobookJsonOutput> {
  const audiobookFile = await readAudiobookFile(options.fileName)

  if (audiobookFile.filename === audiobookFile.expectedFilename) {
    throw new UserInputError(`${audiobookFile.filename} already matches metadata`)
  }

  if (basename(audiobookFile.expectedFilename) !== audiobookFile.expectedFilename) {
    throw new UserInputError(`${audiobookFile.filename} metadata cannot form a valid filename`)
  }

  const destinationDirectory = resolve(options.destDir)
  const destinationPath = join(destinationDirectory, audiobookFile.expectedFilename)

  if (await pathExists(destinationPath)) {
    throw new UserInputError(`Destination file already exists: ${relative(destinationDirectory, destinationPath)}`)
  }

  if (options.execute === true) {
    await mkdir(destinationDirectory, { recursive: true })
    await copyFile(audiobookFile.sourcePath, destinationPath, constants.COPYFILE_EXCL)
  }

  return [{
    action: options.execute === true ? 'copied' : 'would copy',
    destination: relative(destinationDirectory, destinationPath),
    filename: audiobookFile.filename,
    performer: audiobookFile.performer,
    title: audiobookFile.title,
  }]
}
