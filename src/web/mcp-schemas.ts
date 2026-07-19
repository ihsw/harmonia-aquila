import { z } from 'zod/v4'

export const MANAGE_ALBUMS_SUMMARIZE_SOURCE_DIR_TOOL_NAME = 'manage_albums_summarize_source_dir'

export const manageAlbumsSummarizeSourceDirInputSchema = {
  dirName: z.string().min(1, 'dirName is required'),
  ignoreNonAudioFiles: z.boolean().optional(),
  limit: z.number().int().nonnegative().optional(),
}
