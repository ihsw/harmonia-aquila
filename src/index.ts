#!/usr/bin/env node

import { program } from 'commander'

import { registerManageAlbumsCommand } from './commands/manage-albums.js'

program
  .name('harmonia-aquila')
  .description('Analyze local music files')

registerManageAlbumsCommand(program)

await program.parseAsync()
