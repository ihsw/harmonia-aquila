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
  parseOutputFormat,
  writeRows,
} from '../command-utils.js'

export interface SummarizeSourceDirJsonOutputRow {
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
  publisher: string
  label: string
}

export type SummarizeSourceDirJsonOutput = SummarizeSourceDirJsonOutputRow[]

export function registerSummarizeSourceDirCommand(program: Command): void {
  const summarizeSourceDirCommand = program
    .command('summarize-source-dir')
    .description('List FLAC and MP3 files and metadata in a source directory')
    .requiredOption('--dir-name <dirName>', 'directory to list')
    .option('--limit <count>', 'maximum number of files to list')
    .option('--format <format>', 'output format: plaintext, json', 'plaintext')
    .action(async (options: { dirName: string, format?: string, limit?: string }) => {
      const limit = parseLimit(summarizeSourceDirCommand, options.limit)
      const outputFormat = parseOutputFormat(summarizeSourceDirCommand, options.format)
      const { files, targetDirectory } = await getAudioFiles(summarizeSourceDirCommand, options.dirName)
      const filesToSummarize = limit === undefined ? files : files.slice(0, limit)
      const parseMetadata = pLimit(16)
      const metadataRows: SummarizeSourceDirJsonOutput = await Promise.all(
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
            publisher: metadata.common.publisher?.[0] ?? '',
            sampleRate: formatAudioSampleRate(metadata.format.sampleRate),
            subtitle: metadata.common.subtitle?.[0] ?? '',
            title: metadata.common.title ?? '',
            year: metadata.common.year ?? '',
          }
        })),
      )

      writeRows(outputFormat, metadataRows)
    })
}
