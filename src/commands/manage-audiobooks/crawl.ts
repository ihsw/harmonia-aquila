import type { Command } from 'commander'
import { readdir, stat } from 'node:fs/promises'
import { basename, extname, relative, resolve } from 'node:path'
import pLimit from 'p-limit'

import { parseOutputFormat, writeRows } from '../../command-utils.js'

import { readAudiobookFile } from './helpers/audiobook-file.js'

type CrawlAudiobookCategory = 'invalid-filename' | 'invalid-other' | 'valid'

export interface CrawlAudiobookJsonOutputRow {
  category: CrawlAudiobookCategory
  expectedFilename: string
  filename: string
  path: string
  performer: string
  reason: string
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

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

export function registerCrawlAudiobooksCommand(program: Command): void {
  const crawlAudiobooksCommand = program
    .command('crawl')
    .description('Recursively categorize M4B files by metadata and filename validity')
    .requiredOption('--dir-name <dirName>', 'directory to crawl for M4B files')
    .option('--format <format>', 'output format: plaintext, json', 'plaintext')
    .action(async (options: { dirName: string, format?: string }) => {
      const outputFormat = parseOutputFormat(crawlAudiobooksCommand, options.format)
      const rootDirectory = resolve(options.dirName)
      const directoryStats = await stat(rootDirectory)

      if (!directoryStats.isDirectory()) {
        crawlAudiobooksCommand.error(`"${options.dirName}" is not a directory`)
      }

      const m4bFiles = await findM4bFiles(rootDirectory)
      const readMetadata = pLimit(16)
      const rows: CrawlAudiobookJsonOutput = await Promise.all(
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
              reason: getErrorMessage(error),
              title: '',
            }
          }
        })),
      )

      writeRows(outputFormat, rows)
    })
}
