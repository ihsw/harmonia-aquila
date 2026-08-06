import { parseFile } from 'music-metadata'
import { resolve } from 'node:path'
import pLimit from 'p-limit'

import type { ParsedAlbumSource } from './metadata-fix-types.js'

function metadataValues(values: string[] | undefined, value: string | undefined): string[] {
  return values ?? (value === undefined || value === '' ? [] : [value])
}

export async function parseAlbumSources(
  sourceDirectory: string,
  filenames: string[],
): Promise<ParsedAlbumSource[]> {
  const parseMetadata = pLimit(16)

  return Promise.all(filenames.map(filename => parseMetadata(async () => {
    const sourcePath = resolve(sourceDirectory, filename)

    try {
      const metadata = await parseFile(sourcePath)

      return {
        album: metadata.common.album ?? '',
        albumArtists: metadataValues(metadata.common.albumartists, metadata.common.albumartist),
        artist: metadata.common.artist ?? '',
        artists: metadataValues(metadata.common.artists, metadata.common.artist),
        discNumber: metadata.common.disk.no,
        discTotal: metadata.common.disk.of,
        filename,
        grouping: metadata.common.grouping ?? '',
        labels: metadata.common.label ?? [],
        originalAlbum: metadata.common.originalalbum ?? '',
        producers: metadata.common.producer ?? [],
        sourcePath,
        subtitle: metadata.common.subtitle?.[0] ?? '',
        title: metadata.common.title ?? '',
        trackNumber: metadata.common.track.no,
        year: metadata.common.year ?? null,
      }
    }
    catch (error) {
      throw new Error(`Failed to read metadata for album source "${sourcePath}"`, { cause: error })
    }
  })))
}
