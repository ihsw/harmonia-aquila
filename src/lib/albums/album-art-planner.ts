import type { Dirent } from 'node:fs'
import { join, relative } from 'node:path'

import type { PlannedOrganizationCopy } from './organize-files-types.js'

function compareBasenames(left: Dirent, right: Dirent): number {
  const insensitive = left.name.toLowerCase().localeCompare(right.name.toLowerCase())

  if (insensitive !== 0 || left.name === right.name) {
    return insensitive
  }
  return left.name < right.name ? -1 : 1
}

export function planAlbumArtCopies(
  albumArtFiles: Dirent[],
  sourceDirectory: string,
  destinationDirectory: string,
  audioPlans: PlannedOrganizationCopy[],
  execute: boolean,
): PlannedOrganizationCopy[] {
  const albumDestinationPath = audioPlans[0]?.albumDestinationPath

  if (albumDestinationPath === undefined) {
    return []
  }
  return [...albumArtFiles].sort(compareBasenames).map((file): PlannedOrganizationCopy => {
    const destinationPath = join(albumDestinationPath, file.name)

    return {
      albumDestinationPath,
      destinationExists: false,
      destinationPath,
      destinationStrategy: 'error',
      row: {
        action: execute ? 'copied' : 'would copy',
        destination: relative(destinationDirectory, destinationPath),
        fileType: 'albumArt',
        filename: file.name,
      },
      sourcePath: join(sourceDirectory, file.name),
    }
  })
}
