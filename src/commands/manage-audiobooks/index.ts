import type { Command } from 'commander'

import { registerCopyAndRenameAudiobookCommand } from './copy-and-rename.js'
import { registerCrawlAudiobooksCommand } from './crawl.js'
import { registerValidateAudiobookCommand } from './validate.js'

export function registerManageAudiobooksCommand(program: Command): void {
  const manageAudiobooksCommand = program
    .command('manage-audiobooks')
    .description('Manage audiobook files')

  registerValidateAudiobookCommand(manageAudiobooksCommand)
  registerCopyAndRenameAudiobookCommand(manageAudiobooksCommand)
  registerCrawlAudiobooksCommand(manageAudiobooksCommand)
}
