import type { ToolCallback } from '@modelcontextprotocol/sdk/server/mcp.js'
import type { ZodRawShapeCompat } from '@modelcontextprotocol/sdk/server/zod-compat.js'
import type { ToolAnnotations } from '@modelcontextprotocol/sdk/types.js'

import type { WebPathResolver } from '../../providers/path-resolver.js'

export interface WebMcpToolContext {
  pathResolver: WebPathResolver
}

export interface WebMcpToolRegistration<InputSchema extends ZodRawShapeCompat> {
  handler: ToolCallback<InputSchema>
  name: string
  options: {
    _meta?: Record<string, unknown>
    annotations?: ToolAnnotations
    description?: string
    inputSchema: InputSchema
    title?: string
  }
}
