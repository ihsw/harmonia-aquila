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
    | 'excluded'
    | 'ignored'
    | 'overwritten'
    | 'would copy'
    | 'would exclude'
    | 'would ignore'
    | 'would overwrite'

export interface OrganizeFilesSharedJsonOutputRow {
  action: OrganizationAction
  destination: string
  fileType: 'albumArt' | 'audio'
  filename: string
  sourceDirectory?: string
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

export type OrganizeFilesSourceOptions
  = | { sourceDir: string, sourceDirs?: never }
    | { sourceDir?: never, sourceDirs: readonly string[] }

export type OrganizeFilesOptions = MetadataFixOptions & OrganizeFilesSourceOptions & {
  albumArtStrategy?: string
  artistFilenameStrategy?: string
  destDir: string
  execute?: boolean
  ignoreAudioFilesWithoutTracks?: boolean
  ignoreNonAudioFiles?: boolean
  limit?: string
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
