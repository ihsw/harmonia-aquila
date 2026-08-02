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
      const sourceDir = input.useScratchDir === true
        ? await context.pathResolver.resolveScratch(input.albumDir, 'albumDir')
        : await context.pathResolver.resolveSource(input.albumDir, 'albumDir')

      return jsonToolContent(await organizeAlbumFiles({
        destDir: context.pathResolver.destDir,
        sourceDir,
        ...optionalEntry('albumArtistsStrategy', input.albumArtistsStrategy),
        ...optionalEntry('albumStrategy', input.albumStrategy),
        ...optionalEntry('artistFilenameStrategy', input.artistFilenameStrategy),
        ...optionalEntry('destinationStrategy', input.destinationStrategy),
        ...optionalEntry('discStrategy', input.discStrategy),
        ...optionalEntry('execute', input.execute),
        ...optionalEntry('ignoreAudioFilesWithoutTracks', input.ignoreAudioFilesWithoutTracks),
        ...optionalEntry('ignoreNonAudioFiles', input.ignoreNonAudioFiles),
        ...optionalNumberEntry('limit', input.limit),
        ...optionalEntry('producerStrategy', input.producerStrategy),
        ...optionalEntry('resetTrack', input.resetTrack),
        ...optionalEntry('setAlbum', input.setAlbum),
        ...optionalEntry('setAlbumArtist', input.setAlbumArtist),
        ...optionalEntry('setArtist', input.setArtist),
        ...optionalEntry('setMetadata', input.setMetadata),
        ...optionalEntry('swapArtistAlbumartist', input.swapArtistAlbumartist),
        ...optionalEntry('titleFilenameStrategy', input.titleFilenameStrategy),
      }))
    },
    name: MANAGE_ALBUMS_ORGANIZE_FILES_TOOL_NAME,
    options: {
      annotations: {
        readOnlyHint: false,
      },
      description: 'Plan metadata repairs and organize audio plus adjacent album art from manage_albums_list into the configured destination.',
      inputSchema: manageAlbumsOrganizeFilesInputSchema,
      title: 'Manage albums organize files',
    },
  })
}
