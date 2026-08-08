import type { Command } from 'commander'

import { parseOutputFormat, writeRows } from '../../command-utils.js'
import {
  organizeAlbumFiles,
  type OrganizeFilesJsonOutput,
  type OrganizeFilesOptions,
  type OrganizeFilesSourceOptions,
} from '../../lib/albums/organize-files.js'
import { UserInputError } from '../../lib/errors.js'

export type { OrganizeFilesJsonOutput, OrganizeFilesJsonOutputRow } from '../../lib/albums/organize-files.js'

type CliOrganizeOptions = Omit<OrganizeFilesOptions, keyof OrganizeFilesSourceOptions> & {
  format?: string
  sourceDir?: string
  sourceDirs?: string[]
}

function normalizeSourceOptions(
  command: Command,
  options: CliOrganizeOptions,
): OrganizeFilesOptions {
  const { sourceDir, sourceDirs, ...rest } = options

  if (sourceDir !== undefined && sourceDirs !== undefined) {
    command.error('--source-dir conflicts with --source-dirs')
  }
  if (sourceDir !== undefined) {
    return { ...rest, sourceDir }
  }
  if (sourceDirs !== undefined) {
    return { ...rest, sourceDirs }
  }
  command.error('one of --source-dir or --source-dirs is required')
}

export function registerOrganizeFilesCommand(program: Command): void {
  const organizeFilesCommand = program
    .command('organize-files')
    .description('Repair and organize albums plus adjacent album art; one album per run unless --allow-multiple-albums')
    .option('--source-dir <sourceDir>', 'directory containing FLAC/MP3 album files and optional album art')
    .option('--source-dirs <sourceDirs...>', 'ordered flat album directories treated as discs in one flat album output')
    .requiredOption('--dest-dir <destDir>', 'directory to copy organized files into')
    .option('--limit <count>', 'maximum number of files to copy')
    .option('--destination-strategy <strategy>', 'what to do when a destination file exists: error, ignore, overwrite', 'error')
    .option('--album-strategy <strategy>', 'how to update album: no change, grouping, originalalbum', 'no change')
    .option('--set-album <album>', 'set album metadata to the provided value')
    .option('--album-artists-strategy <strategy>', 'how to update albumartists: no change, aggregate, blank', 'no change')
    .option('--album-art-strategy <strategy>', 'how to resolve duplicate album-art destinations across sourceDirs: first, last, neither')
    .option('--set-album-artist <albumArtist>', 'set album artist metadata to the provided value')
    .option('--set-artist <artist>', 'set artist metadata to the provided value')
    .option('--set-metadata <path>', 'set per-track metadata, including optional disc and year fields, from JSON or CSV')
    .option('--disc-strategy <strategy>', 'disc metadata strategy: no change, infer, or concatenate ordered directories as discs', 'no change')
    .option('--producer-strategy <strategy>', 'how to update producers: no change, blank, aggregate, copy-from-album-artists', 'no change')
    .option('--reset-track', 'reset track number metadata from alphabetical source order within each album')
    .option('--swap-artist-albumartist', 'swap artist and albumartist metadata')
    .option('--artist-filename-strategy <strategy>', 'metadata field to use for the artist portion of the filename: artist, albumartist, label, producer', 'artist')
    .option('--title-filename-strategy <strategy>', 'metadata field to use for the title portion of the filename: subtitle, title', 'title')
    .option('--ignore-non-audio-files', 'ignore non-audio files in the source directory')
    .option('--ignore-audio-files-without-tracks', 'ignore audio files without track number metadata')
    .option('--allow-multiple-albums', 'organize a source directory holding more than one album in one run; album art is excluded when several albums resolve')
    .option('--execute', 'repair metadata and copy files into organized destinations')
    .option('--format <format>', 'output format: plaintext, json', 'plaintext')
    .action(async (options: CliOrganizeOptions) => {
      const outputFormat = parseOutputFormat(organizeFilesCommand, options.format)
      let outputRows: OrganizeFilesJsonOutput

      try {
        outputRows = await organizeAlbumFiles(normalizeSourceOptions(organizeFilesCommand, options))
      }
      catch (error) {
        if (error instanceof UserInputError) {
          organizeFilesCommand.error(error.message)
        }

        throw error
      }
      writeRows(
        outputFormat,
        outputRows,
        options.execute === true
          ? undefined
          : 'Dry run: no files were copied or changed. Pass --execute to repair metadata and organize audio plus album art.',
      )
    })
}
