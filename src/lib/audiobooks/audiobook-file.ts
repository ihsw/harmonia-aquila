import { parseFile } from 'music-metadata'
import { stat } from 'node:fs/promises'
import { basename, extname, resolve } from 'node:path'

import { UserInputError } from '../errors.js'

export interface AudiobookFile {
  expectedFilename: string
  filename: string
  performer: string
  sourcePath: string
  title: string
}

export async function readAudiobookFile(fileName: string): Promise<AudiobookFile> {
  const sourcePath = resolve(fileName)
  const filename = basename(sourcePath)

  if (extname(filename).toLowerCase() !== '.m4b') {
    throw new UserInputError(`"${fileName}" must be an M4B file`)
  }

  const fileStats = await stat(sourcePath)

  if (!fileStats.isFile()) {
    throw new UserInputError(`"${fileName}" is not a file`)
  }

  const metadata = await parseFile(sourcePath)
  const performer = metadata.common.artist ?? ''
  const title = metadata.common.album ?? metadata.common.title ?? ''
  const missingFields = [
    performer === '' ? 'performer' : undefined,
    title === '' ? 'album or title' : undefined,
  ].filter((field): field is string => field !== undefined)

  if (missingFields.length > 0) {
    throw new UserInputError(`${filename} is missing required metadata: ${missingFields.join(', ')}`)
  }

  return {
    expectedFilename: `${performer} - ${title}.m4b`,
    filename,
    performer,
    sourcePath,
    title,
  }
}
