import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js'
import { Inject, Injectable } from '@nestjs/common'
import type { IncomingMessage, ServerResponse } from 'node:http'

import { summarizeAlbumSourceDir } from '../../lib/albums/summarize-source-dir.js'
import { WebPathResolver } from '../providers/path-resolver.js'
import {
  MANAGE_ALBUMS_SUMMARIZE_SOURCE_DIR_TOOL_NAME,
  manageAlbumsSummarizeSourceDirInputSchema,
} from '../schemas/mcp-schemas.js'
import { optionalEntry } from '../schemas/request-schemas.js'

type HttpRequestWithBody = IncomingMessage & {
  body?: unknown
}

@Injectable()
export class WebMcpServerFactory {
  public constructor(@Inject(WebPathResolver) private readonly pathResolver: WebPathResolver) {}

  public async handleHttpRequest(request: HttpRequestWithBody, response: ServerResponse): Promise<void> {
    const server = this.createServer()
    const transport = new StreamableHTTPServerTransport({
      enableJsonResponse: true,
    })

    try {
      await server.connect(transport as Parameters<McpServer['connect']>[0])
      await transport.handleRequest(request, response, request.body)
    }
    finally {
      await server.close()
    }
  }

  private createServer(): McpServer {
    const server = new McpServer({
      name: 'harmonia-aquila-web',
      version: '1.0.0',
    })

    server.registerTool(
      MANAGE_ALBUMS_SUMMARIZE_SOURCE_DIR_TOOL_NAME,
      {
        annotations: {
          readOnlyHint: true,
        },
        description: 'Summarize FLAC and MP3 metadata under the configured source directory.',
        inputSchema: manageAlbumsSummarizeSourceDirInputSchema,
        title: 'Manage albums summarize source directory',
      },
      async (input) => {
        const rows = await summarizeAlbumSourceDir({
          dirName: await this.pathResolver.resolveSource(input.dirName, 'dirName'),
          ...optionalEntry('ignoreNonAudioFiles', input.ignoreNonAudioFiles),
          ...optionalEntry('limit', input.limit === undefined ? undefined : String(input.limit)),
        })

        return {
          content: [
            {
              text: JSON.stringify(rows),
              type: 'text',
            },
          ],
        }
      },
    )

    return server
  }
}
