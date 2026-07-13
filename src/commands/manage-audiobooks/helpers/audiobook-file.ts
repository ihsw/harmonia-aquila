import type { Command } from 'commander'
import { parseFile } from 'music-metadata'
import { stat } from 'node:fs/promises'
import { basename, extname, resolve } from 'node:path'

export interface AudiobookFile {
  expectedFilename: string
  filename: string
  performer: string
  sourcePath: string
  title: string
}

export async function getAudiobookFile(command: Command, fileName: string): Promise<AudiobookFile> {
  const sourcePath = resolve(fileName)
  const filename = basename(sourcePath)

  if (extname(filename).toLowerCase() !== '.m4b') {
    command.error(`"${fileName}" must be an M4B file`)
  }

  const fileStats = await stat(sourcePath)

  if (!fileStats.isFile()) {
    command.error(`"${fileName}" is not a file`)
  }

  const metadata = await parseFile(sourcePath)
  const performer = metadata.common.artist ?? ''
  const title = metadata.common.title ?? ''
  const missingFields = [
    performer === '' ? 'performer' : undefined,
    title === '' ? 'title' : undefined,
  ].filter((field): field is string => field !== undefined)

  if (missingFields.length > 0) {
    command.error(`${filename} is missing required metadata: ${missingFields.join(', ')}`)
  }

  return {
    expectedFilename: `${performer} - ${title}.m4b`,
    filename,
    performer,
    sourcePath,
    title,
  }
}
