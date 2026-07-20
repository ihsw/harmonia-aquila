import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js'

export function jsonToolContent(value: unknown): CallToolResult {
  return {
    content: [
      {
        text: JSON.stringify(value),
        type: 'text',
      },
    ],
  }
}

export function optionalNumberEntry(key: string, value: number | undefined): Record<string, string> {
  return value === undefined ? {} : { [key]: String(value) }
}
