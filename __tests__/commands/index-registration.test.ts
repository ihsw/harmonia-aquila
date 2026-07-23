import { Command } from 'commander'
import { describe, expect, it } from 'vitest'

import { registerManageAlbumsCommand } from '../../src/commands/manage-albums/index.js'
import { registerManageAudiobooksCommand } from '../../src/commands/manage-audiobooks/index.js'
import { registerWebCommand } from '../../src/commands/web/index.js'

function commandNames(command: Command): string[] {
  return command.commands.map(subcommand => subcommand.name())
}

describe('command index registration', () => {
  it('registers manage-albums subcommands', () => {
    const program = new Command()

    registerManageAlbumsCommand(program)

    const manageAlbums = program.commands.find(command => command.name() === 'manage-albums')
    expect(manageAlbums).toBeDefined()
    expect(commandNames(manageAlbums as Command)).toEqual([
      'list',
      'summarize-source-dir',
      'validate',
      'fix-tags',
      'organize-files',
    ])
  })

  it('registers manage-audiobooks subcommands', () => {
    const program = new Command()

    registerManageAudiobooksCommand(program)

    const manageAudiobooks = program.commands.find(command => command.name() === 'manage-audiobooks')
    expect(manageAudiobooks).toBeDefined()
    expect(commandNames(manageAudiobooks as Command)).toEqual([
      'validate',
      'copy-and-rename',
      'crawl',
      'merge',
      'convert-file',
      'set-metadata',
    ])
  })

  it('registers web serve', () => {
    const program = new Command()

    registerWebCommand(program)

    const web = program.commands.find(command => command.name() === 'web')
    expect(web).toBeDefined()
    expect(commandNames(web as Command)).toEqual(['serve'])
  })
})
