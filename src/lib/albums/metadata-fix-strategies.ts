import type { NormalizedMetadataFixOptions, ParsedAlbumSource } from './metadata-fix-types.js'

export function getAlbumArtists(source: ParsedAlbumSource, options: NormalizedMetadataFixOptions,
  grouped: Map<string, string[]>): string[] | undefined {
  if (options.setAlbumArtist !== undefined) return [options.setAlbumArtist]
  if (options.swapArtistAlbumartist) return source.artists
  if (options.albumArtistsStrategy === 'aggregate') return grouped.get(source.grouping) ?? []
  return options.albumArtistsStrategy === 'blank' ? [] : undefined
}

export function getArtists(source: ParsedAlbumSource,
  options: NormalizedMetadataFixOptions): string[] | undefined {
  if (options.setArtist !== undefined) return [options.setArtist]
  return options.swapArtistAlbumartist ? source.albumArtists : undefined
}

export function getProducers(source: ParsedAlbumSource, options: NormalizedMetadataFixOptions,
  grouped: Map<string, string[]>): string[] | undefined {
  if (options.producerStrategy === 'aggregate') return grouped.get(source.grouping) ?? []
  if (options.producerStrategy === 'copy-from-album-artists') return source.albumArtists
  return options.producerStrategy === 'blank' ? [] : undefined
}
