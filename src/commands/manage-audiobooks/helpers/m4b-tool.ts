import type { Command } from 'commander'
import { spawn } from 'node:child_process'
import { relative } from 'node:path'

const M4B_TOOL_IMAGE = 'sandreas/m4b-tool:latest'

export interface M4bToolMergeOptions {
  destinationDirectory: string
  destinationFilename: string
  jobs: number
  performer: string
  sourceDirectory: string
  sourcePaths: readonly string[]
  title: string
}

export function parseM4bToolJobs(command: Command, jobsOption: string): number {
  const jobs = Number(jobsOption)

  if (!Number.isInteger(jobs) || jobs < 1) {
    command.error('--jobs must be a positive integer')
  }

  return jobs
}

export async function mergeWithM4bTool(options: M4bToolMergeOptions): Promise<void> {
  const uid = process.getuid?.()
  const gid = process.getgid?.()

  if (uid === undefined || gid === undefined) {
    throw new Error('m4b-tool conversion requires a POSIX user and group ID')
  }

  const sourceArguments = options.sourcePaths.map(sourcePath => (
    `/source/${relative(options.sourceDirectory, sourcePath)}`
  ))
  const dockerArguments = [
    'run',
    '--rm',
    '-u',
    `${String(uid)}:${String(gid)}`,
    '-v',
    `${options.sourceDirectory}:/source:ro`,
    '-v',
    `${options.destinationDirectory}:/dest`,
    M4B_TOOL_IMAGE,
    'merge',
    '--jobs',
    String(options.jobs),
    '--output-file',
    `/dest/${options.destinationFilename}`,
    '--artist',
    options.performer,
    '--name',
    options.title,
    '--album',
    options.title,
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
