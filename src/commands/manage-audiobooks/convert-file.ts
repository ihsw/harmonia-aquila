import type { Command } from 'commander'
import { parseFile } from 'music-metadata'
import { mkdir, stat } from 'node:fs/promises'
import { basename, dirname, join, resolve } from 'node:path'

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
  destDir: string
  execute?: boolean
  fileName: string
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

export function registerConvertAudiobookFileCommand(program: Command): void {
  const convertFileCommand = program
    .command('convert-file')
    .description('Convert one audiobook file into a metadata-named M4B file')
    .requiredOption('--file-name <fileName>', 'audiobook file to convert')
    .requiredOption('--dest-dir <destDir>', 'directory for the converted M4B file')
    .option('--jobs <jobs>', 'm4b-tool merge jobs', '16')
    .option('--execute', 'run m4b-tool merge')
    .option('--format <format>', 'output format: plaintext, json', 'plaintext')
    .action(async (options: ConvertFileOptions) => {
      const outputFormat = parseOutputFormat(convertFileCommand, options.format)
      const jobs = parseM4bToolJobs(convertFileCommand, options.jobs)
      const audiobookFile = await readConvertibleAudiobookFile(options.fileName)
      const destinationDirectory = resolve(options.destDir)
      const destinationPath = join(destinationDirectory, audiobookFile.expectedFilename)

      if (await pathExists(destinationPath)) {
        convertFileCommand.error(`Destination file already exists: ${audiobookFile.expectedFilename}`)
      }

      if (options.execute === true) {
        await mkdir(destinationDirectory, { recursive: true })
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

      const rows: ConvertFileRow[] = [{
        action: options.execute === true ? 'converted' : 'would convert',
        destination: audiobookFile.expectedFilename,
        performer: audiobookFile.performer,
        source: basename(audiobookFile.sourcePath),
        title: audiobookFile.title,
      }]

      writeRows(
        outputFormat,
        rows,
        options.execute === true ? undefined : 'Dry run: no files were converted. Pass --execute to run m4b-tool.',
      )
    })
}
