import type { Command } from 'commander'

import { registerFixTagsCommand } from './fix-tags.js'
import { registerListAlbumSourceDirCommand } from './list.js'
import { registerOrganizeFilesCommand } from './organize-files.js'
import { registerSummarizeSourceDirCommand } from './summarize-source-dir.js'
import { registerValidateAlbumSourceDirCommand } from './validate.js'

export function registerManageAlbumsCommand(program: Command): void {
  const manageAlbumsCommand = program
    .command('manage-albums')
    .description('Manage album files')

  registerListAlbumSourceDirCommand(manageAlbumsCommand)
  registerSummarizeSourceDirCommand(manageAlbumsCommand)
  registerValidateAlbumSourceDirCommand(manageAlbumsCommand)
  registerFixTagsCommand(manageAlbumsCommand)
  registerOrganizeFilesCommand(manageAlbumsCommand)
}
