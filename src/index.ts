#!/usr/bin/env node

import { program } from 'commander'

import { registerManageAlbumsCommand } from './commands/manage-albums.js'
import { registerManageAudiobooksCommand } from './commands/manage-audiobooks.js'

program
  .name('harmonia-aquila')
  .description('Analyze local music files')

registerManageAlbumsCommand(program)
registerManageAudiobooksCommand(program)

await program.parseAsync()
