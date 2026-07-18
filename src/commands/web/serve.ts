import type { Command } from 'commander'

import { UserInputError } from '../../lib/errors.js'
import { serveWeb } from '../../web/main.js'

interface WebServeOptions {
  host: string
  port: string
}

function parsePort(portOption: string): number {
  const port = Number(portOption)

  if (!Number.isInteger(port) || port < 0 || port > 65535) {
    throw new UserInputError('--port must be an integer between 0 and 65535')
  }

  return port
}

export function registerWebServeCommand(program: Command): void {
  const serveCommand = program
    .command('serve')
    .description('Start the Harmonia Aquila web server')
    .option('--host <host>', 'host to bind', '127.0.0.1')
    .option('--port <port>', 'port to bind', '3000')
    .action(async (options: WebServeOptions) => {
      let port: number

      try {
        port = parsePort(options.port)
      }
      catch (error) {
        if (error instanceof UserInputError) {
          serveCommand.error(error.message)
        }

        throw error
      }

      await serveWeb({ host: options.host, port })
    })
}
