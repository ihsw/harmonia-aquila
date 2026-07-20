import { z } from 'zod/v4'

export const MANAGE_AUDIOBOOKS_VALIDATE_TOOL_NAME = 'manage_audiobooks_validate'
export const MANAGE_AUDIOBOOKS_CRAWL_TOOL_NAME = 'manage_audiobooks_crawl'
export const MANAGE_AUDIOBOOKS_COPY_AND_RENAME_TOOL_NAME = 'manage_audiobooks_copy_and_rename'
export const MANAGE_AUDIOBOOKS_CONVERT_FILE_TOOL_NAME = 'manage_audiobooks_convert_file'
export const MANAGE_AUDIOBOOKS_MERGE_TOOL_NAME = 'manage_audiobooks_merge'
export const MANAGE_AUDIOBOOKS_SET_METADATA_TOOL_NAME = 'manage_audiobooks_set_metadata'

export const manageAudiobooksValidateInputSchema = {
  fileName: z.string().min(1, 'fileName is required'),
}

export const manageAudiobooksCrawlInputSchema = {
  dirName: z.string().min(1, 'dirName is required'),
}

export const manageAudiobooksCopyAndRenameInputSchema = {
  execute: z.boolean().optional(),
  fileName: z.string().min(1, 'fileName is required'),
}

export const manageAudiobooksConvertFileInputSchema = {
  author: z.string().optional(),
  concurrency: z.number().int().positive().optional(),
  execute: z.boolean().optional(),
  fileName: z.array(z.string().min(1, 'fileName is required')).min(1, 'at least one fileName is required'),
  jobs: z.number().int().positive().optional(),
  narrator: z.string().optional(),
  title: z.string().optional(),
}

export const manageAudiobooksMergeInputSchema = {
  bypassMetadata: z.boolean().optional(),
  execute: z.boolean().optional(),
  jobs: z.number().int().positive().optional(),
}

export const manageAudiobooksSetMetadataInputSchema = {
  author: z.string().min(1, 'author is required'),
  destFilepath: z.string().min(1, 'destFilepath is required'),
  execute: z.boolean().optional(),
  narrator: z.string().optional(),
  sourceFilepath: z.string().min(1, 'sourceFilepath is required'),
  title: z.string().min(1, 'title is required'),
}
