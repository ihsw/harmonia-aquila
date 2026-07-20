import { copyAndRenameAudiobook } from '../../../../lib/audiobooks/copy-and-rename.js'
import {
  MANAGE_AUDIOBOOKS_COPY_AND_RENAME_TOOL_NAME,
  manageAudiobooksCopyAndRenameInputSchema,
} from '../../../schemas/mcp/manage-audiobooks.js'
import { optionalEntry } from '../../../schemas/request-schemas.js'
import { jsonToolContent } from '../helpers.js'
import { defineWebMcpTool, type WebMcpToolContext, type WebMcpToolRegistration } from '../types.js'

export function createManageAudiobooksCopyAndRenameTool(
  context: WebMcpToolContext,
): WebMcpToolRegistration {
  return defineWebMcpTool({
    handler: async input => jsonToolContent(await copyAndRenameAudiobook({
      destDir: context.pathResolver.destDir,
      fileName: await context.pathResolver.resolveSource(input.fileName, 'fileName'),
      ...optionalEntry('execute', input.execute),
    })),
    name: MANAGE_AUDIOBOOKS_COPY_AND_RENAME_TOOL_NAME,
    options: {
      annotations: {
        readOnlyHint: false,
      },
      description: 'Copy and rename an audiobook into the configured destination directory.',
      inputSchema: manageAudiobooksCopyAndRenameInputSchema,
      title: 'Manage audiobooks copy and rename',
    },
  })
}
