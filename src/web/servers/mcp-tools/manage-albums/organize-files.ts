import { organizeAlbumFiles } from '../../../../lib/albums/organize-files.js'
import {
  MANAGE_ALBUMS_ORGANIZE_FILES_TOOL_NAME,
  manageAlbumsOrganizeFilesInputSchema,
} from '../../../schemas/mcp/manage-albums.js'
import { optionalEntry } from '../../../schemas/request-schemas.js'
import { jsonToolContent, optionalNumberEntry } from '../helpers.js'
import { defineWebMcpTool, type WebMcpToolContext, type WebMcpToolRegistration } from '../types.js'

export function createManageAlbumsOrganizeFilesTool(
  context: WebMcpToolContext,
): WebMcpToolRegistration {
  return defineWebMcpTool({
    handler: async (input) => {
      const sourceDir = await context.pathResolver.resolveSource(input.albumDir, 'albumDir')

      return jsonToolContent(await organizeAlbumFiles({
        destDir: context.pathResolver.destDir,
        sourceDir,
        ...optionalEntry('artistFilenameStrategy', input.artistFilenameStrategy),
        ...optionalEntry('execute', input.execute),
        ...optionalEntry('ignoreAudioFilesWithoutTracks', input.ignoreAudioFilesWithoutTracks),
        ...optionalEntry('ignoreNonAudioFiles', input.ignoreNonAudioFiles),
        ...optionalNumberEntry('limit', input.limit),
        ...optionalEntry('titleFilenameStrategy', input.titleFilenameStrategy),
      }))
    },
    name: MANAGE_ALBUMS_ORGANIZE_FILES_TOOL_NAME,
    options: {
      annotations: {
        readOnlyHint: false,
      },
      description: 'Organize files from an album directory returned by manage_albums_list into the destination directory.',
      inputSchema: manageAlbumsOrganizeFilesInputSchema,
      title: 'Manage albums organize files',
    },
  })
}
