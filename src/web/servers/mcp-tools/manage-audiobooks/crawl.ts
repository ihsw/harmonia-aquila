import { crawlAudiobooks } from '../../../../lib/audiobooks/crawl.js'
import {
  MANAGE_AUDIOBOOKS_CRAWL_TOOL_NAME,
  manageAudiobooksCrawlInputSchema,
} from '../../../schemas/mcp/manage-audiobooks.js'
import { jsonToolContent } from '../helpers.js'
import { defineWebMcpTool, type WebMcpToolContext, type WebMcpToolRegistration } from '../types.js'

export function createManageAudiobooksCrawlTool(
  context: WebMcpToolContext,
): WebMcpToolRegistration {
  return defineWebMcpTool({
    handler: async input => jsonToolContent(await crawlAudiobooks({
      dirName: await context.pathResolver.resolveSource(input.dirName, 'dirName'),
    })),
    name: MANAGE_AUDIOBOOKS_CRAWL_TOOL_NAME,
    options: {
      annotations: {
        readOnlyHint: true,
      },
      description: 'Crawl audiobook files under the configured source directory.',
      inputSchema: manageAudiobooksCrawlInputSchema,
      title: 'Manage audiobooks crawl',
    },
  })
}
