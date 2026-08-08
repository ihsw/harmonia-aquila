import { z } from 'zod/v4'

import { albumSetMetadataRecordsSchema } from '../album-set-metadata.js'

export const MANAGE_ALBUMS_LIST_TOOL_NAME = 'manage_albums_list'
export const MANAGE_ALBUMS_SUMMARIZE_SOURCE_DIR_TOOL_NAME = 'manage_albums_summarize_source_dir'
export const MANAGE_ALBUMS_VALIDATE_TOOL_NAME = 'manage_albums_validate'
export const MANAGE_ALBUMS_ORGANIZE_FILES_TOOL_NAME = 'manage_albums_organize_files'

const albumDirSchema = z.string().min(1, 'albumDir is required').endsWith('/', 'albumDir must end with /')
const albumDirsSchema = z.array(albumDirSchema)
  .min(2, 'albumDirs must contain at least two entries')
  .refine((value) => {
    return new Set(value).size === value.length
  }, 'albumDirs must contain unique entries')

export const manageAlbumsListInputSchema = {
  prefix: z.string().optional(),
}

export const manageAlbumsSummarizeSourceDirInputSchema = {
  dirName: z.string().min(1, 'dirName is required'),
  ignoreNonAudioFiles: z.boolean().optional(),
  limit: z.number().int().nonnegative().optional(),
}

export const manageAlbumsValidateInputSchema = {
  artistFilenameStrategy: z.string().optional(),
  dirName: z.string().min(1, 'dirName is required'),
  ignoreNonAudioFiles: z.boolean().optional(),
  limit: z.number().int().nonnegative().optional(),
  titleFilenameStrategy: z.string().optional(),
}

export const manageAlbumsOrganizeFilesInputSchema = {
  albumArtStrategy: z.string().optional(),
  albumArtistsStrategy: z.string().optional(),
  albumDir: albumDirSchema.optional(),
  albumDirs: albumDirsSchema.optional(),
  albumStrategy: z.string().optional(),
  allowMultipleAlbums: z.boolean().optional(),
  artistFilenameStrategy: z.string().optional(),
  destinationStrategy: z.string().optional(),
  discStrategy: z.string().optional(),
  execute: z.boolean().optional(),
  ignoreAudioFilesWithoutTracks: z.boolean().optional(),
  ignoreNonAudioFiles: z.boolean().optional(),
  limit: z.number().int().nonnegative().optional(),
  producerStrategy: z.string().optional(),
  resetTrack: z.boolean().optional(),
  setAlbum: z.string().optional(),
  setAlbumArtist: z.string().optional(),
  setArtist: z.string().optional(),
  setMetadata: albumSetMetadataRecordsSchema.optional(),
  swapArtistAlbumartist: z.boolean().optional(),
  titleFilenameStrategy: z.string().optional(),
}
