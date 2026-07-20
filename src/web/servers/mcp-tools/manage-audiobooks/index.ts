import type { WebMcpToolContext, WebMcpToolRegistration } from '../types.js'

import { createManageAudiobooksConvertFileTool } from './convert-file.js'
import { createManageAudiobooksCopyAndRenameTool } from './copy-and-rename.js'
import { createManageAudiobooksCrawlTool } from './crawl.js'
import { createManageAudiobooksMergeTool } from './merge.js'
import { createManageAudiobooksSetMetadataTool } from './set-metadata.js'
import { createManageAudiobooksValidateTool } from './validate.js'

export function getManageAudiobooksMcpTools(context: WebMcpToolContext): readonly WebMcpToolRegistration[] {
  return [
    createManageAudiobooksValidateTool(context),
    createManageAudiobooksCrawlTool(context),
    createManageAudiobooksCopyAndRenameTool(context),
    createManageAudiobooksConvertFileTool(context),
    createManageAudiobooksMergeTool(context),
    createManageAudiobooksSetMetadataTool(context),
  ]
}
