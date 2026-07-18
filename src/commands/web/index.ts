import type { Command } from 'commander'

import { registerWebServeCommand } from './serve.js'

export function registerWebCommand(program: Command): void {
  const webCommand = program
    .command('web')
    .description('Run web interfaces')

  registerWebServeCommand(webCommand)
}
