import type { AudioTagFix } from './audio-tags.js'
import type {
  DestinationStrategy,
  MetadataFixJsonOutputRow,
  MetadataFixOptions,
} from './metadata-fix-types.js'
import type {
  ArtistFilenameStrategy,
  TitleFilenameStrategy,
} from './organization-plan.js'

export type OrganizationAction
  = 'copied'
    | 'ignored'
    | 'overwritten'
    | 'would copy'
    | 'would ignore'
    | 'would overwrite'

export interface OrganizeFilesSharedJsonOutputRow {
  action: OrganizationAction
  destination: string
  fileType: 'albumArt' | 'audio'
  filename: string
}

export interface OrganizeFilesAudioJsonOutputRow extends OrganizeFilesSharedJsonOutputRow {
  album: string
  artistFilename: string
  artistFilenameStrategy: ArtistFilenameStrategy
  discNumber: string
  discTotal: string
  fileType: 'audio'
  tagChanges: MetadataFixJsonOutputRow
  titleFilename: string
  titleFilenameStrategy: TitleFilenameStrategy
  trackNumber: string
}

export interface OrganizeFilesAlbumArtJsonOutputRow extends OrganizeFilesSharedJsonOutputRow {
  fileType: 'albumArt'
}

export interface OrganizeFilesOptions extends MetadataFixOptions {
  artistFilenameStrategy?: string
  destDir: string
  execute?: boolean
  ignoreAudioFilesWithoutTracks?: boolean
  ignoreNonAudioFiles?: boolean
  limit?: string
  sourceDir: string
  titleFilenameStrategy?: string
}

export type OrganizeFilesJsonOutputRow = OrganizeFilesAlbumArtJsonOutputRow | OrganizeFilesAudioJsonOutputRow
export type OrganizeFilesJsonOutput = OrganizeFilesJsonOutputRow[]

export interface PlannedOrganizationCopy {
  albumDestinationPath: string
  destinationExists: boolean
  destinationPath: string
  destinationStrategy: DestinationStrategy
  row: OrganizeFilesJsonOutputRow
  sourcePath: string
  tagFix?: AudioTagFix
}
