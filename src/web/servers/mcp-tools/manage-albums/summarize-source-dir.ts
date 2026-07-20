import { summarizeAlbumSourceDir } from '../../../../lib/albums/summarize-source-dir.js'
import {
  MANAGE_ALBUMS_SUMMARIZE_SOURCE_DIR_TOOL_NAME,
  manageAlbumsSummarizeSourceDirInputSchema,
} from '../../../schemas/mcp/manage-albums.js'
import { optionalEntry } from '../../../schemas/request-schemas.js'
import { jsonToolContent, optionalNumberEntry } from '../helpers.js'
import { defineWebMcpTool, type WebMcpToolContext, type WebMcpToolRegistration } from '../types.js'

export function createManageAlbumsSummarizeSourceDirTool(
  context: WebMcpToolContext,
): WebMcpToolRegistration {
  return defineWebMcpTool({
    handler: async (input) => {
      const rows = await summarizeAlbumSourceDir({
        dirName: await context.pathResolver.resolveSource(input.dirName, 'dirName'),
        ...optionalEntry('ignoreNonAudioFiles', input.ignoreNonAudioFiles),
        ...optionalNumberEntry('limit', input.limit),
      })

      return jsonToolContent(rows)
    },
    name: MANAGE_ALBUMS_SUMMARIZE_SOURCE_DIR_TOOL_NAME,
    options: {
      annotations: {
        readOnlyHint: true,
      },
      description: 'Summarize FLAC and MP3 metadata under the configured source directory.',
      inputSchema: manageAlbumsSummarizeSourceDirInputSchema,
      title: 'Manage albums summarize source directory',
    },
  })
}
