import type { SetMetadataRecord } from '../../commands/manage-albums/helpers/set-metadata.js'

import type { AudioTagFix } from './audio-tags.js'

export interface MetadataFixJsonOutputRow {
  album: string
  artist: string
  title: string
  albumartists?: string[]
  discNumber?: number | null
  discTotal?: number | null
  newAlbum?: string
  newAlbumartists?: string[]
  newArtists?: string[]
  newDiscNumber?: number
  newDiscTotal?: number
  newProducers?: string[]
  newTitle?: string
  newTrackNumber?: number
  newYear?: number
  producers?: string[]
  trackNumber?: number | string
  year?: number | null
}

export interface MetadataFixOptions {
  albumArtistsStrategy?: string
  albumStrategy?: string
  destinationStrategy?: string
  discStrategy?: string
  producerStrategy?: string
  resetTrack?: boolean
  setAlbum?: string
  setAlbumArtist?: string
  setArtist?: string
  setMetadata?: string
  setMetadataRecords?: SetMetadataRecord[]
  swapArtistAlbumartist?: boolean
}

export type DestinationStrategy = 'error' | 'ignore' | 'overwrite'
export type AlbumArtistsStrategy = 'aggregate' | 'blank' | 'no change'
export type AlbumStrategy = 'grouping' | 'no change' | 'originalalbum'
export type AlbumArtStrategy = 'first' | 'last' | 'neither'
export type DiscStrategy = 'concatenate' | 'infer' | 'no change'
export type ProducerStrategy = 'aggregate' | 'blank' | 'copy-from-album-artists' | 'no change'

export interface ParsedAlbumSource {
  album: string
  albumArtists: string[]
  artist: string
  artists: string[]
  discNumber: number | null
  discTotal: number | null
  filename: string
  grouping: string
  labels: string[]
  originalAlbum: string
  producers: string[]
  sourceDirectory?: string
  sourcePath: string
  subtitle: string
  title: string
  trackNumber: number | null
  year: number | null
}

export interface EffectiveAlbumMetadata {
  album: string
  albumArtist: string
  artist: string
  discNumber: number | null
  discTotal: number | null
  producers: string[]
  title: string
  trackNumber: number | null
  year: number | null
}

export interface PlannedMetadataFix {
  effective: EffectiveAlbumMetadata
  row: MetadataFixJsonOutputRow
  source: ParsedAlbumSource
  tagFix: AudioTagFix
}

export interface NormalizedMetadataFixOptions {
  albumArtistsStrategy: AlbumArtistsStrategy
  albumStrategy: AlbumStrategy
  destinationStrategy: DestinationStrategy
  discStrategy: DiscStrategy
  producerStrategy: ProducerStrategy
  resetTrack: boolean
  setAlbum: string | undefined
  setAlbumArtist: string | undefined
  setArtist: string | undefined
  setMetadata: string | undefined
  setMetadataRecords: SetMetadataRecord[] | undefined
  swapArtistAlbumartist: boolean
}
