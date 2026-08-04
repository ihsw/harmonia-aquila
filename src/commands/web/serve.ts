import type { Command } from 'commander'

import { UserInputError } from '../../lib/errors.js'
import { serveWeb } from '../../web/main.js'

interface WebServeOptions {
  destDir?: string
  host: string
  port: string
  sourceDir?: string
}

function parsePort(portOption: string): number {
  const port = Number(portOption)

  if (!Number.isInteger(port) || port < 0 || port > 65535) {
    throw new UserInputError('--port must be an integer between 0 and 65535')
  }

  return port
}

function requiredOption(command: Command, value: string | undefined, optionName: string): string {
  if (value === undefined || value.trim() === '') {
    command.error(`${optionName} is required`)
  }

  return value
}

export function registerWebServeCommand(program: Command): void {
  const serveCommand = program
    .command('serve')
    .description('Start the Harmonia Aquila web server')
    .option('--host <host>', 'host to bind', '127.0.0.1')
    .option('--port <port>', 'port to bind', '3000')
    .option('--source-dir <dir>', 'source directory root for web routes')
    .option('--dest-dir <dir>', 'destination directory root for web routes')
    .action(async (options: WebServeOptions) => {
      let port: number
      let sourceDir: string
      let destDir: string

      try {
        port = parsePort(options.port)
        sourceDir = requiredOption(serveCommand, options.sourceDir, '--source-dir')
        destDir = requiredOption(serveCommand, options.destDir, '--dest-dir')
      }
      catch (error) {
        if (error instanceof UserInputError) {
          serveCommand.error(error.message)
        }

        throw error
      }

      await serveWeb({ destDir, host: options.host, port, sourceDir })
    })
}
