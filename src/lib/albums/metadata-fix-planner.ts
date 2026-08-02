import type { SetMetadataRecord } from '../../commands/manage-albums/helpers/set-metadata.js'
import { UserInputError } from '../errors.js'

import { inferDiscSet } from './disc-metadata.js'
import type {
  EffectiveAlbumMetadata,
  NormalizedMetadataFixOptions,
  ParsedAlbumSource,
  PlannedMetadataFix,
} from './metadata-fix-types.js'
import { formatMetadataValues } from './organization-plan.js'
function uniqueSorted(values: string[]): string[] {
  return [...new Set(values)].sort((left, right) => left.localeCompare(right))
}

function collectByGrouping(
  sources: ParsedAlbumSource[],
  select: (source: ParsedAlbumSource) => string[],
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
function effectiveAlbum(source: ParsedAlbumSource, options: NormalizedMetadataFixOptions): string {
  if (options.setAlbum !== undefined) {
    return options.setAlbum
  }
  if (options.albumStrategy === 'grouping') {
    return source.grouping
  }
  return options.albumStrategy === 'originalalbum' ? source.originalAlbum : source.album
}

function resetTrackNumbers(
  sources: ParsedAlbumSource[],
  options: NormalizedMetadataFixOptions,
): Map<string, number> {
  const result = new Map<string, number>()
  const sourcesByAlbum = new Map<string, ParsedAlbumSource[]>()
  if (!options.resetTrack) {
    return result
  }
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
  sources: ParsedAlbumSource[],
  records: Map<string, SetMetadataRecord> | undefined,
  options: NormalizedMetadataFixOptions,
): Map<string, { discNumber: number, discTotal: number }> {
  const explicit = [...(records?.values() ?? [])]
    .filter(record => record.discNumber !== undefined || record.discTotal !== undefined)
  if (options.discStrategy === 'infer' && explicit.length > 0) {
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
function projectMetadata(source: ParsedAlbumSource, tagFix: PlannedMetadataFix['tagFix']): EffectiveAlbumMetadata {
  return {
    album: tagFix.album ?? source.album,
    albumArtist: tagFix.albumArtists === undefined
      ? formatMetadataValues(source.albumArtists)
      : formatMetadataValues(tagFix.albumArtists),
    artist: tagFix.artists === undefined
      ? source.artist
      : formatMetadataValues(tagFix.artists),
    discNumber: tagFix.discNumber ?? source.discNumber,
    discTotal: tagFix.discTotal ?? source.discTotal,
    producers: tagFix.producers ?? source.producers,
    title: tagFix.title ?? source.title,
    trackNumber: tagFix.trackNumber ?? source.trackNumber,
  }
}

export function planMetadataFixes(
  sources: ParsedAlbumSource[],
  records: Map<string, SetMetadataRecord> | undefined,
  options: NormalizedMetadataFixOptions,
): PlannedMetadataFix[] {
  const artistsByGrouping = collectByGrouping(sources, source => source.artists)
  const producersByGrouping = collectByGrouping(sources, source => source.producers)
  const tracksByPath = resetTrackNumbers(sources, options)
  const discsByFilename = getDiscChanges(sources, records, options)
  return sources.map(source => planSource(
    source,
    records?.get(source.filename),
    options,
    artistsByGrouping,
    producersByGrouping,
    tracksByPath,
    discsByFilename,
  ))
}

function planSource(
  source: ParsedAlbumSource,
  record: SetMetadataRecord | undefined,
  options: NormalizedMetadataFixOptions,
  artistsByGrouping: Map<string, string[]>,
  producersByGrouping: Map<string, string[]>,
  tracksByPath: Map<string, number>,
  discsByFilename: Map<string, { discNumber: number, discTotal: number }>,
): PlannedMetadataFix {
  const album = record?.album ?? (options.setAlbum !== undefined || options.albumStrategy !== 'no change'
    ? effectiveAlbum(source, options)
    : undefined)
  const albumArtists = getAlbumArtists(source, options, artistsByGrouping)
  const artists = record === undefined ? getArtists(source, options) : [record.artist]
  const producers = getProducers(source, options, producersByGrouping)
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
  return {
    effective: projectMetadata(source, tagFix),
    row: {
      album: source.album,
      artist: source.artist,
      title: source.title,
      ...(album === undefined ? {} : { newAlbum: album }),
      ...(albumArtists === undefined ? {} : { albumartists: source.albumArtists, newAlbumartists: albumArtists }),
      ...(artists === undefined ? {} : { newArtists: artists }),
      ...(disc === undefined
        ? {}
        : { discNumber: source.discNumber, discTotal: source.discTotal,
            newDiscNumber: disc.discNumber, newDiscTotal: disc.discTotal }),
      ...(producers === undefined ? {} : { newProducers: producers, producers: source.producers }),
      ...(title === undefined ? {} : { newTitle: title }),
      ...(trackNumber === undefined ? {} : { newTrackNumber: trackNumber, trackNumber: source.trackNumber ?? '' }),
    },
    source,
    tagFix,
  }
}
function getAlbumArtists(source: ParsedAlbumSource, options: NormalizedMetadataFixOptions,
  grouped: Map<string, string[]>): string[] | undefined {
  if (options.setAlbumArtist !== undefined) return [options.setAlbumArtist]
  if (options.swapArtistAlbumartist) return source.artists
  if (options.albumArtistsStrategy === 'aggregate') return grouped.get(source.grouping) ?? []
  return options.albumArtistsStrategy === 'blank' ? [] : undefined
}

function getArtists(source: ParsedAlbumSource, options: NormalizedMetadataFixOptions): string[] | undefined {
  if (options.setArtist !== undefined) return [options.setArtist]
  return options.swapArtistAlbumartist ? source.albumArtists : undefined
}

function getProducers(source: ParsedAlbumSource, options: NormalizedMetadataFixOptions,
  grouped: Map<string, string[]>): string[] | undefined {
  if (options.producerStrategy === 'aggregate') return grouped.get(source.grouping) ?? []
  if (options.producerStrategy === 'copy-from-album-artists') return source.albumArtists
  return options.producerStrategy === 'blank' ? [] : undefined
}
