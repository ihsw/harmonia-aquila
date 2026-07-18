import type { Command } from 'commander'

import { type AudiobookFile, readAudiobookFile } from '../../../lib/audiobooks/audiobook-file.js'
import { getErrorMessage } from '../../../lib/errors.js'

export { readAudiobookFile, type AudiobookFile } from '../../../lib/audiobooks/audiobook-file.js'

export async function getAudiobookFile(command: Command, fileName: string): Promise<AudiobookFile> {
  try {
    return await readAudiobookFile(fileName)
  }
  catch (error) {
    command.error(getErrorMessage(error))
  }
}
