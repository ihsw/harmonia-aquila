import { parseFile } from 'music-metadata'
import { resolve } from 'node:path'
import pLimit from 'p-limit'

import { getAudioFiles, parseLimit } from './audio-files.js'
import {
  formatDiscNumber,
  isMultiDiscSet,
  validateDiscSet,
} from './disc-metadata.js'
import {
  type ArtistFilenameStrategy,
  assertSingleAlbumDirectory,
  assertSingleArtistPerAlbumDirectory,
  formatTrackNumber,
  getAlbumDestination,
  getArtistFilename,
  parseArtistFilenameStrategy,
  parseTitleFilenameStrategy,
  sanitizePathSegment,
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
  discNumber: string
  discTotal: string
  filename: string
  issues: string[]
  status: 'invalid' | 'valid'
  titleFilename: string
  titleFilenameStrategy: TitleFilenameStrategy
  trackNumber: string
}

export type ValidateAlbumSourceDirJsonOutput = ValidateAlbumSourceDirJsonOutputRow[]

interface ParsedValidationRow {
  discNumber: number | null
  discTotal: number | null
  row: ValidateAlbumSourceDirJsonOutputRow
  trackNumber: number | null
}

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
  const parsedRows = await Promise.all(
    filesToValidate.map(file => parseMetadata(async (): Promise<ParsedValidationRow> => {
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
      const discNumber = metadata.common.disk.no
      const discTotal = metadata.common.disk.of
      const issues = getMissingIssues(
        album,
        artistFilename,
        trackNumber,
        titleFilename,
        artistFilenameStrategy,
        titleFilenameStrategy,
      )

      return {
        discNumber,
        discTotal,
        row: {
          album,
          artistFilename,
          artistFilenameStrategy,
          destination: '',
          discNumber: formatDiscNumber(discNumber),
          discTotal: formatDiscNumber(discTotal),
          filename: file.name,
          issues,
          status: issues.length === 0 ? 'valid' : 'invalid',
          titleFilename,
          titleFilenameStrategy,
          trackNumber: trackNumber === null ? '' : formatTrackNumber(trackNumber),
        },
        trackNumber,
      }
    })),
  )
  const discRecords = parsedRows.map(parsed => ({
    discNumber: parsed.discNumber,
    discTotal: parsed.discTotal,
    filename: parsed.row.filename,
    trackNumber: parsed.trackNumber,
  }))

  for (const issue of validateDiscSet(discRecords)) {
    for (const filename of issue.filenames) {
      const row = parsedRows.find(parsed => parsed.row.filename === filename)?.row

      if (row !== undefined && !row.issues.includes(issue.message)) {
        row.issues.push(issue.message)
        row.status = 'invalid'
      }
    }
  }

  const multiDisc = isMultiDiscSet(discRecords)

  for (const parsed of parsedRows) {
    if (parsed.row.status === 'valid' && parsed.trackNumber !== null) {
      parsed.row.destination = getAlbumDestination(
        parsed.row.artistFilename,
        parsed.row.album,
        parsed.trackNumber,
        parsed.row.titleFilename,
        parsed.row.filename,
        { discNumber: parsed.discNumber, discTotal: parsed.discTotal, multiDisc },
      )
    }
  }

  const rows = parsedRows.map(parsed => parsed.row)
  addDuplicateDestinationIssues(rows)
  const outputIdentities = rows
    .filter(row => row.destination !== '')
    .map(row => ({
      albumDirectory: sanitizePathSegment(row.album),
      artistDirectory: sanitizePathSegment(row.artistFilename),
    }))

  assertSingleAlbumDirectory(outputIdentities)
  assertSingleArtistPerAlbumDirectory(outputIdentities)
  return rows
}
