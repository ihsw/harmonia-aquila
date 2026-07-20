import { mergeAudiobooks } from '../../../../lib/audiobooks/merge.js'
import {
  MANAGE_AUDIOBOOKS_MERGE_TOOL_NAME,
  manageAudiobooksMergeInputSchema,
} from '../../../schemas/mcp/manage-audiobooks.js'
import { optionalEntry } from '../../../schemas/request-schemas.js'
import { jsonToolContent } from '../helpers.js'
import { defineWebMcpTool, type WebMcpToolContext, type WebMcpToolRegistration } from '../types.js'

export function createManageAudiobooksMergeTool(
  context: WebMcpToolContext,
): WebMcpToolRegistration {
  return defineWebMcpTool({
    handler: async input => jsonToolContent(await mergeAudiobooks({
      destDir: context.pathResolver.destDir,
      ...optionalEntry('bypassMetadata', input.bypassMetadata),
      ...optionalEntry('execute', input.execute),
      jobs: input.jobs === undefined ? '16' : String(input.jobs),
      sourceDir: context.pathResolver.sourceDir,
    })),
    name: MANAGE_AUDIOBOOKS_MERGE_TOOL_NAME,
    options: {
      annotations: {
        readOnlyHint: false,
      },
      description: 'Merge audiobook files from the configured source directory into the destination directory.',
      inputSchema: manageAudiobooksMergeInputSchema,
      title: 'Manage audiobooks merge',
    },
  })
}
