import { Controller, ForbiddenException, Get, HttpCode, Inject, Post, Req, Res } from '@nestjs/common'
import type { IncomingMessage, ServerResponse } from 'node:http'

import { WebMcpServerFactory } from './mcp-server.js'

type HttpRequestWithBody = IncomingMessage & {
  body?: unknown
}

const LOCAL_ORIGIN_HOSTS = new Set(['127.0.0.1', 'localhost', '[::1]', '::1'])

@Controller('mcp')
export class McpController {
  public constructor(@Inject(WebMcpServerFactory) private readonly mcpServerFactory: WebMcpServerFactory) {}

  @Post()
  public async post(@Req() request: HttpRequestWithBody, @Res() response: ServerResponse): Promise<void> {
    assertLocalOrigin(request.headers.origin)
    await this.mcpServerFactory.handleHttpRequest(request, response)
  }

  @Get()
  @HttpCode(405)
  public get(@Res() response: ServerResponse): void {
    response.statusCode = 405
    response.end()
  }
}

function assertLocalOrigin(origin: string | undefined): void {
  if (origin === undefined) {
    return
  }

  let url: URL
  try {
    url = new URL(origin)
  }
  catch {
    throw new ForbiddenException('Origin is not allowed')
  }

  if (!LOCAL_ORIGIN_HOSTS.has(url.hostname)) {
    throw new ForbiddenException('Origin is not allowed')
  }
}
