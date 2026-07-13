import type { Command } from 'commander'
import { stat } from 'node:fs/promises'

const OUTPUT_FORMATS = ['plaintext', 'json'] as const

export type OutputFormat = typeof OUTPUT_FORMATS[number]

function isOutputFormat(value: string): value is OutputFormat {
  return OUTPUT_FORMATS.includes(value as OutputFormat)
}

export function parseOutputFormat(command: Command, formatOption: string | undefined): OutputFormat {
  const outputFormat = formatOption ?? 'plaintext'

  if (!isOutputFormat(outputFormat)) {
    command.error('--format must be one of: plaintext, json')
  }

  return outputFormat
}

export function writeRows(format: OutputFormat, rows: readonly unknown[], plaintextMessage?: string): void {
  if (format === 'json') {
    console.info(JSON.stringify(rows, undefined, 2))

    return
  }

  if (plaintextMessage !== undefined) {
    console.info(plaintextMessage)
  }

  console.table(rows)
}

export async function pathExists(path: string): Promise<boolean> {
  try {
    await stat(path)

    return true
  }
  catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
      return false
    }

    throw error
  }
}
