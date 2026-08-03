import { parseFile } from 'music-metadata'
import { randomUUID } from 'node:crypto'
import { copyFile, mkdir, rename, rm } from 'node:fs/promises'
import { basename, dirname, extname, join, relative } from 'node:path'

import { pathExists } from '../../command-utils.js'
import { UserInputError } from '../errors.js'

import { type AudioTagFix, writeAudioTagFix } from './audio-tags.js'
import type { DestinationStrategy } from './metadata-fix-types.js'
import type { PlannedOrganizationCopy } from './organize-files-types.js'

export function assertUniqueOrganizationDestinations(
  plannedCopies: PlannedOrganizationCopy[],
  destinationDirectory: string,
): void {
  const filenamesByDestination = new Map<string, string[]>()

  for (const plan of plannedCopies) {
    const filenames = filenamesByDestination.get(plan.destinationPath) ?? []
    filenames.push(plan.row.filename)
    filenamesByDestination.set(plan.destinationPath, filenames)
  }
  const duplicates = [...filenamesByDestination.entries()].filter(([, filenames]) => filenames.length > 1)

  if (duplicates.length > 0) {
    throw new UserInputError(`Multiple files resolve to the same destination: ${duplicates
      .map(([path, filenames]) => `${relative(destinationDirectory, path)} (${filenames.join(', ')})`)
      .join('; ')}`)
  }
}

export async function prepareOrganizationDestinations(
  plannedCopies: PlannedOrganizationCopy[],
  destinationDirectory: string,
  strategy: DestinationStrategy,
  execute: boolean,
): Promise<void> {
  assertUniqueOrganizationDestinations(plannedCopies, destinationDirectory)
  if (strategy === 'error') {
    await assertNoExistingAlbum(plannedCopies, destinationDirectory)
  }
  const existing = await Promise.all(plannedCopies.map(plan => pathExists(plan.destinationPath)))

  for (const [index, plan] of plannedCopies.entries()) {
    const destinationExists = existing[index] ?? false
    plan.destinationExists = destinationExists
    plan.destinationStrategy = strategy
    if (!destinationExists) {
      plan.row.action = execute ? 'copied' : 'would copy'
    }
    else if (strategy === 'ignore') {
      plan.row.action = execute ? 'ignored' : 'would ignore'
    }
    else if (strategy === 'overwrite') {
      plan.row.action = execute ? 'overwritten' : 'would overwrite'
    }
  }
  if (strategy === 'error') {
    assertNoExistingFiles(plannedCopies, destinationDirectory)
  }
}

async function assertNoExistingAlbum(
  plannedCopies: PlannedOrganizationCopy[],
  destinationDirectory: string,
): Promise<void> {
  const albumPaths = [...new Set(plannedCopies.map(plan => plan.albumDestinationPath))]
  const existing = (await Promise.all(albumPaths.map(async path => ({
    exists: await pathExists(path),
    path,
  })))).filter(destination => destination.exists)

  if (existing.length > 0) {
    throw new UserInputError(`Destination album directories already exist: ${existing
      .map(destination => relative(destinationDirectory, destination.path))
      .join(', ')}`)
  }
}

function assertNoExistingFiles(plannedCopies: PlannedOrganizationCopy[], destinationDirectory: string): void {
  const existing = plannedCopies.filter(plan => plan.destinationExists)

  if (existing.length > 0) {
    throw new UserInputError(`Destination files already exist: ${existing
      .map(plan => relative(destinationDirectory, plan.destinationPath))
      .join(', ')}`)
  }
}

function temporaryPath(destinationPath: string): string {
  const extension = extname(destinationPath)
  const stem = basename(destinationPath, extension)
  return join(dirname(destinationPath), `.${stem}.${randomUUID()}.tmp${extension}`)
}

function metadataValues(values: string[] | undefined, value: string | undefined): string[] {
  return values ?? (value === undefined || value === '' ? [] : [value])
}

function matchesNumericTagFix(value: number | null, kindedValue: AudioTagFix['discNumber']): boolean {
  return kindedValue === undefined || (
    kindedValue.kind === 'clear'
      ? value === null || value === 0
      : value === kindedValue.value
  )
}

async function verifyTagFix(path: string, fix: AudioTagFix): Promise<void> {
  if (Object.keys(fix).length === 0) {
    return
  }
  const common = (await parseFile(path)).common
  const matches = [
    fix.album === undefined || common.album === fix.album,
    fix.albumArtists === undefined
    || JSON.stringify(metadataValues(common.albumartists, common.albumartist)) === JSON.stringify(fix.albumArtists),
    fix.artists === undefined
    || JSON.stringify(metadataValues(common.artists, common.artist)) === JSON.stringify(fix.artists),
    matchesNumericTagFix(common.disk.no, fix.discNumber),
    matchesNumericTagFix(common.disk.of, fix.discTotal),
    fix.producers === undefined || JSON.stringify(common.producer ?? []) === JSON.stringify(fix.producers),
    fix.title === undefined || common.title === fix.title,
    fix.trackNumber === undefined || common.track.no === fix.trackNumber,
  ]

  if (matches.some(match => !match)) {
    throw new Error(`Metadata was not persisted: ${JSON.stringify(fix)}`)
  }
}

export async function executeOrganizationCopies(plannedCopies: PlannedOrganizationCopy[]): Promise<void> {
  for (const plan of plannedCopies) {
    if (plan.destinationExists && plan.destinationStrategy === 'ignore') {
      continue
    }
    await publishOrganizationCopy(plan)
  }
}

async function publishOrganizationCopy(plan: PlannedOrganizationCopy): Promise<void> {
  await mkdir(dirname(plan.destinationPath), { recursive: true })
  const stagedPath = temporaryPath(plan.destinationPath)

  try {
    await copyFile(plan.sourcePath, stagedPath)
    if (plan.tagFix !== undefined && Object.keys(plan.tagFix).length > 0) {
      writeAudioTagFix(stagedPath, plan.tagFix)
      await verifyTagFix(stagedPath, plan.tagFix)
    }
    await rename(stagedPath, plan.destinationPath)
  }
  catch (error) {
    const message = plan.tagFix === undefined
      ? `Failed to organize album art "${plan.row.filename}"`
      : `Failed to repair and organize "${plan.row.filename}" with metadata ${JSON.stringify(plan.tagFix)}`

    throw new Error(message, { cause: error })
  }
  finally {
    await rm(stagedPath, { force: true })
  }
}
