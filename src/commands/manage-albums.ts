import type { Command } from 'commander'

import { registerFixTagsCommand } from './manage-albums/fix-tags.js'
import { registerOrganizeFilesCommand } from './manage-albums/organize-files.js'
import { registerSummarizeSourceDirCommand } from './manage-albums/summarize-source-dir.js'

export function registerManageAlbumsCommand(program: Command): void {
  const manageAlbumsCommand = program
    .command('manage-albums')
    .description('Manage album files')

  registerSummarizeSourceDirCommand(manageAlbumsCommand)
  registerFixTagsCommand(manageAlbumsCommand)
  registerOrganizeFilesCommand(manageAlbumsCommand)
}
