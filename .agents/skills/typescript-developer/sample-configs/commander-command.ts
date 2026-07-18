import { Command } from 'commander'

type OutputFormat = 'json' | 'text'

interface GreetOptions {
  format: OutputFormat
}

export function createGreetCommand(): Command {
  return new Command('greet')
    .description('Print a greeting')
    .argument('<name>', 'name to greet')
    .option('--format <format>', 'output format: json or text', 'text')
    .action((name: string, rawOptions: { format?: string }, command: Command) => {
      const options = parseGreetOptions(command, rawOptions)
      const greeting = `Hello, ${name}`

      if (options.format === 'json') {
        console.info(JSON.stringify({ greeting }, null, 2))
        return
      }

      console.info(greeting)
    })
}

function parseGreetOptions(command: Command, options: { format?: string }): GreetOptions {
  const format = options.format ?? 'text'

  if (format !== 'json' && format !== 'text') {
    command.error('--format must be one of: json, text')
  }

  return { format }
}
