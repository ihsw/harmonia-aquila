import type { Command } from 'commander'

import * as albumAudioFiles from '../../../lib/albums/audio-files.js'
import { getErrorMessage, UserInputError } from '../../../lib/errors.js'

export {
  formatAudioBitrate,
  formatAudioDuration,
  formatAudioSampleRate,
  getSupportedAudioExtensions,
  isSupportedAudioExtension,
  type AudioFilesResult,
} from '../../../lib/albums/audio-files.js'

export async function getAudioFiles(command: Command, dirName: string, options: albumAudioFiles.GetAudioFilesOptions = {}): Promise<albumAudioFiles.AudioFilesResult> {
  try {
    return await albumAudioFiles.getAudioFiles(dirName, options)
  }
  catch (error) {
    if (error instanceof UserInputError) {
      command.error(error.message)
    }

    throw error
  }
}

export function parseLimit(command: Command, limitOption: string | undefined): number | undefined {
  try {
    return albumAudioFiles.parseLimit(limitOption)
  }
  catch (error) {
    command.error(getErrorMessage(error))
  }
}
