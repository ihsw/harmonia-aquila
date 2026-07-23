import { z } from 'zod/v4'

export const MANAGE_ALBUMS_LIST_TOOL_NAME = 'manage_albums_list'
export const MANAGE_ALBUMS_SUMMARIZE_SOURCE_DIR_TOOL_NAME = 'manage_albums_summarize_source_dir'
export const MANAGE_ALBUMS_VALIDATE_TOOL_NAME = 'manage_albums_validate'
export const MANAGE_ALBUMS_FIX_TAGS_TOOL_NAME = 'manage_albums_fix_tags'
export const MANAGE_ALBUMS_ORGANIZE_FILES_TOOL_NAME = 'manage_albums_organize_files'

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

export const manageAlbumsFixTagsInputSchema = {
  albumArtistsStrategy: z.string().optional(),
  albumStrategy: z.string().optional(),
  destinationStrategy: z.string().optional(),
  execute: z.boolean().optional(),
  limit: z.number().int().nonnegative().optional(),
  producerStrategy: z.string().optional(),
  resetTrack: z.boolean().optional(),
  setAlbum: z.string().optional(),
  setAlbumArtist: z.string().optional(),
  setArtist: z.string().optional(),
  setMetadata: z.string().optional(),
  swapArtistAlbumartist: z.boolean().optional(),
}

export const manageAlbumsOrganizeFilesInputSchema = {
  artistFilenameStrategy: z.string().optional(),
  execute: z.boolean().optional(),
  ignoreAudioFilesWithoutTracks: z.boolean().optional(),
  ignoreNonAudioFiles: z.boolean().optional(),
  limit: z.number().int().nonnegative().optional(),
  titleFilenameStrategy: z.string().optional(),
}
