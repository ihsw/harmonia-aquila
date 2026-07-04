#!/usr/bin/env node

import { program } from 'commander'

import { registerFixTagsCommand } from './commands/fix-tags.js'
import { registerOrganizeFilesCommand } from './commands/organize-files.js'
import { registerSummarizeSourceDirCommand } from './commands/summarize-source-dir.js'

program
  .name('harmonia-aquila')
  .description('Analyze local music files')

registerSummarizeSourceDirCommand(program)
registerFixTagsCommand(program)
registerOrganizeFilesCommand(program)

await program.parseAsync()
