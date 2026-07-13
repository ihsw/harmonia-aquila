import type { Command } from 'commander'

import { registerFixTagsCommand } from './fix-tags.js'
import { registerOrganizeFilesCommand } from './organize-files.js'
import { registerSummarizeSourceDirCommand } from './summarize-source-dir.js'

export function registerManageAlbumsCommand(program: Command): void {
  const manageAlbumsCommand = program
    .command('manage-albums')
    .description('Manage album files')

  registerSummarizeSourceDirCommand(manageAlbumsCommand)
  registerFixTagsCommand(manageAlbumsCommand)
  registerOrganizeFilesCommand(manageAlbumsCommand)
}
