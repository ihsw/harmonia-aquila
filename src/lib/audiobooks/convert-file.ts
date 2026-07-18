import { parseFile } from 'music-metadata'
import { mkdir, stat } from 'node:fs/promises'
import { basename, dirname, join, resolve } from 'node:path'
import pLimit from 'p-limit'

import { pathExists } from '../../command-utils.js'
import { UserInputError } from '../errors.js'

import { readAudiobookFile } from './audiobook-file.js'
import { mergeWithM4bTool, parseM4bToolJobs } from './m4b-tool.js'

interface ConvertibleAudiobookFile {
  expectedFilename: string
  narrator?: string
  performer: string
  sourcePath: string
  title: string
}

export interface ConvertFileOptions {
  author?: string
  concurrency: string
  destDir: string
  execute?: boolean
  fileName: string[]
  jobs: string
  narrator?: string
  title?: string
}

export interface ConvertFileRow {
  action: 'converted' | 'would convert'
  destination: string
  narrator?: string
  performer: string
  source: string
  title: string
}

interface ExplicitAudiobookMetadata {
  author: string
  narrator: string
  title: string
}

function parseExplicitMetadata(options: ConvertFileOptions): ExplicitAudiobookMetadata | undefined {
  const providedOptionCount = [options.author, options.title, options.narrator]
    .filter(option => option !== undefined)
    .length

  if (providedOptionCount === 0) {
    return undefined
  }

  if (providedOptionCount !== 3 || options.author === undefined || options.title === undefined || options.narrator === undefined) {
    throw new UserInputError('--author, --title, and --narrator must be provided together')
  }

  return {
    author: options.author,
    narrator: options.narrator,
    title: options.title,
  }
}

function parseConcurrency(concurrencyOption: string): number {
  const concurrency = Number(concurrencyOption)

  if (!Number.isInteger(concurrency) || concurrency < 1) {
    throw new UserInputError('--concurrency must be a positive integer')
  }

  return concurrency
}

function toError(reason: unknown): Error {
  return reason instanceof Error ? reason : new Error(String(reason))
}

async function readConvertibleAudiobookFile(
  fileName: string,
  explicitMetadata: ExplicitAudiobookMetadata | undefined,
): Promise<ConvertibleAudiobookFile> {
  const sourcePath = resolve(fileName)
  const sourceStats = await stat(sourcePath)

  if (!sourceStats.isFile()) {
    throw new UserInputError(`"${fileName}" is not a file`)
  }

  if (explicitMetadata !== undefined) {
    return {
      expectedFilename: `${explicitMetadata.author} - ${explicitMetadata.title}.m4b`,
      narrator: explicitMetadata.narrator,
      performer: explicitMetadata.author,
      sourcePath,
      title: explicitMetadata.title,
    }
  }

  const metadata = await parseFile(sourcePath)
  const performer = metadata.common.artist ?? ''
  const title = metadata.common.album ?? ''
  const missingFields = [
    performer === '' ? 'performer' : undefined,
    title === '' ? 'album title' : undefined,
  ].filter((field): field is string => field !== undefined)

  if (missingFields.length > 0) {
    throw new UserInputError(`${basename(sourcePath)} is missing required metadata: ${missingFields.join(', ')}`)
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

export async function convertAudiobookFiles(options: ConvertFileOptions): Promise<ConvertFileRow[]> {
  const concurrency = parseConcurrency(options.concurrency)
  const jobs = parseM4bToolJobs(options.jobs)
  const destinationDirectory = resolve(options.destDir)
  const explicitMetadata = parseExplicitMetadata(options)
  const audiobookFiles = await Promise.all(
    options.fileName.map(fileName => readConvertibleAudiobookFile(fileName, explicitMetadata)),
  )
  const destinations = new Set<string>()

  if (audiobookFiles.length === 0) {
    throw new UserInputError('at least one --file-name is required')
  }

  for (const audiobookFile of audiobookFiles) {
    if (destinations.has(audiobookFile.expectedFilename)) {
      throw new UserInputError(`Multiple source files resolve to "${audiobookFile.expectedFilename}"`)
    }
    destinations.add(audiobookFile.expectedFilename)

    if (await pathExists(join(destinationDirectory, audiobookFile.expectedFilename))) {
      throw new UserInputError(`Destination file already exists: ${audiobookFile.expectedFilename}`)
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

  return audiobookFiles.map(audiobookFile => ({
    action: options.execute === true ? 'converted' : 'would convert',
    destination: audiobookFile.expectedFilename,
    ...(audiobookFile.narrator === undefined ? {} : { narrator: audiobookFile.narrator }),
    performer: audiobookFile.performer,
    source: basename(audiobookFile.sourcePath),
    title: audiobookFile.title,
  }))
}
