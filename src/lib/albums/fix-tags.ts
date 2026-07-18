import { parseFile } from 'music-metadata'
import { copyFile, mkdir } from 'node:fs/promises'
import { dirname, relative, resolve } from 'node:path'
import pLimit from 'p-limit'

import { pathExists } from '../../command-utils.js'
import { parseSetMetadataFile, reconcileSetMetadata, type SetMetadataRecord } from '../../commands/manage-albums/helpers/set-metadata.js'
import { getErrorMessage, UserInputError } from '../errors.js'

import { getAudioFiles, parseLimit } from './audio-files.js'
import { writeAudioTagFix } from './audio-tags.js'

interface FixTagsRow {
  action: string
  album: string
  albumartists?: string[]
  destination: string
  filename: string
  grouping: string
  newAlbum?: string
  newAlbumartists?: string[]
  newArtists?: string[]
  newProducers?: string[]
  newTitle?: string
  newTrackNumber?: number
  producers?: string[]
  title: string
  trackNumber?: number | string
  artist: string
}

export interface FixTagsJsonOutputRow {
  album: string
  artist: string
  title: string
  albumartists?: string[]
  newAlbum?: string
  newAlbumartists?: string[]
  newArtists?: string[]
  newProducers?: string[]
  newTitle?: string
  newTrackNumber?: number
  producers?: string[]
  trackNumber?: number | string
}

export type FixTagsJsonOutput = FixTagsJsonOutputRow[]

export interface FixTagsOptions {
  albumArtistsStrategy?: string
  albumStrategy?: string
  destDir: string
  destinationStrategy?: string
  execute?: boolean
  limit?: string
  producerStrategy?: string
  resetTrack?: boolean
  setAlbum?: string
  setAlbumArtist?: string
  setArtist?: string
  setMetadata?: string
  sourceDir: string
  swapArtistAlbumartist?: boolean
}

type DestinationStrategy = 'error' | 'ignore' | 'overwrite'
type AlbumArtistsStrategy = 'aggregate' | 'blank' | 'no change'
type AlbumStrategy = 'grouping' | 'no change' | 'originalalbum'
type ProducerStrategy = 'aggregate' | 'blank' | 'copy-from-album-artists' | 'no change'

interface ParsedTagFixSource {
  album: string
  albumArtists: string[]
  artists: string[]
  destinationPath: string
  filename: string
  grouping: string
  originalAlbum: string
  producers: string[]
  sourcePath: string
  title: string
  trackNumber: number | null
  artist: string
}

interface PlannedTagFix {
  destinationExists: boolean
  destinationPath: string
  hasChanges: boolean
  row: FixTagsRow
  sourcePath: string
  tagFix: {
    album?: string
    albumArtists?: string[]
    artists?: string[]
    producers?: string[]
    title?: string
    trackNumber?: number
  }
}

function createFixTagsError(message: string, cause: unknown): Error {
  return new Error(message, { cause })
}

function getMetadataArtists(artists: string[] | undefined, artist: string | undefined): string[] {
  return artists ?? (artist === undefined || artist === '' ? [] : [artist])
}

function areStringArraysEqual(left: string[], right: string[]): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index])
}

function uniqueSorted(values: string[]): string[] {
  return [...new Set(values)].sort((left, right) => left.localeCompare(right))
}

function parseDestinationStrategy(value: string | undefined): DestinationStrategy {
  const destinationStrategy = value ?? 'error'

  if (destinationStrategy !== 'error' && destinationStrategy !== 'ignore' && destinationStrategy !== 'overwrite') {
    throw new UserInputError('--destination-strategy must be one of: error, ignore, overwrite')
  }

  return destinationStrategy
}

function parseAlbumArtistsStrategy(value: string | undefined): AlbumArtistsStrategy {
  const albumArtistsStrategy = value ?? 'no change'

  if (albumArtistsStrategy !== 'no change' && albumArtistsStrategy !== 'aggregate' && albumArtistsStrategy !== 'blank') {
    throw new UserInputError('--album-artists-strategy must be one of: no change, aggregate, blank')
  }

  return albumArtistsStrategy
}

function parseAlbumStrategy(value: string | undefined): AlbumStrategy {
  const albumStrategy = value ?? 'no change'

  if (albumStrategy !== 'no change' && albumStrategy !== 'grouping' && albumStrategy !== 'originalalbum') {
    throw new UserInputError('--album-strategy must be one of: no change, grouping, originalalbum')
  }

  return albumStrategy
}

function parseProducerStrategy(value: string | undefined): ProducerStrategy {
  const producerStrategy = value ?? 'no change'

  if (producerStrategy !== 'no change' && producerStrategy !== 'blank' && producerStrategy !== 'aggregate' && producerStrategy !== 'copy-from-album-artists') {
    throw new UserInputError('--producer-strategy must be one of: no change, blank, aggregate, copy-from-album-artists')
  }

  return producerStrategy
}

function validateAlbumArtistOptions(swapArtistAlbumartist: boolean, albumArtistsStrategy: AlbumArtistsStrategy, setAlbumArtist: string | undefined): void {
  if (swapArtistAlbumartist && albumArtistsStrategy !== 'no change') {
    throw new UserInputError('--swap-artist-albumartist conflicts with --album-artists-strategy')
  }

  if (setAlbumArtist !== undefined && albumArtistsStrategy !== 'no change') {
    throw new UserInputError('--set-album-artist conflicts with --album-artists-strategy')
  }

  if (setAlbumArtist !== undefined && swapArtistAlbumartist) {
    throw new UserInputError('--set-album-artist conflicts with --swap-artist-albumartist')
  }
}

function validateArtistOptions(swapArtistAlbumartist: boolean, setArtist: string | undefined): void {
  if (setArtist !== undefined && swapArtistAlbumartist) {
    throw new UserInputError('--set-artist conflicts with --swap-artist-albumartist')
  }
}

function validateAlbumOptions(albumStrategy: AlbumStrategy, setAlbum: string | undefined): void {
  if (setAlbum !== undefined && albumStrategy !== 'no change') {
    throw new UserInputError('--set-album conflicts with --album-strategy')
  }
}

interface SetMetadataConflictOptions {
  albumStrategy: AlbumStrategy
  resetTrack: boolean
  setAlbum: string | undefined
  setArtist: string | undefined
  swapArtistAlbumartist: boolean
}

function validateSetMetadataOptions(setMetadata: string | undefined, conflicts: SetMetadataConflictOptions): void {
  if (setMetadata === undefined) {
    return
  }

  const conflictingOptions: string[] = []

  if (conflicts.setArtist !== undefined) {
    conflictingOptions.push('--set-artist')
  }

  if (conflicts.setAlbum !== undefined) {
    conflictingOptions.push('--set-album')
  }

  if (conflicts.albumStrategy !== 'no change') {
    conflictingOptions.push('--album-strategy')
  }

  if (conflicts.resetTrack) {
    conflictingOptions.push('--reset-track')
  }

  if (conflicts.swapArtistAlbumartist) {
    conflictingOptions.push('--swap-artist-albumartist')
  }

  if (conflictingOptions.length > 0) {
    throw new UserInputError(`--set-metadata conflicts with ${conflictingOptions.join(', ')}`)
  }
}

function getEffectiveAlbum(parsedTagFixSource: ParsedTagFixSource, albumStrategy: AlbumStrategy, setAlbum: string | undefined): string {
  if (setAlbum !== undefined) {
    return setAlbum
  }

  if (albumStrategy === 'grouping') {
    return parsedTagFixSource.grouping
  }

  if (albumStrategy === 'originalalbum') {
    return parsedTagFixSource.originalAlbum
  }

  return parsedTagFixSource.album
}

function getAction(destinationStrategy: DestinationStrategy, destinationExists: boolean, execute: boolean, hasChanges: boolean): string {
  if (destinationExists && destinationStrategy === 'ignore') {
    return execute ? 'ignored' : 'would ignore'
  }

  if (destinationExists && destinationStrategy === 'overwrite') {
    return execute
      ? hasChanges ? 'overwritten and updated' : 'overwritten'
      : hasChanges ? 'would overwrite and update' : 'would overwrite'
  }

  return execute
    ? hasChanges ? 'copied and updated' : 'copied'
    : hasChanges ? 'would copy and update' : 'would copy'
}

function requireFixTagsJsonField<T>(fieldName: keyof FixTagsJsonOutputRow, value: T | undefined): T {
  if (value === undefined) {
    throw new Error(`Missing expected fix-tags JSON output field: ${fieldName}`)
  }

  return value
}

export async function fixAlbumTags(options: FixTagsOptions): Promise<FixTagsJsonOutput> {
  const limit = parseLimit(options.limit)
  const destinationStrategy = parseDestinationStrategy(options.destinationStrategy)
  const albumStrategy = parseAlbumStrategy(options.albumStrategy)
  const albumArtistsStrategy = parseAlbumArtistsStrategy(options.albumArtistsStrategy)
  const producerStrategy = parseProducerStrategy(options.producerStrategy)
  const setAlbum = options.setAlbum
  const setAlbumArtist = options.setAlbumArtist
  const setArtist = options.setArtist
  const setMetadata = options.setMetadata
  const resetTrack = options.resetTrack === true
  const swapArtistAlbumartist = options.swapArtistAlbumartist === true

  validateAlbumOptions(albumStrategy, setAlbum)
  validateAlbumArtistOptions(swapArtistAlbumartist, albumArtistsStrategy, setAlbumArtist)
  validateArtistOptions(swapArtistAlbumartist, setArtist)
  validateSetMetadataOptions(setMetadata, { albumStrategy, resetTrack, setAlbum, setArtist, swapArtistAlbumartist })

  let setMetadataRecords: SetMetadataRecord[] | undefined

  if (setMetadata !== undefined) {
    try {
      setMetadataRecords = await parseSetMetadataFile(resolve(setMetadata))
    }
    catch (error) {
      throw new UserInputError(getErrorMessage(error))
    }
  }

  const { files, targetDirectory: sourceDirectory } = await getAudioFiles(options.sourceDir)
  const destinationDirectory = resolve(options.destDir)
  const filesToFix = limit === undefined ? files : files.slice(0, limit)
  let setMetadataByFilename: Map<string, SetMetadataRecord> | undefined

  if (setMetadataRecords !== undefined) {
    try {
      setMetadataByFilename = reconcileSetMetadata(setMetadataRecords, filesToFix.map(file => file.name))
    }
    catch (error) {
      throw new UserInputError(getErrorMessage(error))
    }
  }
  const processMetadata = pLimit(16)
  const parsedTagFixSources = await Promise.all(
    filesToFix.map(file => processMetadata(async (): Promise<ParsedTagFixSource> => {
      const sourcePath = resolve(sourceDirectory, file.name)
      const destinationPath = resolve(destinationDirectory, file.name)
      let metadata

      try {
        metadata = await parseFile(sourcePath)
      }
      catch (error) {
        throw createFixTagsError(
          `Failed to read metadata for fix-tags source "${sourcePath}" with destination "${destinationPath}"`,
          error,
        )
      }

      const album = metadata.common.album ?? ''
      const albumArtists = getMetadataArtists(metadata.common.albumartists, metadata.common.albumartist)
      const artists = getMetadataArtists(metadata.common.artists, metadata.common.artist)
      const grouping = metadata.common.grouping ?? ''
      const originalAlbum = metadata.common.originalalbum ?? ''
      const producers = metadata.common.producer ?? []
      const title = metadata.common.title ?? ''
      const trackNumber = metadata.common.track.no
      const artist = metadata.common.artist ?? ''

      return {
        album,
        albumArtists,
        artist,
        artists,
        destinationPath,
        filename: file.name,
        grouping,
        originalAlbum,
        producers,
        sourcePath,
        title,
        trackNumber,
      }
    })),
  )
  const artistsByAlbum = new Map<string, string[]>()

  for (const parsedTagFixSource of parsedTagFixSources) {
    const albumArtists = artistsByAlbum.get(parsedTagFixSource.grouping) ?? []

    albumArtists.push(...parsedTagFixSource.artists)
    artistsByAlbum.set(parsedTagFixSource.grouping, albumArtists)
  }

  for (const [album, artists] of artistsByAlbum.entries()) {
    artistsByAlbum.set(album, uniqueSorted(artists))
  }

  const producersByAlbum = new Map<string, string[]>()

  for (const parsedTagFixSource of parsedTagFixSources) {
    const producers = producersByAlbum.get(parsedTagFixSource.grouping) ?? []

    producers.push(...parsedTagFixSource.producers)
    producersByAlbum.set(parsedTagFixSource.grouping, producers)
  }

  for (const [album, producers] of producersByAlbum.entries()) {
    producersByAlbum.set(album, uniqueSorted(producers))
  }

  const resetTrackNumbersBySourcePath = new Map<string, number>()

  if (resetTrack) {
    const sourcesByAlbum = new Map<string, ParsedTagFixSource[]>()

    for (const parsedTagFixSource of parsedTagFixSources) {
      const album = getEffectiveAlbum(parsedTagFixSource, albumStrategy, setAlbum)
      const albumSources = sourcesByAlbum.get(album) ?? []

      albumSources.push(parsedTagFixSource)
      sourcesByAlbum.set(album, albumSources)
    }

    for (const albumSources of sourcesByAlbum.values()) {
      const sortedAlbumSources = [...albumSources].sort((left, right) => left.filename.localeCompare(right.filename))

      sortedAlbumSources.forEach((parsedTagFixSource, index) => {
        resetTrackNumbersBySourcePath.set(parsedTagFixSource.sourcePath, index + 1)
      })
    }
  }

  const plannedTagFixes = await Promise.all(
    parsedTagFixSources.map(async (parsedTagFixSource): Promise<PlannedTagFix> => {
      const setMetadataRecord = setMetadataByFilename?.get(parsedTagFixSource.filename)
      const albumArtists = (() => {
        if (setAlbumArtist !== undefined) {
          return [setAlbumArtist]
        }

        if (swapArtistAlbumartist) {
          return parsedTagFixSource.artists
        }

        if (albumArtistsStrategy === 'aggregate') {
          return artistsByAlbum.get(parsedTagFixSource.grouping) ?? []
        }

        return []
      })()
      const shouldUpdateAlbumArtists = setAlbumArtist !== undefined || swapArtistAlbumartist || albumArtistsStrategy !== 'no change'
      const shouldUpdateAlbum = setMetadataRecord !== undefined || setAlbum !== undefined || albumStrategy !== 'no change'
      const artists = setMetadataRecord !== undefined
        ? [setMetadataRecord.artist]
        : setArtist !== undefined
          ? [setArtist]
          : swapArtistAlbumartist ? parsedTagFixSource.albumArtists : undefined
      const shouldUpdateArtists = artists !== undefined
      const producers = producerStrategy === 'aggregate'
        ? producersByAlbum.get(parsedTagFixSource.grouping) ?? []
        : producerStrategy === 'copy-from-album-artists'
          ? parsedTagFixSource.albumArtists
          : []
      const shouldUpdateProducers = producerStrategy !== 'no change'
      const album = setMetadataRecord?.album ?? setAlbum ?? (albumStrategy === 'grouping'
        ? parsedTagFixSource.grouping
        : albumStrategy === 'originalalbum'
          ? parsedTagFixSource.originalAlbum
          : undefined)
      const trackNumber = setMetadataRecord?.trackNumber ?? resetTrackNumbersBySourcePath.get(parsedTagFixSource.sourcePath)
      const title = setMetadataRecord?.title
      const shouldUpdateTitle = title !== undefined
      const hasAlbumArtistsChanges = shouldUpdateAlbumArtists && !areStringArraysEqual(parsedTagFixSource.albumArtists, albumArtists)
      const hasArtistsChanges = shouldUpdateArtists && !areStringArraysEqual(parsedTagFixSource.artists, artists)
      const hasAlbumChanges = shouldUpdateAlbum && album !== undefined && parsedTagFixSource.album !== album
      const hasProducerChanges = shouldUpdateProducers && !areStringArraysEqual(parsedTagFixSource.producers, producers)
      const hasTrackNumberChanges = trackNumber !== undefined && parsedTagFixSource.trackNumber !== trackNumber
      const hasTitleChanges = shouldUpdateTitle && parsedTagFixSource.title !== title
      const hasChanges = hasAlbumChanges || hasAlbumArtistsChanges || hasArtistsChanges || hasProducerChanges || hasTrackNumberChanges || hasTitleChanges
      const destinationExists = await pathExists(parsedTagFixSource.destinationPath)
      const action = getAction(destinationStrategy, destinationExists, options.execute === true, hasChanges)
      const albumArtistsRow = (() => {
        if (swapArtistAlbumartist) {
          return {
            albumartists: parsedTagFixSource.albumArtists,
            newAlbumartists: albumArtists,
            newArtists: parsedTagFixSource.albumArtists,
          }
        }

        if (shouldUpdateAlbumArtists) {
          return {
            albumartists: parsedTagFixSource.albumArtists,
            newAlbumartists: albumArtists,
          }
        }

        return {}
      })()
      const artistsRow = shouldUpdateArtists
        ? { newArtists: artists }
        : {}
      const tagFix = {
        ...(album === undefined ? {} : { album }),
        ...(shouldUpdateAlbumArtists ? { albumArtists } : {}),
        ...(shouldUpdateArtists ? { artists } : {}),
        ...(shouldUpdateProducers ? { producers } : {}),
        ...(title === undefined ? {} : { title }),
        ...(trackNumber === undefined ? {} : { trackNumber }),
      }

      return {
        destinationExists,
        destinationPath: parsedTagFixSource.destinationPath,
        hasChanges,
        row: {
          action,
          album: parsedTagFixSource.album,
          artist: parsedTagFixSource.artist,
          destination: relative(destinationDirectory, parsedTagFixSource.destinationPath),
          filename: parsedTagFixSource.filename,
          grouping: parsedTagFixSource.grouping,
          title: parsedTagFixSource.title,
          ...(trackNumber === undefined
            ? {}
            : {
                newTrackNumber: trackNumber,
                trackNumber: parsedTagFixSource.trackNumber ?? '',
              }),
          ...(title === undefined ? {} : { newTitle: title }),
          ...(album === undefined ? {} : { newAlbum: album }),
          ...albumArtistsRow,
          ...artistsRow,
          ...(shouldUpdateProducers
            ? {
                newProducers: producers,
                producers: parsedTagFixSource.producers,
              }
            : {}),
        },
        sourcePath: parsedTagFixSource.sourcePath,
        tagFix,
      }
    }),
  )
  const conflictingDestinations = plannedTagFixes.filter(plannedTagFix => plannedTagFix.destinationExists)

  if (destinationStrategy === 'error' && conflictingDestinations.length > 0) {
    throw new UserInputError(`Destination files already exist: ${conflictingDestinations
      .map(plannedTagFix => relative(destinationDirectory, plannedTagFix.destinationPath))
      .join(', ')}`)
  }

  if (options.execute === true) {
    for (const plannedTagFix of plannedTagFixes) {
      if (plannedTagFix.destinationExists && destinationStrategy === 'ignore') {
        continue
      }

      try {
        await mkdir(dirname(plannedTagFix.destinationPath), { recursive: true })
        await copyFile(plannedTagFix.sourcePath, plannedTagFix.destinationPath)

        if (plannedTagFix.hasChanges) {
          writeAudioTagFix(plannedTagFix.destinationPath, plannedTagFix.tagFix)
        }
      }
      catch (error) {
        throw createFixTagsError(
          `Failed to copy/fix tags for source "${plannedTagFix.sourcePath}" to destination "${plannedTagFix.destinationPath}" with metadata ${JSON.stringify(plannedTagFix.tagFix)}`,
          error,
        )
      }
    }
  }

  const outputRows: FixTagsJsonOutput = plannedTagFixes.map((plannedTagFix): FixTagsJsonOutputRow => {
    const row: FixTagsJsonOutputRow = {
      album: plannedTagFix.row.album,
      artist: plannedTagFix.row.artist,
      title: plannedTagFix.row.title,
    }

    if (albumStrategy !== 'no change' || setAlbum !== undefined || setMetadata !== undefined) {
      row.newAlbum = requireFixTagsJsonField('newAlbum', plannedTagFix.row.newAlbum)
    }

    if (swapArtistAlbumartist) {
      Object.assign(row, {
        albumartists: requireFixTagsJsonField('albumartists', plannedTagFix.row.albumartists),
        newAlbumartists: requireFixTagsJsonField('newAlbumartists', plannedTagFix.row.newAlbumartists),
        newArtists: requireFixTagsJsonField('newArtists', plannedTagFix.row.newArtists),
      })
    }
    else if (albumArtistsStrategy !== 'no change' || setAlbumArtist !== undefined) {
      Object.assign(row, {
        albumartists: requireFixTagsJsonField('albumartists', plannedTagFix.row.albumartists),
        newAlbumartists: requireFixTagsJsonField('newAlbumartists', plannedTagFix.row.newAlbumartists),
      })
    }
    if (setArtist !== undefined || setMetadata !== undefined) {
      row.newArtists = requireFixTagsJsonField('newArtists', plannedTagFix.row.newArtists)
    }

    if (setMetadata !== undefined) {
      row.newTitle = requireFixTagsJsonField('newTitle', plannedTagFix.row.newTitle)
    }

    if (producerStrategy !== 'no change') {
      row.newProducers = requireFixTagsJsonField('newProducers', plannedTagFix.row.newProducers)
      row.producers = requireFixTagsJsonField('producers', plannedTagFix.row.producers)
    }

    if (resetTrack || setMetadata !== undefined) {
      row.newTrackNumber = requireFixTagsJsonField('newTrackNumber', plannedTagFix.row.newTrackNumber)
      row.trackNumber = requireFixTagsJsonField('trackNumber', plannedTagFix.row.trackNumber)
    }

    return row
  })

  return outputRows
}
