import { resolve } from 'node:path'

import {
  parseSetMetadataFile,
  reconcileSetMetadata,
  type SetMetadataRecord,
} from '../../commands/manage-albums/helpers/set-metadata.js'
import { getErrorMessage, UserInputError } from '../errors.js'

import { planAlbumArtCopies } from './album-art-planner.js'
import { getAudioFiles, parseLimit } from './audio-files.js'
import { normalizeMetadataFixOptions } from './metadata-fix-options.js'
import { planMetadataFixes } from './metadata-fix-planner.js'
import { parseAlbumSources } from './metadata-fix-sources.js'
import { planOrganizationCopies } from './organization-planner.js'
import {
  executeOrganizationCopies,
  prepareOrganizationDestinations,
} from './organize-files-execution.js'
import type {
  OrganizeFilesJsonOutput,
  OrganizeFilesOptions,
} from './organize-files-types.js'

export type {
  OrganizeFilesJsonOutput,
  OrganizeFilesJsonOutputRow,
  OrganizeFilesOptions,
} from './organize-files-types.js'

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

export async function organizeAlbumFiles(options: OrganizeFilesOptions): Promise<OrganizeFilesJsonOutput> {
  const limit = parseLimit(options.limit)
  const normalized = normalizeMetadataFixOptions(options)
  const records = await readSetMetadata(normalized.setMetadata)
  const { albumArtFiles, files, targetDirectory: sourceDirectory } = await getAudioFiles(
    options.sourceDir,
    { acceptAlbumArt: true, ignoreNonAudioFiles: options.ignoreNonAudioFiles === true },
  )
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
  const sources = await parseAlbumSources(sourceDirectory, selectedFiles)
  const fixes = planMetadataFixes(sources, recordsByFilename, normalized)
  const destinationDirectory = resolve(options.destDir)
  const audioPlans = planOrganizationCopies(fixes, options, destinationDirectory)
  const albumArtPlans = planAlbumArtCopies(
    albumArtFiles,
    sourceDirectory,
    destinationDirectory,
    audioPlans,
    options.execute === true,
  )
  const planned = [...audioPlans, ...albumArtPlans]

  await prepareOrganizationDestinations(
    planned,
    destinationDirectory,
    normalized.destinationStrategy,
    options.execute === true,
  )
  if (options.execute === true) {
    await executeOrganizationCopies(planned)
  }
  return planned.map(plan => plan.row)
}
