import { fixAlbumTags } from '../../../../lib/albums/fix-tags.js'
import {
  MANAGE_ALBUMS_FIX_TAGS_TOOL_NAME,
  manageAlbumsFixTagsInputSchema,
} from '../../../schemas/mcp/manage-albums.js'
import { optionalEntry } from '../../../schemas/request-schemas.js'
import { jsonToolContent, optionalNumberEntry } from '../helpers.js'
import { defineWebMcpTool, type WebMcpToolContext, type WebMcpToolRegistration } from '../types.js'

export function createManageAlbumsFixTagsTool(
  context: WebMcpToolContext,
): WebMcpToolRegistration {
  return defineWebMcpTool({
    handler: async input => jsonToolContent(await fixAlbumTags({
      destDir: context.pathResolver.destDir,
      sourceDir: context.pathResolver.sourceDir,
      ...optionalEntry('albumArtistsStrategy', input.albumArtistsStrategy),
      ...optionalEntry('albumStrategy', input.albumStrategy),
      ...optionalEntry('destinationStrategy', input.destinationStrategy),
      ...optionalEntry('execute', input.execute),
      ...optionalNumberEntry('limit', input.limit),
      ...optionalEntry('producerStrategy', input.producerStrategy),
      ...optionalEntry('resetTrack', input.resetTrack),
      ...optionalEntry('setAlbum', input.setAlbum),
      ...optionalEntry('setAlbumArtist', input.setAlbumArtist),
      ...optionalEntry('setArtist', input.setArtist),
      ...optionalEntry('setMetadata', input.setMetadata),
      ...optionalEntry('swapArtistAlbumartist', input.swapArtistAlbumartist),
    })),
    name: MANAGE_ALBUMS_FIX_TAGS_TOOL_NAME,
    options: {
      annotations: {
        readOnlyHint: false,
      },
      description: 'Fix album tags under the configured source directory and plan output under the destination directory.',
      inputSchema: manageAlbumsFixTagsInputSchema,
      title: 'Manage albums fix tags',
    },
  })
}
