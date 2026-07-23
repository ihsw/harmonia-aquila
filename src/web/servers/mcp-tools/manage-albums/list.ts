import { listAlbumSourceDir } from '../../../../lib/albums/list.js'
import { MANAGE_ALBUMS_LIST_TOOL_NAME, manageAlbumsListInputSchema } from '../../../schemas/mcp/manage-albums.js'
import { optionalEntry } from '../../../schemas/request-schemas.js'
import { jsonToolContent } from '../helpers.js'
import { defineWebMcpTool, type WebMcpToolContext, type WebMcpToolRegistration } from '../types.js'

export function createManageAlbumsListTool(context: WebMcpToolContext): WebMcpToolRegistration {
  return defineWebMcpTool({
    handler: async (input) => {
      const paths = await listAlbumSourceDir({
        sourceDir: context.pathResolver.sourceDir,
        ...optionalEntry('prefix', input.prefix),
      })
      return jsonToolContent(paths)
    },
    name: MANAGE_ALBUMS_LIST_TOOL_NAME,
    options: {
      annotations: { readOnlyHint: true },
      description: 'List immediate entries under the configured source directory.',
      inputSchema: manageAlbumsListInputSchema,
      title: 'Manage albums list source directory',
    },
  })
}
