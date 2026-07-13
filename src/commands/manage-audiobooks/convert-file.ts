import type { Command } from 'commander'
import { parseFile } from 'music-metadata'
import { mkdir, stat } from 'node:fs/promises'
import { basename, dirname, join, resolve } from 'node:path'
import pLimit from 'p-limit'

import { parseOutputFormat, pathExists, writeRows } from '../../command-utils.js'

import { readAudiobookFile } from './helpers/audiobook-file.js'
import { mergeWithM4bTool, parseM4bToolJobs } from './helpers/m4b-tool.js'

interface ConvertibleAudiobookFile {
  expectedFilename: string
  performer: string
  sourcePath: string
  title: string
}

interface ConvertFileOptions {
  concurrency: string
  destDir: string
  execute?: boolean
  fileName: string[]
  format?: string
  jobs: string
}

interface ConvertFileRow {
  action: 'converted' | 'would convert'
  destination: string
  performer: string
  source: string
  title: string
}

function collectFileName(fileName: string, fileNames: string[]): string[] {
  return [...fileNames, fileName]
}

function parseConcurrency(command: Command, concurrencyOption: string): number {
  const concurrency = Number(concurrencyOption)

  if (!Number.isInteger(concurrency) || concurrency < 1) {
    command.error('--concurrency must be a positive integer')
  }

  return concurrency
}

function toError(reason: unknown): Error {
  return reason instanceof Error ? reason : new Error(String(reason))
}

async function readConvertibleAudiobookFile(fileName: string): Promise<ConvertibleAudiobookFile> {
  const sourcePath = resolve(fileName)
  const sourceStats = await stat(sourcePath)

  if (!sourceStats.isFile()) {
    throw new Error(`"${fileName}" is not a file`)
  }

  const metadata = await parseFile(sourcePath)
  const performer = metadata.common.artist ?? ''
  const title = metadata.common.album ?? ''
  const missingFields = [
    performer === '' ? 'performer' : undefined,
    title === '' ? 'album title' : undefined,
  ].filter((field): field is string => field !== undefined)

  if (missingFields.length > 0) {
    throw new Error(`${basename(sourcePath)} is missing required metadata: ${missingFields.join(', ')}`)
  }

  return {
    expectedFilename: `${performer} - ${title}.m4b`,
    performer,
    sourcePath,
    title,
  }
}

async function convertAudiobookFile(audiobookFile: ConvertibleAudiobookFile, destinationDirectory: string, jobs: number): Promise<void> {
  const destinationPath = join(destinationDirectory, audiobookFile.expectedFilename)

  await mergeWithM4bTool({
    destinationDirectory,
    destinationFilename: audiobookFile.expectedFilename,
    jobs,
    performer: audiobookFile.performer,
    sourceDirectory: dirname(audiobookFile.sourcePath),
    sourcePaths: [audiobookFile.sourcePath],
    title: audiobookFile.title,
  })

  const convertedAudiobookFile = await readAudiobookFile(destinationPath)

  if (convertedAudiobookFile.filename !== convertedAudiobookFile.expectedFilename) {
    throw new Error(`${convertedAudiobookFile.filename} does not match metadata; expected "${convertedAudiobookFile.expectedFilename}"`)
  }
}

export function registerConvertAudiobookFileCommand(program: Command): void {
  const convertFileCommand = program
    .command('convert-file')
    .description('Convert audiobook files into metadata-named M4B files')
    .option('--file-name <fileName>', 'audiobook file to convert; repeat for additional files', collectFileName, [])
    .requiredOption('--dest-dir <destDir>', 'directory for the converted M4B file')
    .option('--jobs <jobs>', 'm4b-tool merge jobs', '16')
    .option('--concurrency <concurrency>', 'maximum simultaneous file conversions', '4')
    .option('--execute', 'run m4b-tool merge')
    .option('--format <format>', 'output format: plaintext, json', 'plaintext')
    .action(async (options: ConvertFileOptions) => {
      const outputFormat = parseOutputFormat(convertFileCommand, options.format)
      const concurrency = parseConcurrency(convertFileCommand, options.concurrency)
      const jobs = parseM4bToolJobs(convertFileCommand, options.jobs)
      const destinationDirectory = resolve(options.destDir)
      const audiobookFiles = await Promise.all(options.fileName.map(readConvertibleAudiobookFile))
      const destinations = new Set<string>()

      if (audiobookFiles.length === 0) {
        convertFileCommand.error('at least one --file-name is required')
      }

      for (const audiobookFile of audiobookFiles) {
        if (destinations.has(audiobookFile.expectedFilename)) {
          convertFileCommand.error(`Multiple source files resolve to "${audiobookFile.expectedFilename}"`)
        }
        destinations.add(audiobookFile.expectedFilename)

        if (await pathExists(join(destinationDirectory, audiobookFile.expectedFilename))) {
          convertFileCommand.error(`Destination file already exists: ${audiobookFile.expectedFilename}`)
        }
      }

      if (options.execute === true) {
        await mkdir(destinationDirectory, { recursive: true })
        const limit = pLimit(concurrency)
        const results = await Promise.allSettled(
          audiobookFiles.map(audiobookFile => limit(async () => (
            convertAudiobookFile(audiobookFile, destinationDirectory, jobs)
          ))),
        )
        const errors = results
          .filter((result): result is PromiseRejectedResult => result.status === 'rejected')
          .map(result => toError(result.reason))

        if (errors.length > 0) {
          throw new AggregateError(errors, `${String(errors.length)} audiobook conversion(s) failed`)
        }
      }

      const rows: ConvertFileRow[] = audiobookFiles.map(audiobookFile => ({
        action: options.execute === true ? 'converted' : 'would convert',
        destination: audiobookFile.expectedFilename,
        performer: audiobookFile.performer,
        source: basename(audiobookFile.sourcePath),
        title: audiobookFile.title,
      }))

      writeRows(
        outputFormat,
        rows,
        options.execute === true ? undefined : 'Dry run: no files were converted. Pass --execute to run m4b-tool.',
      )
    })
}
