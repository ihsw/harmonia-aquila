import { validateAlbumSourceDir } from '../../../../lib/albums/validate.js'
import {
  MANAGE_ALBUMS_VALIDATE_TOOL_NAME,
  manageAlbumsValidateInputSchema,
} from '../../../schemas/mcp/manage-albums.js'
import { optionalEntry } from '../../../schemas/request-schemas.js'
import { jsonToolContent, optionalNumberEntry } from '../helpers.js'
import { defineWebMcpTool, type WebMcpToolContext, type WebMcpToolRegistration } from '../types.js'

export function createManageAlbumsValidateTool(
  context: WebMcpToolContext,
): WebMcpToolRegistration {
  return defineWebMcpTool({
    handler: async (input) => {
      const rows = await validateAlbumSourceDir({
        dirName: await context.pathResolver.resolveSource(input.dirName, 'dirName'),
        ...optionalEntry('artistFilenameStrategy', input.artistFilenameStrategy),
        ...optionalEntry('ignoreNonAudioFiles', input.ignoreNonAudioFiles),
        ...optionalNumberEntry('limit', input.limit),
        ...optionalEntry('titleFilenameStrategy', input.titleFilenameStrategy),
      })

      return jsonToolContent(rows)
    },
    name: MANAGE_ALBUMS_VALIDATE_TOOL_NAME,
    options: {
      annotations: {
        readOnlyHint: true,
      },
      description: 'Validate FLAC and MP3 metadata needed to organize a configured source directory.',
      inputSchema: manageAlbumsValidateInputSchema,
      title: 'Manage albums validate',
    },
  })
}
