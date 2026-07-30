import { parseFile } from 'music-metadata'
import { copyFile, mkdir } from 'node:fs/promises'
import { dirname, relative } from 'node:path'

import { UserInputError } from '../errors.js'

import { writeAudioTagFix } from './audio-tags.js'
import type {
  DestinationStrategy,
  PlannedTagFix,
} from './fix-tags-types.js'

export function assertFixTagDestinations(
  planned: PlannedTagFix[],
  destinationDirectory: string,
  strategy: DestinationStrategy,
): void {
  const conflicts = planned.filter(item => item.destinationExists)

  if (strategy === 'error' && conflicts.length > 0) {
    throw new UserInputError(`Destination files already exist: ${conflicts
      .map(item => relative(destinationDirectory, item.destinationPath))
      .join(', ')}`)
  }
}

async function verifyDiscWrite(planned: PlannedTagFix): Promise<void> {
  if (planned.tagFix.discNumber === undefined && planned.tagFix.discTotal === undefined) {
    return
  }

  const metadata = await parseFile(planned.destinationPath)

  if (
    (planned.tagFix.discNumber !== undefined && metadata.common.disk.no !== planned.tagFix.discNumber)
    || (planned.tagFix.discTotal !== undefined && metadata.common.disk.of !== planned.tagFix.discTotal)
  ) {
    throw new Error(
      `Disc metadata was not persisted for ${planned.row.title}: requested ${String(planned.tagFix.discNumber)}/${String(planned.tagFix.discTotal)}`,
    )
  }
}

export async function executeTagFixes(
  plannedTagFixes: PlannedTagFix[],
  strategy: DestinationStrategy,
): Promise<void> {
  for (const planned of plannedTagFixes) {
    if (planned.destinationExists && strategy === 'ignore') {
      continue
    }

    try {
      await mkdir(dirname(planned.destinationPath), { recursive: true })
      await copyFile(planned.sourcePath, planned.destinationPath)

      if (planned.hasChanges) {
        writeAudioTagFix(planned.destinationPath, planned.tagFix)
        await verifyDiscWrite(planned)
      }
    }
    catch (error) {
      throw new Error(
        `Failed to copy/fix tags for "${planned.row.title}" with metadata ${JSON.stringify(planned.tagFix)}`,
        { cause: error },
      )
    }
  }
}
