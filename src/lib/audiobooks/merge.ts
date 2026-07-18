import { parseFile } from 'music-metadata'
import { mkdir, readdir } from 'node:fs/promises'
import { basename, extname, join, relative, resolve } from 'node:path'

import { pathExists } from '../../command-utils.js'
import { UserInputError } from '../errors.js'

import { readAudiobookFile } from './audiobook-file.js'
import { mergeWithM4bTool, parseM4bToolJobs } from './m4b-tool.js'

interface AudiobookGroup {
  destinationFilename: string
  metadata?: {
    performer: string
    title: string
  }
  sourcePaths: string[]
}

export interface MergeAudiobookRow {
  action: 'merged' | 'would merge'
  destination: string
  metadataBypassed: boolean
  performer: string | null
  sourceFiles: number
  title: string | null
}

export interface MergeOptions {
  bypassMetadata?: boolean
  destDir: string
  execute?: boolean
  jobs: string
  sourceDir: string
}

const MERGEABLE_AUDIO_EXTENSIONS = new Set(['.m4b', '.mp3'])

function getGroupKey(parentDirectory: string, performer: string, title: string): string {
  return JSON.stringify([parentDirectory, performer, title])
}

async function findMergeableAudiobookFiles(directory: string): Promise<string[]> {
  const directoryEntries = await readdir(directory, { withFileTypes: true })
  const files: string[] = []

  for (const directoryEntry of directoryEntries.sort((left, right) => left.name.localeCompare(right.name, undefined, { numeric: true }))) {
    const entryPath = join(directory, directoryEntry.name)

    if (directoryEntry.isDirectory()) {
      files.push(...await findMergeableAudiobookFiles(entryPath))
    }
    else if (directoryEntry.isFile() && MERGEABLE_AUDIO_EXTENSIONS.has(extname(directoryEntry.name).toLowerCase())) {
      files.push(entryPath)
    }
  }

  return files
}

async function getAudiobookGroups(sourceDirectory: string, bypassMetadata: boolean): Promise<AudiobookGroup[]> {
  const audiobookFiles = await findMergeableAudiobookFiles(sourceDirectory)

  if (audiobookFiles.length === 0) {
    throw new UserInputError(`"${sourceDirectory}" contains no M4B or MP3 files`)
  }

  if (bypassMetadata) {
    return [{
      destinationFilename: `${basename(sourceDirectory)}.m4b`,
      sourcePaths: audiobookFiles,
    }]
  }

  const groups = new Map<string, AudiobookGroup>()

  for (const sourcePath of audiobookFiles) {
    const metadata = await parseFile(sourcePath)
    const performer = metadata.common.artist ?? ''
    const title = metadata.common.album ?? metadata.common.title ?? ''

    if (performer === '' || title === '') {
      const missingFields = [
        performer === '' ? 'performer' : undefined,
        title === '' ? 'album title' : undefined,
      ].filter((field): field is string => field !== undefined)
      throw new UserInputError(`${relative(sourceDirectory, sourcePath)} is missing required metadata: ${missingFields.join(', ')}`)
    }

    const parentDirectory = relative(sourceDirectory, resolve(sourcePath, '..'))
    const groupKey = getGroupKey(parentDirectory, performer, title)
    const group = groups.get(groupKey)

    if (group === undefined) {
      groups.set(groupKey, {
        destinationFilename: `${performer} - ${title}.m4b`,
        metadata: { performer, title },
        sourcePaths: [sourcePath],
      })
    }
    else {
      group.sourcePaths.push(sourcePath)
    }
  }

  return [...groups.values()].sort((left, right) => (
    left.destinationFilename.localeCompare(right.destinationFilename)
  ))
}

function destinationFilename(group: AudiobookGroup): string {
  return group.destinationFilename
}

export async function mergeAudiobooks(options: MergeOptions): Promise<MergeAudiobookRow[]> {
  const jobs = parseM4bToolJobs(options.jobs)
  const sourceDirectory = resolve(options.sourceDir)
  const destinationDirectory = resolve(options.destDir)
  const groups = await getAudiobookGroups(sourceDirectory, options.bypassMetadata === true)
  const destinations = new Set<string>()

  for (const group of groups) {
    const filename = destinationFilename(group)
    const destinationPath = join(destinationDirectory, filename)

    if (destinations.has(filename)) {
      throw new UserInputError(`Multiple audiobook groups resolve to "${filename}"`)
    }
    destinations.add(filename)

    if (await pathExists(destinationPath)) {
      throw new UserInputError(`Destination file already exists: ${filename}`)
    }
  }

  const rows: MergeAudiobookRow[] = groups.map(group => ({
    action: options.execute === true ? 'merged' : 'would merge',
    destination: destinationFilename(group),
    metadataBypassed: group.metadata === undefined,
    performer: group.metadata?.performer ?? null,
    sourceFiles: group.sourcePaths.length,
    title: group.metadata?.title ?? null,
  }))

  if (options.execute === true) {
    await mkdir(destinationDirectory, { recursive: true })

    for (const group of groups) {
      await mergeWithM4bTool({
        destinationDirectory,
        destinationFilename: destinationFilename(group),
        jobs,
        sourceDirectory,
        sourcePaths: group.sourcePaths,
        ...(group.metadata === undefined
          ? {}
          : {
              performer: group.metadata.performer,
              title: group.metadata.title,
            }),
      })

      if (group.metadata !== undefined) {
        const destinationPath = join(destinationDirectory, destinationFilename(group))
        const audiobookFile = await readAudiobookFile(destinationPath)

        if (audiobookFile.filename !== audiobookFile.expectedFilename) {
          throw new Error(`${audiobookFile.filename} does not match metadata; expected "${audiobookFile.expectedFilename}"`)
        }
      }
    }
  }

  return rows
}
