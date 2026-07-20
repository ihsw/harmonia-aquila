import type { ToolCallback } from '@modelcontextprotocol/sdk/server/mcp.js'
import type { ZodRawShapeCompat } from '@modelcontextprotocol/sdk/server/zod-compat.js'
import type { ToolAnnotations } from '@modelcontextprotocol/sdk/types.js'

import type { WebPathResolver } from '../../providers/path-resolver.js'

export interface WebMcpToolContext {
  pathResolver: WebPathResolver
}

interface WebMcpToolOptions<InputSchema extends ZodRawShapeCompat> {
  _meta?: Record<string, unknown>
  annotations?: ToolAnnotations
  description?: string
  inputSchema: InputSchema
  title?: string
}

interface WebMcpToolDefinition<InputSchema extends ZodRawShapeCompat> {
  handler: ToolCallback<InputSchema>
  name: string
  options: WebMcpToolOptions<InputSchema>
}

export interface WebMcpToolRegistration {
  handler: ToolCallback<ZodRawShapeCompat>
  name: string
  options: WebMcpToolOptions<ZodRawShapeCompat>
}

export function defineWebMcpTool<InputSchema extends ZodRawShapeCompat>(
  tool: WebMcpToolDefinition<InputSchema>,
): WebMcpToolRegistration {
  return tool
}
