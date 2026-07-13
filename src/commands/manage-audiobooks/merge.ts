import type { Command } from 'commander'
import { parseFile } from 'music-metadata'
import { spawn } from 'node:child_process'
import { mkdir, readdir } from 'node:fs/promises'
import { extname, join, relative, resolve } from 'node:path'

import { parseOutputFormat, pathExists, writeRows } from '../../command-utils.js'

import { readAudiobookFile } from './helpers/audiobook-file.js'

const M4B_TOOL_IMAGE = 'sandreas/m4b-tool:latest'

interface AudiobookGroup {
  performer: string
  sourcePaths: string[]
  title: string
}

interface MergeAudiobookRow {
  action: 'merged' | 'would merge'
  destination: string
  performer: string
  sourceFiles: number
  title: string
}

interface MergeOptions {
  destDir: string
  execute?: boolean
  format?: string
  jobs: string
  sourceDir: string
}

function getGroupKey(parentDirectory: string, performer: string, title: string): string {
  return JSON.stringify([parentDirectory, performer, title])
}

async function findMp3Files(directory: string): Promise<string[]> {
  const directoryEntries = await readdir(directory, { withFileTypes: true })
  const files: string[] = []

  for (const directoryEntry of directoryEntries.sort((left, right) => left.name.localeCompare(right.name, undefined, { numeric: true }))) {
    const entryPath = join(directory, directoryEntry.name)

    if (directoryEntry.isDirectory()) {
      files.push(...await findMp3Files(entryPath))
    }
    else if (directoryEntry.isFile() && extname(directoryEntry.name).toLowerCase() === '.mp3') {
      files.push(entryPath)
    }
  }

  return files
}

async function getAudiobookGroups(sourceDirectory: string): Promise<AudiobookGroup[]> {
  const groups = new Map<string, AudiobookGroup>()
  const mp3Files = await findMp3Files(sourceDirectory)

  if (mp3Files.length === 0) {
    throw new Error(`"${sourceDirectory}" contains no MP3 files`)
  }

  for (const sourcePath of mp3Files) {
    const metadata = await parseFile(sourcePath)
    const performer = metadata.common.artist ?? ''
    const title = metadata.common.album ?? ''

    if (performer === '' || title === '') {
      const missingFields = [
        performer === '' ? 'performer' : undefined,
        title === '' ? 'album title' : undefined,
      ].filter((field): field is string => field !== undefined)
      throw new Error(`${relative(sourceDirectory, sourcePath)} is missing required metadata: ${missingFields.join(', ')}`)
    }

    const parentDirectory = relative(sourceDirectory, resolve(sourcePath, '..'))
    const groupKey = getGroupKey(parentDirectory, performer, title)
    const group = groups.get(groupKey)

    if (group === undefined) {
      groups.set(groupKey, { performer, sourcePaths: [sourcePath], title })
    }
    else {
      group.sourcePaths.push(sourcePath)
    }
  }

  return [...groups.values()].sort((left, right) => (
    left.performer.localeCompare(right.performer)
    || left.title.localeCompare(right.title)
  ))
}

function destinationFilename(group: AudiobookGroup): string {
  return `${group.performer} - ${group.title}.m4b`
}

function parseJobs(command: Command, jobsOption: string): number {
  const jobs = Number(jobsOption)

  if (!Number.isInteger(jobs) || jobs < 1) {
    command.error('--jobs must be a positive integer')
  }

  return jobs
}

async function runM4bTool(sourceDirectory: string, destinationDirectory: string, group: AudiobookGroup, jobs: number): Promise<void> {
  const uid = process.getuid?.()
  const gid = process.getgid?.()

  if (uid === undefined || gid === undefined) {
    throw new Error('m4b-tool conversion requires a POSIX user and group ID')
  }

  const sourceArguments = group.sourcePaths.map(sourcePath => (
    `/source/${relative(sourceDirectory, sourcePath)}`
  ))
  const destination = `/dest/${destinationFilename(group)}`
  const dockerArguments = [
    'run',
    '--rm',
    '-u',
    `${String(uid)}:${String(gid)}`,
    '-v',
    `${sourceDirectory}:/source:ro`,
    '-v',
    `${destinationDirectory}:/dest`,
    M4B_TOOL_IMAGE,
    'merge',
    '--jobs',
    String(jobs),
    '--output-file',
    destination,
    '--artist',
    group.performer,
    '--name',
    group.title,
    '--album',
    group.title,
    ...sourceArguments,
  ]

  await new Promise<void>((resolvePromise, rejectPromise) => {
    const process = spawn('docker', dockerArguments, { stdio: 'inherit' })

    process.once('error', (error) => {
      rejectPromise(new Error('Unable to start Docker for m4b-tool conversion', { cause: error }))
    })
    process.once('exit', (code, signal) => {
      if (code === 0) {
        resolvePromise()
      }
      else {
        rejectPromise(new Error(`m4b-tool conversion failed with ${signal === null ? (code === null ? 'no exit code' : `exit code ${String(code)}`) : `signal ${signal}`}`))
      }
    })
  })
}

export function registerMergeAudiobooksCommand(program: Command): void {
  const mergeAudiobooksCommand = program
    .command('merge')
    .description('Merge MP3 audiobook groups into metadata-named M4B files')
    .requiredOption('--source-dir <sourceDir>', 'directory to recursively scan for MP3 audiobook files')
    .requiredOption('--dest-dir <destDir>', 'directory for converted M4B files')
    .option('--jobs <jobs>', 'm4b-tool merge jobs per audiobook', '16')
    .option('--execute', 'run m4b-tool merges')
    .option('--format <format>', 'output format: plaintext, json', 'plaintext')
    .action(async (options: MergeOptions) => {
      const outputFormat = parseOutputFormat(mergeAudiobooksCommand, options.format)
      const jobs = parseJobs(mergeAudiobooksCommand, options.jobs)
      const sourceDirectory = resolve(options.sourceDir)
      const destinationDirectory = resolve(options.destDir)
      const groups = await getAudiobookGroups(sourceDirectory)
      const destinations = new Set<string>()

      for (const group of groups) {
        const filename = destinationFilename(group)
        const destinationPath = join(destinationDirectory, filename)

        if (destinations.has(filename)) {
          mergeAudiobooksCommand.error(`Multiple audiobook groups resolve to "${filename}"`)
        }
        destinations.add(filename)

        if (await pathExists(destinationPath)) {
          mergeAudiobooksCommand.error(`Destination file already exists: ${filename}`)
        }
      }

      const rows: MergeAudiobookRow[] = groups.map(group => ({
        action: options.execute === true ? 'merged' : 'would merge',
        destination: destinationFilename(group),
        performer: group.performer,
        sourceFiles: group.sourcePaths.length,
        title: group.title,
      }))

      if (options.execute === true) {
        await mkdir(destinationDirectory, { recursive: true })

        for (const group of groups) {
          await runM4bTool(sourceDirectory, destinationDirectory, group, jobs)
          const destinationPath = join(destinationDirectory, destinationFilename(group))
          const audiobookFile = await readAudiobookFile(destinationPath)

          if (audiobookFile.filename !== audiobookFile.expectedFilename) {
            throw new Error(`${audiobookFile.filename} does not match metadata; expected "${audiobookFile.expectedFilename}"`)
          }
        }
      }

      writeRows(
        outputFormat,
        rows,
        options.execute === true ? undefined : 'Dry run: no files were merged. Pass --execute to run m4b-tool.',
      )
    })
}
