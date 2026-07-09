import type { Command } from 'commander'
import type { Dirent } from 'node:fs'
import { readdir, stat } from 'node:fs/promises'
import { extname, resolve } from 'node:path'

const SUPPORTED_AUDIO_EXTENSIONS = ['.flac', '.mp3'] as const
const SUPPORTED_AUDIO_EXTENSION_SET = new Set<string>(SUPPORTED_AUDIO_EXTENSIONS)
const SUPPORTED_AUDIO_EXTENSIONS_DISPLAY = SUPPORTED_AUDIO_EXTENSIONS.join(', ')
const OUTPUT_FORMATS = ['plaintext', 'json'] as const

export type OutputFormat = typeof OUTPUT_FORMATS[number]

export interface AudioFilesResult {
  files: Dirent[]
  targetDirectory: string
}

interface GetAudioFilesOptions {
  ignoreNonAudioFiles?: boolean
}

function isSupportedAudioFile(file: Dirent): boolean {
  return file.isFile() && SUPPORTED_AUDIO_EXTENSION_SET.has(extname(file.name).toLowerCase())
}

export async function getAudioFiles(command: Command, dirName: string, options: GetAudioFilesOptions = {}): Promise<AudioFilesResult> {
  const targetDirectory = resolve(dirName)
  const directoryStats = await stat(targetDirectory)

  if (!directoryStats.isDirectory()) {
    command.error(`"${dirName}" is not a directory`)
  }

  const directoryEntries = await readdir(targetDirectory, { withFileTypes: true })
  const files = directoryEntries.filter(isSupportedAudioFile)
  const invalidFiles = directoryEntries.filter(
    file => !isSupportedAudioFile(file),
  )

  if (options.ignoreNonAudioFiles !== true && invalidFiles.length > 0) {
    command.error(
      `"${dirName}" must contain only supported audio files (${SUPPORTED_AUDIO_EXTENSIONS_DISPLAY}). Invalid entries: ${invalidFiles
        .map(file => file.name)
        .join(', ')}`,
    )
  }

  return {
    files,
    targetDirectory,
  }
}

export function parseLimit(command: Command, limitOption: string | undefined): number | undefined {
  const limit = limitOption === undefined ? undefined : Number(limitOption)

  if (limit !== undefined && (!Number.isInteger(limit) || limit < 0)) {
    command.error('--limit must be a non-negative integer')
  }

  return limit
}

function isOutputFormat(value: string): value is OutputFormat {
  return OUTPUT_FORMATS.includes(value as OutputFormat)
}

export function parseOutputFormat(command: Command, formatOption: string | undefined): OutputFormat {
  const outputFormat = formatOption ?? 'plaintext'

  if (!isOutputFormat(outputFormat)) {
    command.error('--format must be one of: plaintext, json')
  }

  return outputFormat
}

export function writeRows(format: OutputFormat, rows: readonly unknown[], plaintextMessage?: string): void {
  if (format === 'json') {
    console.info(JSON.stringify(rows, undefined, 2))

    return
  }

  if (plaintextMessage !== undefined) {
    console.info(plaintextMessage)
  }

  console.table(rows)
}

export async function pathExists(path: string): Promise<boolean> {
  try {
    await stat(path)

    return true
  }
  catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
      return false
    }

    throw error
  }
}

export function formatAudioDuration(durationInSeconds: number | undefined): string {
  if (durationInSeconds === undefined) {
    return ''
  }

  const totalSeconds = Math.round(durationInSeconds)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  const formattedMinutes = minutes.toString()
  const paddedSeconds = seconds.toString().padStart(2, '0')

  if (hours > 0) {
    const formattedHours = hours.toString()
    const paddedMinutes = minutes.toString().padStart(2, '0')

    return `${formattedHours}:${paddedMinutes}:${paddedSeconds}`
  }

  return `${formattedMinutes}:${paddedSeconds}`
}

export function formatAudioBitrate(bitrateInBitsPerSecond: number | undefined): string {
  if (bitrateInBitsPerSecond === undefined) {
    return ''
  }

  const bitrateInKilobitsPerSecond = bitrateInBitsPerSecond / 1000

  return `${new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 1,
  }).format(bitrateInKilobitsPerSecond)} kbps`
}

export function formatAudioSampleRate(sampleRateInHertz: number | undefined): string {
  if (sampleRateInHertz === undefined) {
    return ''
  }

  const sampleRateInKilohertz = sampleRateInHertz / 1000

  return `${new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 1,
  }).format(sampleRateInKilohertz)} kHz`
}
