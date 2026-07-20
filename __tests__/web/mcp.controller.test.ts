import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { WebPathResolver } from '../../src/web/providers/path-resolver.js'
import { getWebMcpToolRegistrations } from '../../src/web/servers/mcp-tools/index.js'

import {
  closeWebMcpTestApp,
  createWebMcpTestApp,
  EXPECTED_MCP_TOOL_NAMES,
  mcpRequestHeaders,
  postMcp,
  type WebMcpTestApp,
} from './mcp-test-helpers.js'

describe('web MCP controller', () => {
  let testApp: WebMcpTestApp | undefined

  beforeEach(async () => {
    testApp = await createWebMcpTestApp()
  })

  afterEach(async () => {
    await closeWebMcpTestApp(testApp)
    testApp = undefined
  })

  it('initializes the MCP endpoint', async () => {
    const response = await postMcp(requireTestApp().baseUrl, {
      id: 1,
      jsonrpc: '2.0',
      method: 'initialize',
      params: {
        capabilities: {},
        clientInfo: {
          name: 'vitest',
          version: '1.0.0',
        },
        protocolVersion: '2025-11-25',
      },
    })

    expect(response.id).toBe(1)
    expect(response.result).toMatchObject({ capabilities: { tools: {} }, serverInfo: { name: 'harmonia-aquila-web' } })
  })

  it('lists exactly the expected MCP tools', async () => {
    const response = await postMcp(requireTestApp().baseUrl, {
      id: 2,
      jsonrpc: '2.0',
      method: 'tools/list',
      params: {},
    })
    const tools = (response.result as { tools?: Array<{ name?: string }> }).tools ?? []

    expect(response.id).toBe(2)
    expect(tools.map(tool => tool.name)).toEqual([...EXPECTED_MCP_TOOL_NAMES])
  })

  it('composes exactly the expected tool registrations', () => {
    const currentTestApp = requireTestApp()
    const tools = getWebMcpToolRegistrations({
      pathResolver: currentTestApp.app.get(WebPathResolver),
    })

    expect(tools.map(tool => tool.name)).toEqual([...EXPECTED_MCP_TOOL_NAMES])
  })

  it('rejects unsafe browser origins', async () => {
    const response = await fetch(`${requireTestApp().baseUrl}/mcp`, {
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

  function requireTestApp(): WebMcpTestApp {
    if (testApp === undefined) {
      throw new Error('Expected test app to be initialized')
    }

    return testApp
  }
})
