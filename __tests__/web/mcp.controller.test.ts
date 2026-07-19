import type { INestApplication } from '@nestjs/common'
import { realpath } from 'node:fs/promises'
import type { Server } from 'node:http'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { summarizeAlbumSourceDir } from '../../src/lib/albums/summarize-source-dir.js'
import { createWebApp } from '../../src/web/main.js'
import { MANAGE_ALBUMS_SUMMARIZE_SOURCE_DIR_TOOL_NAME } from '../../src/web/mcp-schemas.js'
import { createTempDir, removeTempDir } from '../test-helpers.js'

vi.mock('../../src/lib/albums/summarize-source-dir.js', () => ({
  summarizeAlbumSourceDir: vi.fn(),
}))

const MCP_PROTOCOL_VERSION = '2025-11-25'

interface JsonRpcRequest {
  id?: number
  jsonrpc: '2.0'
  method: string
  params?: unknown
}

interface JsonRpcResponse {
  id?: number
  result?: unknown
}

const mcpRequestHeaders = {
  'Accept': 'application/json, text/event-stream',
  'Content-Type': 'application/json',
  'MCP-Protocol-Version': MCP_PROTOCOL_VERSION,
}

describe('web MCP controller', () => {
  let app: INestApplication
  let baseUrl: string
  let destDir: string
  let sourceDir: string

  beforeEach(async () => {
    destDir = await createTempDir('web-mcp-dest-')
    sourceDir = await createTempDir('web-mcp-source-')
    destDir = await realpath(destDir)
    sourceDir = await realpath(sourceDir)
    app = await createWebApp({ destDir, sourceDir })
    await app.listen(0, '127.0.0.1')
    baseUrl = getBaseUrl(app.getHttpServer() as Server)
    vi.mocked(summarizeAlbumSourceDir).mockReset()
  })

  afterEach(async () => {
    await app.close()
    await removeTempDir(destDir)
    await removeTempDir(sourceDir)
  })

  it('initializes the MCP endpoint', async () => {
    const response = await postMcp(baseUrl, {
      id: 1,
      jsonrpc: '2.0',
      method: 'initialize',
      params: {
        capabilities: {},
        clientInfo: {
          name: 'vitest',
          version: '1.0.0',
        },
        protocolVersion: MCP_PROTOCOL_VERSION,
      },
    })

    expect(response.id).toBe(1)
    expect(response.result).toMatchObject({ capabilities: { tools: {} }, serverInfo: { name: 'harmonia-aquila-web' } })
  })

  it('lists exactly the summarize source directory tool', async () => {
    const response = await postMcp(baseUrl, {
      id: 2,
      jsonrpc: '2.0',
      method: 'tools/list',
      params: {},
    })

    expect(response.id).toBe(2)
    expect(response.result).toMatchObject({ tools: [{ name: MANAGE_ALBUMS_SUMMARIZE_SOURCE_DIR_TOOL_NAME }] })
    expect((response.result as { tools?: unknown[] }).tools).toHaveLength(1)
  })

  it('calls the summarize source directory tool', async () => {
    vi.mocked(summarizeAlbumSourceDir).mockResolvedValue([{ filename: 'a.flac' } as never])

    const response = await postMcp(baseUrl, {
      id: 3,
      jsonrpc: '2.0',
      method: 'tools/call',
      params: {
        arguments: { dirName: 'music', ignoreNonAudioFiles: true, limit: 2 },
        name: MANAGE_ALBUMS_SUMMARIZE_SOURCE_DIR_TOOL_NAME,
      },
    })

    expect(summarizeAlbumSourceDir).toHaveBeenCalledWith({
      dirName: `${sourceDir}/music`,
      ignoreNonAudioFiles: true,
      limit: '2',
    })
    expect(JSON.parse(getToolText(response))).toEqual([{ filename: 'a.flac' }])
  })

  it('rejects traversal and invalid input before invoking the domain operation', async () => {
    const traversalResponse = await postMcp(baseUrl, {
      id: 4,
      jsonrpc: '2.0',
      method: 'tools/call',
      params: {
        arguments: { dirName: '..' },
        name: MANAGE_ALBUMS_SUMMARIZE_SOURCE_DIR_TOOL_NAME,
      },
    })
    const invalidResponse = await postMcp(baseUrl, {
      id: 5,
      jsonrpc: '2.0',
      method: 'tools/call',
      params: {
        arguments: { dirName: 'music', limit: -1 },
        name: MANAGE_ALBUMS_SUMMARIZE_SOURCE_DIR_TOOL_NAME,
      },
    })

    expect(getToolText(traversalResponse)).toContain('--source-dir')
    expect(getToolText(invalidResponse)).toContain('Invalid arguments')
    expect(summarizeAlbumSourceDir).not.toHaveBeenCalled()
  })

  it('rejects unsafe browser origins', async () => {
    const response = await fetch(`${baseUrl}/mcp`, {
      body: JSON.stringify({
        id: 6,
        jsonrpc: '2.0',
        method: 'tools/list',
        params: {},
      }),
      headers: { ...mcpRequestHeaders, Origin: 'https://example.com' },
      method: 'POST',
    })

    expect(response.status).toBe(403)
  })
})

function getBaseUrl(server: Server): string {
  const address = server.address()

  if (address === null || typeof address === 'string') {
    throw new Error('Expected server to listen on a TCP address')
  }

  return `http://127.0.0.1:${address.port.toString()}`
}

async function postMcp(baseUrl: string, request: JsonRpcRequest): Promise<JsonRpcResponse> {
  const response = await fetch(`${baseUrl}/mcp`, {
    body: JSON.stringify(request),
    headers: mcpRequestHeaders,
    method: 'POST',
  })

  const responseText = await response.text()
  expect(response.status, responseText).toBe(200)

  return JSON.parse(responseText) as JsonRpcResponse
}

function getToolText(response: JsonRpcResponse): string {
  const result = response.result as { content?: Array<{ text?: string }> } | undefined
  const text = result?.content?.[0]?.text

  if (text === undefined) {
    throw new Error('Expected MCP tool response text content')
  }

  return text
}
