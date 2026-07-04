import type { Command } from 'commander'
import type { Dirent } from 'node:fs'
import { readdir, stat } from 'node:fs/promises'
import { resolve } from 'node:path'

export interface Mp3FilesResult {
  files: Dirent[]
  targetDirectory: string
}

export async function getMp3Files(command: Command, dirName: string): Promise<Mp3FilesResult> {
  const targetDirectory = resolve(dirName)
  const directoryStats = await stat(targetDirectory)

  if (!directoryStats.isDirectory()) {
    command.error(`"${dirName}" is not a directory`)
  }

  const files = await readdir(targetDirectory, { withFileTypes: true })
  const invalidFiles = files.filter(
    file => !file.isFile() || !file.name.toLowerCase().endsWith('.mp3'),
  )

  if (invalidFiles.length > 0) {
    command.error(
      `"${dirName}" must contain only MP3 files. Invalid entries: ${invalidFiles
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

export function formatMp3Duration(durationInSeconds: number | undefined): string {
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

export function formatMp3Bitrate(bitrateInBitsPerSecond: number | undefined): string {
  if (bitrateInBitsPerSecond === undefined) {
    return ''
  }

  const bitrateInKilobitsPerSecond = bitrateInBitsPerSecond / 1000

  return `${new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 1,
  }).format(bitrateInKilobitsPerSecond)} kbps`
}

export function formatMp3SampleRate(sampleRateInHertz: number | undefined): string {
  if (sampleRateInHertz === undefined) {
    return ''
  }

  const sampleRateInKilohertz = sampleRateInHertz / 1000

  return `${new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 1,
  }).format(sampleRateInKilohertz)} kHz`
}
