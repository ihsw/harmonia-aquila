import { resolve } from 'node:path'

import {
  parseSetMetadataFile,
  reconcileSetMetadata,
  type SetMetadataRecord,
} from '../../commands/manage-albums/helpers/set-metadata.js'
import { getErrorMessage, UserInputError } from '../errors.js'

import { getAudioFiles, parseLimit } from './audio-files.js'
import {
  assertFixTagDestinations,
  executeTagFixes,
} from './fix-tags-execution.js'
import { parseTagFixSources } from './fix-tags-metadata.js'
import { normalizeFixTagsOptions } from './fix-tags-options.js'
import { planAlbumTagFixes } from './fix-tags-planner.js'
import type {
  FixTagsJsonOutput,
  FixTagsOptions,
} from './fix-tags-types.js'

export type {
  FixTagsJsonOutput,
  FixTagsJsonOutputRow,
  FixTagsOptions,
} from './fix-tags-types.js'

async function readSetMetadata(path: string | undefined): Promise<SetMetadataRecord[] | undefined> {
  if (path === undefined) {
    return undefined
  }

  try {
    return await parseSetMetadataFile(resolve(path))
  }
  catch (error) {
    throw new UserInputError(getErrorMessage(error))
  }
}

export async function fixAlbumTags(options: FixTagsOptions): Promise<FixTagsJsonOutput> {
  const limit = parseLimit(options.limit)
  const normalized = normalizeFixTagsOptions(options)
  const records = await readSetMetadata(normalized.setMetadata)
  const { files, targetDirectory: sourceDirectory } = await getAudioFiles(options.sourceDir)
  const destinationDirectory = resolve(options.destDir)
  const selectedFiles = (limit === undefined ? files : files.slice(0, limit)).map(file => file.name)
  let recordsByFilename: Map<string, SetMetadataRecord> | undefined

  if (records !== undefined) {
    try {
      recordsByFilename = reconcileSetMetadata(records, selectedFiles)
    }
    catch (error) {
      throw new UserInputError(getErrorMessage(error))
    }
  }

  const sources = await parseTagFixSources(sourceDirectory, destinationDirectory, selectedFiles)
  const planned = await planAlbumTagFixes(sources, recordsByFilename, normalized)

  assertFixTagDestinations(planned, destinationDirectory, normalized.destinationStrategy)

  if (normalized.execute) {
    await executeTagFixes(planned, normalized.destinationStrategy)
  }

  return planned.map(item => item.row)
}
