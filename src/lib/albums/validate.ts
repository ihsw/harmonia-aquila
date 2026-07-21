import { parseFile } from 'music-metadata'
import { resolve } from 'node:path'
import pLimit from 'p-limit'

import { getAudioFiles, parseLimit } from './audio-files.js'
import {
  type ArtistFilenameStrategy,
  formatTrackNumber,
  getAlbumDestination,
  getArtistFilename,
  parseArtistFilenameStrategy,
  parseTitleFilenameStrategy,
  type TitleFilenameStrategy,
} from './organization-plan.js'

export interface ValidateAlbumSourceDirOptions {
  artistFilenameStrategy?: string
  dirName: string
  ignoreNonAudioFiles?: boolean
  limit?: string
  titleFilenameStrategy?: string
}

export interface ValidateAlbumSourceDirJsonOutputRow {
  album: string
  artistFilename: string
  artistFilenameStrategy: ArtistFilenameStrategy
  destination: string
  filename: string
  issues: string[]
  status: 'invalid' | 'valid'
  titleFilename: string
  titleFilenameStrategy: TitleFilenameStrategy
  trackNumber: string
}

export type ValidateAlbumSourceDirJsonOutput = ValidateAlbumSourceDirJsonOutputRow[]

function getMissingIssues(
  album: string,
  artistFilename: string,
  trackNumber: number | null,
  titleFilename: string,
  artistFilenameStrategy: ArtistFilenameStrategy,
  titleFilenameStrategy: TitleFilenameStrategy,
): string[] {
  return [
    album === '' ? 'missing album' : undefined,
    artistFilename === '' ? `missing ${artistFilenameStrategy}` : undefined,
    trackNumber === null ? 'missing track number' : undefined,
    titleFilename === '' ? `missing ${titleFilenameStrategy}` : undefined,
  ].filter((issue): issue is string => issue !== undefined)
}

function addDuplicateDestinationIssues(rows: ValidateAlbumSourceDirJsonOutputRow[]): void {
  const destinationRows = new Map<string, ValidateAlbumSourceDirJsonOutputRow[]>()

  for (const row of rows) {
    if (row.destination === '') {
      continue
    }

    destinationRows.set(row.destination, [...(destinationRows.get(row.destination) ?? []), row])
  }

  for (const [destination, matchingRows] of destinationRows) {
    if (matchingRows.length < 2) {
      continue
    }

    for (const row of matchingRows) {
      row.issues.push(`duplicate destination: ${destination}`)
      row.status = 'invalid'
    }
  }
}

export async function validateAlbumSourceDir(options: ValidateAlbumSourceDirOptions): Promise<ValidateAlbumSourceDirJsonOutput> {
  const limit = parseLimit(options.limit)
  const artistFilenameStrategy = parseArtistFilenameStrategy(options.artistFilenameStrategy)
  const titleFilenameStrategy = parseTitleFilenameStrategy(options.titleFilenameStrategy)
  const { files, targetDirectory } = await getAudioFiles(
    options.dirName,
    { ignoreNonAudioFiles: options.ignoreNonAudioFiles === true },
  )
  const filesToValidate = limit === undefined ? files : files.slice(0, limit)
  const parseMetadata = pLimit(16)
  const rows = await Promise.all(
    filesToValidate.map(file => parseMetadata(async (): Promise<ValidateAlbumSourceDirJsonOutputRow> => {
      const metadata = await parseFile(resolve(targetDirectory, file.name))
      const album = metadata.common.album ?? ''
      const albumartist = metadata.common.albumartist ?? ''
      const artist = metadata.common.artist ?? ''
      const label = metadata.common.label ?? []
      const producer = metadata.common.producer ?? []
      const artistFilename = getArtistFilename(artistFilenameStrategy, artist, albumartist, label, producer)
      const title = metadata.common.title ?? ''
      const subtitle = metadata.common.subtitle?.[0] ?? ''
      const titleFilename = titleFilenameStrategy === 'subtitle' ? subtitle : title
      const trackNumber = metadata.common.track.no
      const issues = getMissingIssues(
        album,
        artistFilename,
        trackNumber,
        titleFilename,
        artistFilenameStrategy,
        titleFilenameStrategy,
      )

      return {
        album,
        artistFilename,
        artistFilenameStrategy,
        destination: issues.length === 0 && trackNumber !== null
          ? getAlbumDestination(artistFilename, album, trackNumber, titleFilename, file.name)
          : '',
        filename: file.name,
        issues,
        status: issues.length === 0 ? 'valid' : 'invalid',
        titleFilename,
        titleFilenameStrategy,
        trackNumber: trackNumber === null ? '' : formatTrackNumber(trackNumber),
      }
    })),
  )

  addDuplicateDestinationIssues(rows)

  return rows
}
