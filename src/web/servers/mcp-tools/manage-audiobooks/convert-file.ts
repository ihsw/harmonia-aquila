import { convertAudiobookFiles } from '../../../../lib/audiobooks/convert-file.js'
import {
  MANAGE_AUDIOBOOKS_CONVERT_FILE_TOOL_NAME,
  manageAudiobooksConvertFileInputSchema,
} from '../../../schemas/mcp/manage-audiobooks.js'
import { optionalEntry } from '../../../schemas/request-schemas.js'
import { jsonToolContent } from '../helpers.js'
import { defineWebMcpTool, type WebMcpToolContext, type WebMcpToolRegistration } from '../types.js'

export function createManageAudiobooksConvertFileTool(
  context: WebMcpToolContext,
): WebMcpToolRegistration {
  return defineWebMcpTool({
    handler: async input => jsonToolContent(await convertAudiobookFiles({
      ...optionalEntry('author', input.author),
      concurrency: input.concurrency === undefined ? '4' : String(input.concurrency),
      destDir: context.pathResolver.destDir,
      ...optionalEntry('execute', input.execute),
      fileName: await Promise.all(
        input.fileName.map(fileName => context.pathResolver.resolveSource(fileName, 'fileName')),
      ),
      jobs: input.jobs === undefined ? '16' : String(input.jobs),
      ...optionalEntry('narrator', input.narrator),
      ...optionalEntry('title', input.title),
    })),
    name: MANAGE_AUDIOBOOKS_CONVERT_FILE_TOOL_NAME,
    options: {
      annotations: {
        readOnlyHint: false,
      },
      description: 'Convert audiobook source files into the configured destination directory.',
      inputSchema: manageAudiobooksConvertFileInputSchema,
      title: 'Manage audiobooks convert file',
    },
  })
}
