import { summarizeAlbumSourceDir } from '../../../../lib/albums/summarize-source-dir.js'
import {
  MANAGE_ALBUMS_SUMMARIZE_SOURCE_DIR_TOOL_NAME,
  manageAlbumsSummarizeSourceDirInputSchema,
} from '../../../schemas/mcp/manage-albums.js'
import { optionalEntry } from '../../../schemas/request-schemas.js'
import type { WebMcpToolContext, WebMcpToolRegistration } from '../types.js'

export function createManageAlbumsSummarizeSourceDirTool(
  context: WebMcpToolContext,
): WebMcpToolRegistration<typeof manageAlbumsSummarizeSourceDirInputSchema> {
  return {
    handler: async (input) => {
      const rows = await summarizeAlbumSourceDir({
        dirName: await context.pathResolver.resolveSource(input.dirName, 'dirName'),
        ...optionalEntry('ignoreNonAudioFiles', input.ignoreNonAudioFiles),
        ...optionalEntry('limit', input.limit === undefined ? undefined : String(input.limit)),
      })

      return {
        content: [
          {
            text: JSON.stringify(rows),
            type: 'text',
          },
        ],
      }
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
  }
}
