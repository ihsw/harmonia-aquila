import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js'
import { Inject, Injectable } from '@nestjs/common'
import type { IncomingMessage, ServerResponse } from 'node:http'

import { WebPathResolver } from '../providers/path-resolver.js'

import { getWebMcpToolRegistrations } from './mcp-tools/index.js'

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
    const context = { pathResolver: this.pathResolver }

    return getWebMcpToolRegistrations(context).reduce((registeredServer, tool) => {
      registeredServer.registerTool(tool.name, tool.options, tool.handler)
      return registeredServer
    }, server)
  }
}
