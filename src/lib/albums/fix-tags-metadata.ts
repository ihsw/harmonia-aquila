import { parseFile } from 'music-metadata'
import { resolve } from 'node:path'
import pLimit from 'p-limit'

import type { ParsedTagFixSource } from './fix-tags-types.js'

function metadataArtists(values: string[] | undefined, value: string | undefined): string[] {
  return values ?? (value === undefined || value === '' ? [] : [value])
}

export async function parseTagFixSources(
  sourceDirectory: string,
  destinationDirectory: string,
  filenames: string[],
): Promise<ParsedTagFixSource[]> {
  const parseMetadata = pLimit(16)

  return Promise.all(filenames.map(filename => parseMetadata(async () => {
    const sourcePath = resolve(sourceDirectory, filename)
    const destinationPath = resolve(destinationDirectory, filename)

    try {
      const metadata = await parseFile(sourcePath)

      return {
        album: metadata.common.album ?? '',
        albumArtists: metadataArtists(metadata.common.albumartists, metadata.common.albumartist),
        artist: metadata.common.artist ?? '',
        artists: metadataArtists(metadata.common.artists, metadata.common.artist),
        destinationPath,
        discNumber: metadata.common.disk.no,
        discTotal: metadata.common.disk.of,
        filename,
        grouping: metadata.common.grouping ?? '',
        originalAlbum: metadata.common.originalalbum ?? '',
        producers: metadata.common.producer ?? [],
        sourcePath,
        title: metadata.common.title ?? '',
        trackNumber: metadata.common.track.no,
      }
    }
    catch (error) {
      throw new Error(
        `Failed to read metadata for fix-tags source "${sourcePath}" with destination "${destinationPath}"`,
        { cause: error },
      )
    }
  })))
}
