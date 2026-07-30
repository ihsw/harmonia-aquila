import { pathExists } from '../../command-utils.js'
import type { SetMetadataRecord } from '../../commands/manage-albums/helpers/set-metadata.js'
import { UserInputError } from '../errors.js'

import { inferDiscSet, throwForDiscSetIssues } from './disc-metadata.js'
import type {
  FixTagsJsonOutputRow,
  NormalizedFixTagsOptions,
  ParsedTagFixSource,
  PlannedTagFix,
} from './fix-tags-types.js'

function uniqueSorted(values: string[]): string[] {
  return [...new Set(values)].sort((left, right) => left.localeCompare(right))
}

function collectByGrouping(
  sources: ParsedTagFixSource[],
  select: (source: ParsedTagFixSource) => string[],
): Map<string, string[]> {
  const valuesByGrouping = new Map<string, string[]>()

  for (const source of sources) {
    valuesByGrouping.set(source.grouping, [
      ...(valuesByGrouping.get(source.grouping) ?? []),
      ...select(source),
    ])
  }

  for (const [grouping, values] of valuesByGrouping) {
    valuesByGrouping.set(grouping, uniqueSorted(values))
  }

  return valuesByGrouping
}

function effectiveAlbum(source: ParsedTagFixSource, options: NormalizedFixTagsOptions): string {
  if (options.setAlbum !== undefined) {
    return options.setAlbum
  }

  if (options.albumStrategy === 'grouping') {
    return source.grouping
  }

  return options.albumStrategy === 'originalalbum' ? source.originalAlbum : source.album
}

function resetTrackNumbers(
  sources: ParsedTagFixSource[],
  options: NormalizedFixTagsOptions,
): Map<string, number> {
  const result = new Map<string, number>()

  if (!options.resetTrack) {
    return result
  }

  const sourcesByAlbum = new Map<string, ParsedTagFixSource[]>()

  for (const source of sources) {
    const album = effectiveAlbum(source, options)
    sourcesByAlbum.set(album, [...(sourcesByAlbum.get(album) ?? []), source])
  }

  for (const albumSources of sourcesByAlbum.values()) {
    [...albumSources]
      .sort((left, right) => left.filename.localeCompare(right.filename))
      .forEach((source, index) => result.set(source.sourcePath, index + 1))
  }

  return result
}

function getDiscChanges(
  sources: ParsedTagFixSource[],
  records: Map<string, SetMetadataRecord> | undefined,
  options: NormalizedFixTagsOptions,
): Map<string, { discNumber: number, discTotal: number }> {
  const explicitDiscRecords = [...(records?.values() ?? [])]
    .filter(record => record.discNumber !== undefined || record.discTotal !== undefined)

  if (options.discStrategy === 'infer' && explicitDiscRecords.length > 0) {
    throw new UserInputError('--disc-strategy infer conflicts with disc fields in --set-metadata')
  }

  if (options.discStrategy === 'infer') {
    return inferDiscSet(sources)
  }

  return new Map(sources.flatMap((source) => {
    const record = records?.get(source.filename)

    return record?.discNumber === undefined
      ? []
      : [[source.filename, {
          discNumber: record.discNumber,
          discTotal: record.discTotal ?? source.discTotal ?? record.discNumber,
        }]]
  }))
}

export async function planAlbumTagFixes(
  sources: ParsedTagFixSource[],
  records: Map<string, SetMetadataRecord> | undefined,
  options: NormalizedFixTagsOptions,
): Promise<PlannedTagFix[]> {
  const artistsByGrouping = collectByGrouping(sources, source => source.artists)
  const producersByGrouping = collectByGrouping(sources, source => source.producers)
  const tracksByPath = resetTrackNumbers(sources, options)
  const discsByFilename = getDiscChanges(sources, records, options)
  const effectiveDiscRecords = sources.map((source) => {
    const disc = discsByFilename.get(source.filename)
    return {
      discNumber: disc?.discNumber ?? source.discNumber,
      discTotal: disc?.discTotal ?? source.discTotal,
      filename: source.filename,
      trackNumber: records?.get(source.filename)?.trackNumber ?? tracksByPath.get(source.sourcePath) ?? source.trackNumber,
    }
  })

  throwForDiscSetIssues(effectiveDiscRecords)
  return Promise.all(sources.map(async (source): Promise<PlannedTagFix> => {
    const record = records?.get(source.filename)
    const album = record?.album ?? (options.setAlbum !== undefined || options.albumStrategy !== 'no change'
      ? effectiveAlbum(source, options)
      : undefined)
    const albumArtists = options.setAlbumArtist !== undefined
      ? [options.setAlbumArtist]
      : options.swapArtistAlbumartist
        ? source.artists
        : options.albumArtistsStrategy === 'aggregate'
          ? artistsByGrouping.get(source.grouping) ?? []
          : options.albumArtistsStrategy === 'blank' ? [] : undefined
    const artists = record === undefined
      ? options.setArtist !== undefined
        ? [options.setArtist]
        : options.swapArtistAlbumartist ? source.albumArtists : undefined
      : [record.artist]
    const producers = options.producerStrategy === 'aggregate'
      ? producersByGrouping.get(source.grouping) ?? []
      : options.producerStrategy === 'copy-from-album-artists'
        ? source.albumArtists
        : options.producerStrategy === 'blank' ? [] : undefined
    const title = record?.title
    const trackNumber = record?.trackNumber ?? tracksByPath.get(source.sourcePath)
    const disc = discsByFilename.get(source.filename)
    const tagFix = {
      ...(album === undefined ? {} : { album }),
      ...(albumArtists === undefined ? {} : { albumArtists }),
      ...(artists === undefined ? {} : { artists }),
      ...(disc === undefined ? {} : { discNumber: disc.discNumber, discTotal: disc.discTotal }),
      ...(producers === undefined ? {} : { producers }),
      ...(title === undefined ? {} : { title }),
      ...(trackNumber === undefined ? {} : { trackNumber }),
    }
    const changed = Object.keys(tagFix).length > 0
    const exists = await pathExists(source.destinationPath)
    const row: FixTagsJsonOutputRow = {
      album: source.album,
      artist: source.artist,
      title: source.title,
      ...(album === undefined ? {} : { newAlbum: album }),
      ...(albumArtists === undefined ? {} : { albumartists: source.albumArtists, newAlbumartists: albumArtists }),
      ...(artists === undefined ? {} : { newArtists: artists }),
      ...(disc === undefined
        ? {}
        : {
            discNumber: source.discNumber,
            discTotal: source.discTotal,
            newDiscNumber: disc.discNumber,
            newDiscTotal: disc.discTotal,
          }),
      ...(producers === undefined ? {} : { newProducers: producers, producers: source.producers }),
      ...(title === undefined ? {} : { newTitle: title }),
      ...(trackNumber === undefined ? {} : { newTrackNumber: trackNumber, trackNumber: source.trackNumber ?? '' }),
    }

    return {
      destinationExists: exists,
      destinationPath: source.destinationPath,
      hasChanges: changed,
      row,
      sourcePath: source.sourcePath,
      tagFix,
    }
  }))
}
