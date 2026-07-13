#!/usr/bin/env node

import { program } from 'commander'

import { registerManageAlbumsCommand } from './commands/manage-albums/index.js'
import { registerManageAudiobooksCommand } from './commands/manage-audiobooks/index.js'

program
  .name('harmonia-aquila')
  .description('Analyze local music files')

registerManageAlbumsCommand(program)
registerManageAudiobooksCommand(program)

await program.parseAsync()
