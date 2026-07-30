import type { AudioTagFix } from './audio-tags.js'

export interface FixTagsJsonOutputRow {
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
  producers?: string[]
  trackNumber?: number | string
}

export type FixTagsJsonOutput = FixTagsJsonOutputRow[]

export interface FixTagsOptions {
  albumArtistsStrategy?: string
  albumStrategy?: string
  destDir: string
  destinationStrategy?: string
  discStrategy?: string
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

export type DestinationStrategy = 'error' | 'ignore' | 'overwrite'
export type AlbumArtistsStrategy = 'aggregate' | 'blank' | 'no change'
export type AlbumStrategy = 'grouping' | 'no change' | 'originalalbum'
export type DiscStrategy = 'infer' | 'no change'
export type ProducerStrategy = 'aggregate' | 'blank' | 'copy-from-album-artists' | 'no change'

export interface ParsedTagFixSource {
  album: string
  albumArtists: string[]
  artist: string
  artists: string[]
  destinationPath: string
  discNumber: number | null
  discTotal: number | null
  filename: string
  grouping: string
  originalAlbum: string
  producers: string[]
  sourcePath: string
  title: string
  trackNumber: number | null
}

export interface PlannedTagFix {
  destinationExists: boolean
  destinationPath: string
  hasChanges: boolean
  row: FixTagsJsonOutputRow
  sourcePath: string
  tagFix: AudioTagFix
}

export interface NormalizedFixTagsOptions {
  albumArtistsStrategy: AlbumArtistsStrategy
  albumStrategy: AlbumStrategy
  destinationStrategy: DestinationStrategy
  discStrategy: DiscStrategy
  execute: boolean
  producerStrategy: ProducerStrategy
  resetTrack: boolean
  setAlbum: string | undefined
  setAlbumArtist: string | undefined
  setArtist: string | undefined
  setMetadata: string | undefined
  swapArtistAlbumartist: boolean
}
