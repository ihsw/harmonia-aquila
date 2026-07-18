import { parseFile } from 'music-metadata'
import { resolve } from 'node:path'
import pLimit from 'p-limit'

import {
  formatAudioBitrate,
  formatAudioDuration,
  formatAudioSampleRate,
  getAudioFiles,
  parseLimit,
} from './audio-files.js'

export interface SummarizeSourceDirOptions {
  dirName: string
  ignoreNonAudioFiles?: boolean
  limit?: string
}

export interface SummarizeSourceDirJsonOutputRow {
  album: string
  grouping: string
  artist: string
  albumartist: string
  bitrate: string
  duration: string
  filename: string
  originalalbum: string
  sampleRate: string
  title: string
  year: number | string
  subtitle: string
  publisher: string
  label: string
}

export type SummarizeSourceDirJsonOutput = SummarizeSourceDirJsonOutputRow[]

export async function summarizeAlbumSourceDir(options: SummarizeSourceDirOptions): Promise<SummarizeSourceDirJsonOutput> {
  const limit = parseLimit(options.limit)
  const { files, targetDirectory } = await getAudioFiles(
    options.dirName,
    { ignoreNonAudioFiles: options.ignoreNonAudioFiles === true },
  )
  const filesToSummarize = limit === undefined ? files : files.slice(0, limit)
  const parseMetadata = pLimit(16)

  return Promise.all(
    filesToSummarize.map(file => parseMetadata(async (): Promise<SummarizeSourceDirJsonOutputRow> => {
      const metadata = await parseFile(resolve(targetDirectory, file.name))

      return {
        album: metadata.common.album ?? '',
        albumartist: metadata.common.albumartist ?? '',
        artist: metadata.common.artist ?? '',
        bitrate: formatAudioBitrate(metadata.format.bitrate),
        duration: formatAudioDuration(metadata.format.duration),
        filename: file.name,
        grouping: metadata.common.grouping ?? '',
        label: metadata.common.label?.[0] ?? '',
        originalalbum: metadata.common.originalalbum ?? '',
        publisher: metadata.common.publisher?.[0] ?? '',
        sampleRate: formatAudioSampleRate(metadata.format.sampleRate),
        subtitle: metadata.common.subtitle?.[0] ?? '',
        title: metadata.common.title ?? '',
        year: metadata.common.year ?? '',
      }
    })),
  )
}
