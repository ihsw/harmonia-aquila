import type { Command } from 'commander'
import { parseFile } from 'music-metadata'
import { resolve } from 'node:path'
import pLimit from 'p-limit'

import {
  formatAudioBitrate,
  formatAudioDuration,
  formatAudioSampleRate,
  getAudioFiles,
  parseLimit,
} from '../command-utils.js'

interface AudioMetadataRow {
  album: string
  grouping: string
  artist: string
  albumartist: string
  bitrate: string
  duration: string
  filename: string
  sampleRate: string
  title: string
  year: number | string
  subtitle: string
}

export function registerSummarizeSourceDirCommand(program: Command): void {
  const summarizeSourceDirCommand = program
    .command('summarize-source-dir')
    .description('List FLAC and MP3 files and metadata in a source directory')
    .requiredOption('--dir-name <dirName>', 'directory to list')
    .option('--limit <count>', 'maximum number of files to list')
    .action(async (options: { dirName: string, limit?: string }) => {
      const { files, targetDirectory } = await getAudioFiles(summarizeSourceDirCommand, options.dirName)
      const limit = parseLimit(summarizeSourceDirCommand, options.limit)
      const filesToSummarize = limit === undefined ? files : files.slice(0, limit)
      const parseMetadata = pLimit(16)
      const metadataRows = await Promise.all(
        filesToSummarize.map(file => parseMetadata(async (): Promise<AudioMetadataRow> => {
          const metadata = await parseFile(resolve(targetDirectory, file.name))

          return {
            album: metadata.common.album ?? '',
            albumartist: metadata.common.albumartist ?? '',
            artist: metadata.common.artist ?? '',
            bitrate: formatAudioBitrate(metadata.format.bitrate),
            duration: formatAudioDuration(metadata.format.duration),
            filename: file.name,
            grouping: metadata.common.grouping ?? '',
            sampleRate: formatAudioSampleRate(metadata.format.sampleRate),
            subtitle: metadata.common.subtitle?.[0] ?? '',
            title: metadata.common.title ?? '',
            year: metadata.common.year ?? '',
          }
        })),
      )

      console.table(metadataRows)
    })
}
