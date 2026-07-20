import { setAudiobookMetadata } from '../../../../lib/audiobooks/set-metadata.js'
import {
  MANAGE_AUDIOBOOKS_SET_METADATA_TOOL_NAME,
  manageAudiobooksSetMetadataInputSchema,
} from '../../../schemas/mcp/manage-audiobooks.js'
import { optionalEntry } from '../../../schemas/request-schemas.js'
import { jsonToolContent } from '../helpers.js'
import { defineWebMcpTool, type WebMcpToolContext, type WebMcpToolRegistration } from '../types.js'

export function createManageAudiobooksSetMetadataTool(
  context: WebMcpToolContext,
): WebMcpToolRegistration {
  return defineWebMcpTool({
    handler: async input => jsonToolContent(await setAudiobookMetadata({
      author: input.author,
      destFilepath: await context.pathResolver.resolveDest(input.destFilepath, 'destFilepath'),
      ...optionalEntry('execute', input.execute),
      ...optionalEntry('narrator', input.narrator),
      sourceFilepath: await context.pathResolver.resolveSource(input.sourceFilepath, 'sourceFilepath'),
      title: input.title,
    })),
    name: MANAGE_AUDIOBOOKS_SET_METADATA_TOOL_NAME,
    options: {
      annotations: {
        readOnlyHint: false,
      },
      description: 'Set audiobook metadata while preserving configured source and destination roots.',
      inputSchema: manageAudiobooksSetMetadataInputSchema,
      title: 'Manage audiobooks set metadata',
    },
  })
}
