import { readdir, stat } from 'node:fs/promises'
import { basename, extname, relative, resolve } from 'node:path'
import pLimit from 'p-limit'

import { UserInputError } from '../errors.js'

import { readAudiobookFile } from './audiobook-file.js'

type CrawlAudiobookCategory = 'invalid-filename' | 'invalid-other' | 'valid'
type CrawlAudiobookReasonCode = 'filename-mismatch' | 'missing-metadata' | 'valid' | 'validation-failed'

export interface CrawlAudiobookOptions {
  dirName: string
}

export interface CrawlAudiobookJsonOutputRow {
  category: CrawlAudiobookCategory
  expectedFilename: string
  filename: string
  path: string
  performer: string
  reason: string
  reasonCode: CrawlAudiobookReasonCode
  title: string
}

export type CrawlAudiobookJsonOutput = CrawlAudiobookJsonOutputRow[]

async function findM4bFiles(directory: string): Promise<string[]> {
  const directoryEntries = await readdir(directory, { withFileTypes: true })
  const files: string[] = []

  for (const directoryEntry of directoryEntries.sort((left, right) => left.name.localeCompare(right.name))) {
    const entryPath = resolve(directory, directoryEntry.name)

    if (directoryEntry.isDirectory()) {
      files.push(...await findM4bFiles(entryPath))
    }
    else if (directoryEntry.isFile() && extname(directoryEntry.name).toLowerCase() === '.m4b') {
      files.push(entryPath)
    }
  }

  return files
}

function getReasonCode(error: unknown): CrawlAudiobookReasonCode {
  if (error instanceof Error && error.message.includes('is missing required metadata:')) {
    return 'missing-metadata'
  }

  return 'validation-failed'
}

export async function crawlAudiobooks(options: CrawlAudiobookOptions): Promise<CrawlAudiobookJsonOutput> {
  const rootDirectory = resolve(options.dirName)
  const directoryStats = await stat(rootDirectory)

  if (!directoryStats.isDirectory()) {
    throw new UserInputError(`"${options.dirName}" is not a directory`)
  }

  const m4bFiles = await findM4bFiles(rootDirectory)
  const readMetadata = pLimit(16)

  return Promise.all(
    m4bFiles.map(filePath => readMetadata(async (): Promise<CrawlAudiobookJsonOutputRow> => {
      const filename = basename(filePath)
      const path = relative(rootDirectory, filePath)

      try {
        const audiobookFile = await readAudiobookFile(filePath)

        if (audiobookFile.filename !== audiobookFile.expectedFilename) {
          return {
            category: 'invalid-filename',
            expectedFilename: audiobookFile.expectedFilename,
            filename,
            path,
            performer: audiobookFile.performer,
            reason: `${audiobookFile.filename} does not match metadata`,
            reasonCode: 'filename-mismatch',
            title: audiobookFile.title,
          }
        }

        return {
          category: 'valid',
          expectedFilename: audiobookFile.expectedFilename,
          filename,
          path,
          performer: audiobookFile.performer,
          reason: '',
          reasonCode: 'valid',
          title: audiobookFile.title,
        }
      }
      catch (error) {
        return {
          category: 'invalid-other',
          expectedFilename: '',
          filename,
          path,
          performer: '',
          reason: error instanceof Error ? error.message : String(error),
          reasonCode: getReasonCode(error),
          title: '',
        }
      }
    })),
  )
}
