import { validateAudiobook } from '../../../../lib/audiobooks/validate.js'
import {
  MANAGE_AUDIOBOOKS_VALIDATE_TOOL_NAME,
  manageAudiobooksValidateInputSchema,
} from '../../../schemas/mcp/manage-audiobooks.js'
import { jsonToolContent } from '../helpers.js'
import { defineWebMcpTool, type WebMcpToolContext, type WebMcpToolRegistration } from '../types.js'

export function createManageAudiobooksValidateTool(
  context: WebMcpToolContext,
): WebMcpToolRegistration {
  return defineWebMcpTool({
    handler: async input => jsonToolContent(await validateAudiobook({
      fileName: await context.pathResolver.resolveSource(input.fileName, 'fileName'),
    })),
    name: MANAGE_AUDIOBOOKS_VALIDATE_TOOL_NAME,
    options: {
      annotations: {
        readOnlyHint: true,
      },
      description: 'Validate audiobook metadata for a file under the configured source directory.',
      inputSchema: manageAudiobooksValidateInputSchema,
      title: 'Manage audiobooks validate',
    },
  })
}
