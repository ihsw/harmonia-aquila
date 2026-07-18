import type { Command } from 'commander'

import * as m4bTool from '../../../lib/audiobooks/m4b-tool.js'
import { getErrorMessage } from '../../../lib/errors.js'

export {
  mergeWithM4bTool,
  setM4bToolMetadata,
  type M4bToolMergeOptions,
  type M4bToolMetadataOptions,
} from '../../../lib/audiobooks/m4b-tool.js'

export function parseM4bToolJobs(command: Command, jobsOption: string): number {
  try {
    return m4bTool.parseM4bToolJobs(jobsOption)
  }
  catch (error) {
    command.error(getErrorMessage(error))
  }
}
