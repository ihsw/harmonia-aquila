import { Command, CommanderError } from 'commander'
import { describe, expect, it, vi } from 'vitest'

import { registerWebServeCommand } from '../../../src/commands/web/serve.js'
import { serveWeb } from '../../../src/web/main.js'

vi.mock('../../../src/web/main.js', () => ({
  serveWeb: vi.fn(),
}))

function makeProgram(): Command {
  const program = new Command()
  program.exitOverride()
  program.configureOutput({
    writeErr: () => undefined,
    writeOut: () => undefined,
  })
  registerWebServeCommand(program)
  return program
}

describe('web serve command', () => {
  it('lists source and destination directory options in help output', () => {
    const output: string[] = []
    const program = new Command()
    program.exitOverride()
    program.configureOutput({
      writeErr: value => output.push(value),
      writeOut: value => output.push(value),
    })
    registerWebServeCommand(program)

    expect(() => program.parse(['node', 'test', 'serve', '--help'])).toThrow(CommanderError)
    expect(output.join('')).toContain('--source-dir <dir>')
    expect(output.join('')).toContain('--dest-dir <dir>')
    expect(output.join('')).toContain('--host <host>')
    expect(output.join('')).toContain('--port <port>')
  })

  it('requires source and destination directories before bootstrapping', async () => {
    await expect(
      makeProgram().parseAsync(['node', 'test', 'serve', '--dest-dir', '/dst']),
    ).rejects.toThrow(CommanderError)

    await expect(
      makeProgram().parseAsync(['node', 'test', 'serve', '--source-dir', '/src']),
    ).rejects.toThrow(CommanderError)

    expect(serveWeb).not.toHaveBeenCalled()
  })

  it('passes parsed options to the web server bootstrap', async () => {
    vi.mocked(serveWeb).mockResolvedValue({} as never)

    await makeProgram().parseAsync([
      'node', 'test', 'serve',
      '--source-dir', '/src',
      '--dest-dir', '/dst',
      '--host', '0.0.0.0',
      '--port', '1234',
    ])

    expect(serveWeb).toHaveBeenCalledWith({
      destDir: '/dst',
      host: '0.0.0.0',
      port: 1234,
      sourceDir: '/src',
    })
  })
})
