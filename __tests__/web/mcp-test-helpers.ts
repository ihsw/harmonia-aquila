import type { INestApplication } from '@nestjs/common'
import { realpath } from 'node:fs/promises'
import type { Server } from 'node:http'

import { createWebApp } from '../../src/web/main.js'
import {
  MANAGE_ALBUMS_FIX_TAGS_TOOL_NAME,
  MANAGE_ALBUMS_LIST_TOOL_NAME,
  MANAGE_ALBUMS_ORGANIZE_FILES_TOOL_NAME,
  MANAGE_ALBUMS_SUMMARIZE_SOURCE_DIR_TOOL_NAME,
  MANAGE_ALBUMS_VALIDATE_TOOL_NAME,
} from '../../src/web/schemas/mcp/manage-albums.js'
import {
  MANAGE_AUDIOBOOKS_CONVERT_FILE_TOOL_NAME,
  MANAGE_AUDIOBOOKS_COPY_AND_RENAME_TOOL_NAME,
  MANAGE_AUDIOBOOKS_CRAWL_TOOL_NAME,
  MANAGE_AUDIOBOOKS_MERGE_TOOL_NAME,
  MANAGE_AUDIOBOOKS_SET_METADATA_TOOL_NAME,
  MANAGE_AUDIOBOOKS_VALIDATE_TOOL_NAME,
} from '../../src/web/schemas/mcp/manage-audiobooks.js'
import { createTempDir, removeTempDir } from '../test-helpers.js'

export const EXPECTED_MCP_TOOL_NAMES = [
  MANAGE_ALBUMS_LIST_TOOL_NAME,
  MANAGE_ALBUMS_SUMMARIZE_SOURCE_DIR_TOOL_NAME,
  MANAGE_ALBUMS_VALIDATE_TOOL_NAME,
  MANAGE_ALBUMS_FIX_TAGS_TOOL_NAME,
  MANAGE_ALBUMS_ORGANIZE_FILES_TOOL_NAME,
  MANAGE_AUDIOBOOKS_VALIDATE_TOOL_NAME,
  MANAGE_AUDIOBOOKS_CRAWL_TOOL_NAME,
  MANAGE_AUDIOBOOKS_COPY_AND_RENAME_TOOL_NAME,
  MANAGE_AUDIOBOOKS_CONVERT_FILE_TOOL_NAME,
  MANAGE_AUDIOBOOKS_MERGE_TOOL_NAME,
  MANAGE_AUDIOBOOKS_SET_METADATA_TOOL_NAME,
] as const

const MCP_PROTOCOL_VERSION = '2025-11-25'

export interface JsonRpcRequest {
  id?: number
  jsonrpc: '2.0'
  method: string
  params?: unknown
}

export interface JsonRpcResponse {
  id?: number
  result?: unknown
}

export interface WebMcpTestApp {
  app: INestApplication
  baseUrl: string
  destDir: string
  sourceDir: string
}

export const mcpRequestHeaders = {
  'Accept': 'application/json, text/event-stream',
  'Content-Type': 'application/json',
  'MCP-Protocol-Version': MCP_PROTOCOL_VERSION,
}

export async function createWebMcpTestApp(): Promise<WebMcpTestApp> {
  const destDir = await realpath(await createTempDir('web-mcp-dest-'))
  const sourceDir = await realpath(await createTempDir('web-mcp-source-'))
  const app = await createWebApp({ destDir, sourceDir })
  await app.listen(0, '127.0.0.1')

  return {
    app,
    baseUrl: getBaseUrl(app.getHttpServer() as Server),
    destDir,
    sourceDir,
  }
}

export async function closeWebMcpTestApp(testApp: WebMcpTestApp | undefined): Promise<void> {
  if (testApp === undefined) {
    return
  }

  await testApp.app.close()
  await removeTempDir(testApp.destDir)
  await removeTempDir(testApp.sourceDir)
}

export async function postMcp(baseUrl: string, request: JsonRpcRequest): Promise<JsonRpcResponse> {
  const response = await fetch(`${baseUrl}/mcp`, {
    body: JSON.stringify(request),
    headers: mcpRequestHeaders,
    method: 'POST',
  })

  const responseText = await response.text()
  if (response.status !== 200) {
    throw new Error(`Expected MCP response status 200, got ${response.status.toString()}: ${responseText}`)
  }

  return JSON.parse(responseText) as JsonRpcResponse
}

export function getToolText(response: JsonRpcResponse): string {
  const result = response.result as { content?: Array<{ text?: string }> } | undefined
  const text = result?.content?.[0]?.text

  if (text === undefined) {
    throw new Error('Expected MCP tool response text content')
  }

  return text
}

function getBaseUrl(server: Server): string {
  const address = server.address()

  if (address === null || typeof address === 'string') {
    throw new Error('Expected server to listen on a TCP address')
  }

  return `http://127.0.0.1:${address.port.toString()}`
}
