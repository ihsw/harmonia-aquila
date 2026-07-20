import type { WebMcpToolContext, WebMcpToolRegistration } from '../types.js'

import { createManageAlbumsFixTagsTool } from './fix-tags.js'
import { createManageAlbumsOrganizeFilesTool } from './organize-files.js'
import { createManageAlbumsSummarizeSourceDirTool } from './summarize-source-dir.js'

export function getManageAlbumsMcpTools(context: WebMcpToolContext): readonly WebMcpToolRegistration[] {
  return [
    createManageAlbumsSummarizeSourceDirTool(context),
    createManageAlbumsFixTagsTool(context),
    createManageAlbumsOrganizeFilesTool(context),
  ]
}
