import { resolve } from 'node:path'

import {
  normalizeSetMetadataRecords,
  parseSetMetadataFile,
  reconcileSetMetadata,
  type SetMetadataRecord,
} from '../../commands/manage-albums/helpers/set-metadata.js'
import { getErrorMessage, UserInputError } from '../errors.js'

import { type AlbumArtPlanItem, planAlbumArtCopies } from './album-art-planner.js'
import { getAudioFiles, parseLimit } from './audio-files.js'
import { type ConcatenateDiscContext, readConcatenateAlbumSources } from './concatenate-album-sources.js'
import { normalizeMetadataFixOptions, parseAlbumArtStrategy } from './metadata-fix-options.js'
import { planMetadataFixes } from './metadata-fix-planner.js'
import { parseAlbumSources } from './metadata-fix-sources.js'
import type { PlannedMetadataFix } from './metadata-fix-types.js'
import { planOrganizationCopies } from './organization-planner.js'
import { executeOrganizationCopies, prepareOrganizationDestinations } from './organize-files-execution.js'
import type { OrganizeFilesJsonOutput, OrganizeFilesOptions, PlannedOrganizationCopy } from './organize-files-types.js'

export type { OrganizeFilesJsonOutput, OrganizeFilesJsonOutputRow, OrganizeFilesOptions, OrganizeFilesSourceOptions } from './organize-files-types.js'

async function readSetMetadata(
  path: string | undefined,
  inlineRecords: SetMetadataRecord[] | undefined,
): Promise<SetMetadataRecord[] | undefined> {
  try {
    if (inlineRecords !== undefined) {
      return normalizeSetMetadataRecords(inlineRecords)
    }
    if (path === undefined) {
      return undefined
    }
    return await parseSetMetadataFile(resolve(path))
  }
  catch (error) {
    throw new UserInputError(getErrorMessage(error))
  }
}

function assertSourceOptions(options: OrganizeFilesOptions): 'single' | 'concatenate' {
  const hasSourceDir = options.sourceDir !== undefined
  const hasSourceDirs = options.sourceDirs !== undefined

  if (hasSourceDir === hasSourceDirs) {
    throw new UserInputError('Exactly one of sourceDir or sourceDirs is required')
  }
  return hasSourceDir ? 'single' : 'concatenate'
}

function planArtRows(items: AlbumArtPlanItem[]): PlannedOrganizationCopy[] {
  return items.flatMap(item => item.type === 'planned' ? [item.plan] : [])
}

function rowsFromArtPlan(items: AlbumArtPlanItem[]): OrganizeFilesJsonOutput {
  return items.map(item => item.type === 'planned' ? item.plan.row : item.row)
}

function applyConcatenateDiscMetadata(
  fixes: PlannedMetadataFix[],
  discsBySourcePath: ReadonlyMap<string, ConcatenateDiscContext>,
): PlannedMetadataFix[] {
  return fixes.map((fix) => {
    const disc = discsBySourcePath.get(fix.source.sourcePath)

    if (disc === undefined) {
      throw new Error(`Missing concatenate disc context for "${fix.source.sourcePath}"`)
    }
    const discNumberChanged = fix.effective.discNumber !== disc.discNumber
    const discTotalChanged = fix.effective.discTotal !== disc.discTotal

    return {
      ...fix,
      effective: {
        ...fix.effective,
        discNumber: disc.discNumber,
        discTotal: disc.discTotal,
      },
      row: {
        ...fix.row,
        ...(discNumberChanged
          ? { discNumber: fix.source.discNumber, newDiscNumber: disc.discNumber }
          : {}),
        ...(discTotalChanged
          ? { discTotal: fix.source.discTotal, newDiscTotal: disc.discTotal }
          : {}),
      },
      tagFix: {
        ...fix.tagFix,
        ...(discNumberChanged ? { discNumber: { kind: 'set', value: disc.discNumber } as const } : {}),
        ...(discTotalChanged ? { discTotal: { kind: 'set', value: disc.discTotal } as const } : {}),
      },
    }
  })
}

async function organizeSingleAlbum(
  options: OrganizeFilesOptions,
  recordsByFilename: Map<string, SetMetadataRecord> | undefined,
  execute: boolean,
): Promise<OrganizeFilesJsonOutput> {
  const sourceDir = options.sourceDir

  if (sourceDir === undefined) {
    throw new UserInputError('sourceDir is required')
  }
  const { albumArtFiles, files, targetDirectory: sourceDirectory } = await getAudioFiles(sourceDir, {
    acceptAlbumArt: true,
    ignoreNonAudioFiles: options.ignoreNonAudioFiles === true,
  })
  const limit = parseLimit(options.limit)
  const selectedFiles = (limit === undefined ? files : files.slice(0, limit)).map(file => file.name)
  const sources = await parseAlbumSources(sourceDirectory, selectedFiles)
  const normalized = normalizeMetadataFixOptions(options)
  const fixes = planMetadataFixes(sources, recordsByFilename, normalized)
  const destinationDirectory = resolve(options.destDir)
  const audioPlans = planOrganizationCopies(fixes, options, destinationDirectory)
  const artItems = planAlbumArtCopies(
    [{ albumArtFiles, sourceDirectory, sourceIndex: 0 }],
    destinationDirectory,
    audioPlans,
    undefined,
    execute,
  )
  const planned = [...audioPlans, ...planArtRows(artItems)]

  await prepareOrganizationDestinations(planned, destinationDirectory, normalized.destinationStrategy, execute)
  if (execute) {
    await executeOrganizationCopies(planned)
  }
  return [...audioPlans.map(plan => plan.row), ...rowsFromArtPlan(artItems)]
}

async function organizeConcatenatedAlbum(
  options: OrganizeFilesOptions,
  execute: boolean,
): Promise<OrganizeFilesJsonOutput> {
  const normalized = normalizeMetadataFixOptions(options)
  const albumArtStrategy = parseAlbumArtStrategy(options.albumArtStrategy)
  const concatenated = await readConcatenateAlbumSources(options, normalized)
  const fixes = applyConcatenateDiscMetadata(
    planMetadataFixes(concatenated.sources, undefined, normalized),
    concatenated.discsBySourcePath,
  )
  const destinationDirectory = resolve(options.destDir)
  const audioPlans = planOrganizationCopies(fixes, options, destinationDirectory, 'flat')
  const artItems = planAlbumArtCopies(
    concatenated.sourceEntries,
    destinationDirectory,
    audioPlans,
    albumArtStrategy,
    execute,
  )
  const planned = [...audioPlans, ...planArtRows(artItems)]

  await prepareOrganizationDestinations(planned, destinationDirectory, normalized.destinationStrategy, execute)
  if (execute) {
    await executeOrganizationCopies(planned)
  }
  return [...audioPlans.map(plan => plan.row), ...rowsFromArtPlan(artItems)]
}

export async function organizeAlbumFiles(options: OrganizeFilesOptions): Promise<OrganizeFilesJsonOutput> {
  const mode = assertSourceOptions(options)
  const normalized = normalizeMetadataFixOptions(options)
  const records = await readSetMetadata(normalized.setMetadata, normalized.setMetadataRecords)

  if (mode === 'single' && normalized.discStrategy === 'concatenate') {
    throw new UserInputError('--disc-strategy concatenate requires sourceDirs')
  }
  if (mode === 'concatenate' && normalized.discStrategy !== 'concatenate') {
    throw new UserInputError('sourceDirs requires --disc-strategy concatenate')
  }
  if (mode === 'single') {
    if (options.albumArtStrategy !== undefined) {
      throw new UserInputError('--album-art-strategy requires sourceDirs')
    }
    const sourceDir = options.sourceDir

    if (sourceDir === undefined) {
      throw new UserInputError('sourceDir is required')
    }
    let recordsByFilename: Map<string, SetMetadataRecord> | undefined
    const limit = parseLimit(options.limit)
    const { files } = await getAudioFiles(sourceDir, {
      acceptAlbumArt: true,
      ignoreNonAudioFiles: options.ignoreNonAudioFiles === true,
    })
    const selectedFiles = (limit === undefined ? files : files.slice(0, limit)).map(file => file.name)

    if (records !== undefined) {
      try {
        recordsByFilename = reconcileSetMetadata(records, selectedFiles)
      }
      catch (error) {
        throw new UserInputError(getErrorMessage(error))
      }
    }
    return organizeSingleAlbum(options, recordsByFilename, options.execute === true)
  }
  if (records !== undefined) {
    throw new UserInputError('--set-metadata is not supported with sourceDirs')
  }
  return organizeConcatenatedAlbum(options, options.execute === true)
}
