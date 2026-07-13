import type { Command } from 'commander'

import { registerCopyAndRenameAudiobookCommand } from './manage-audiobooks/copy-and-rename.js'
import { registerValidateAudiobookCommand } from './manage-audiobooks/validate.js'

export function registerManageAudiobooksCommand(program: Command): void {
  const manageAudiobooksCommand = program
    .command('manage-audiobooks')
    .description('Manage audiobook files')

  registerValidateAudiobookCommand(manageAudiobooksCommand)
  registerCopyAndRenameAudiobookCommand(manageAudiobooksCommand)
}
