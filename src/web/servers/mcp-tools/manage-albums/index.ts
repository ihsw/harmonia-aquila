import type { WebMcpToolContext } from '../types.js'

import { createManageAlbumsSummarizeSourceDirTool } from './summarize-source-dir.js'

export function getManageAlbumsMcpTools(context: WebMcpToolContext) {
  return [
    createManageAlbumsSummarizeSourceDirTool(context),
  ] as const
}
