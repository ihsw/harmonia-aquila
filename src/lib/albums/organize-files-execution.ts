import { copyFile, mkdir } from 'node:fs/promises'
import { dirname, relative } from 'node:path'

import { pathExists } from '../../command-utils.js'
import { UserInputError } from '../errors.js'

export interface PlannedOrganizationCopy {
  albumDestinationPath: string
  destinationPath: string
  row: { filename: string }
  sourcePath: string
}

export function assertUniqueOrganizationDestinations(
  plannedCopies: PlannedOrganizationCopy[],
  destinationDirectory: string,
): void {
  const filenamesByDestination = new Map<string, string[]>()

  for (const plannedCopy of plannedCopies) {
    const matchingFiles = filenamesByDestination.get(plannedCopy.destinationPath) ?? []

    matchingFiles.push(plannedCopy.row.filename)
    filenamesByDestination.set(plannedCopy.destinationPath, matchingFiles)
  }

  const duplicates = [...filenamesByDestination.entries()].filter(([, filenames]) => filenames.length > 1)

  if (duplicates.length > 0) {
    throw new UserInputError(`Multiple files resolve to the same destination: ${duplicates
      .map(([path, filenames]) => `${relative(destinationDirectory, path)} (${filenames.join(', ')})`)
      .join('; ')}`)
  }
}

export async function assertOrganizationDestinationsAvailable(
  plannedCopies: PlannedOrganizationCopy[],
  destinationDirectory: string,
): Promise<void> {
  const albumPaths = [...new Set(plannedCopies.map(plannedCopy => plannedCopy.albumDestinationPath))]
  const existingAlbums = (await Promise.all(albumPaths.map(async path => ({
    exists: await pathExists(path),
    path,
  })))).filter(destination => destination.exists)

  if (existingAlbums.length > 0) {
    throw new UserInputError(`Destination album directories already exist: ${existingAlbums
      .map(destination => relative(destinationDirectory, destination.path))
      .join(', ')}`)
  }

  const existingFiles = (await Promise.all(plannedCopies.map(async plannedCopy => ({
    exists: await pathExists(plannedCopy.destinationPath),
    plannedCopy,
  })))).filter(destination => destination.exists)

  if (existingFiles.length > 0) {
    throw new UserInputError(`Destination files already exist: ${existingFiles
      .map(destination => relative(destinationDirectory, destination.plannedCopy.destinationPath))
      .join(', ')}`)
  }
}

export async function executeOrganizationCopies(plannedCopies: PlannedOrganizationCopy[]): Promise<void> {
  for (const plannedCopy of plannedCopies) {
    await mkdir(dirname(plannedCopy.destinationPath), { recursive: true })
    await copyFile(plannedCopy.sourcePath, plannedCopy.destinationPath)
  }
}
