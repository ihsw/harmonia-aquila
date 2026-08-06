/* eslint-disable max-classes-per-file -- GraphQL input declarations form one API contract. */
import { Field, InputType, Int } from '@nestjs/graphql'

@InputType()
export class AlbumListInput {
  @Field(() => String, { nullable: true })
  public prefix?: string
}

@InputType()
export class AlbumSummaryInput {
  @Field(() => String)
  public dirName!: string

  @Field(() => Boolean, { nullable: true })
  public ignoreNonAudioFiles?: boolean

  @Field(() => String, { nullable: true })
  public limit?: string
}

@InputType()
export class AlbumValidationInput {
  @Field(() => String, { nullable: true })
  public artistFilenameStrategy?: string

  @Field(() => String)
  public dirName!: string

  @Field(() => Boolean, { nullable: true })
  public ignoreNonAudioFiles?: boolean

  @Field(() => String, { nullable: true })
  public limit?: string

  @Field(() => String, { nullable: true })
  public titleFilenameStrategy?: string
}

@InputType()
export class AlbumSetMetadataRecordInput {
  @Field(() => String)
  public album!: string

  @Field(() => String)
  public artist!: string

  @Field(() => Int, { nullable: true })
  public discNumber?: number

  @Field(() => Int, { nullable: true })
  public discTotal?: number

  @Field(() => String)
  public filename!: string

  @Field(() => Int, { nullable: true })
  public sourceIndex?: number

  @Field(() => String)
  public title!: string

  @Field(() => Int)
  public trackNumber!: number

  @Field(() => Int, { nullable: true })
  public year?: number
}

@InputType()
export class AlbumOrganizeFilesInput {
  @Field(() => String, { nullable: true })
  public albumArtStrategy?: string

  @Field(() => String, { nullable: true })
  public albumArtistsStrategy?: string

  @Field(() => [String], { nullable: true })
  public albumDirs?: string[]

  @Field(() => String, { nullable: true })
  public albumStrategy?: string

  @Field(() => String, { nullable: true })
  public artistFilenameStrategy?: string

  @Field(() => String, { nullable: true })
  public destinationStrategy?: string

  @Field(() => String, { nullable: true })
  public discStrategy?: string

  @Field(() => Boolean, { nullable: true })
  public execute?: boolean

  @Field(() => Boolean, { nullable: true })
  public ignoreAudioFilesWithoutTracks?: boolean

  @Field(() => Boolean, { nullable: true })
  public ignoreNonAudioFiles?: boolean

  @Field(() => String, { nullable: true })
  public limit?: string

  @Field(() => String, { nullable: true })
  public producerStrategy?: string

  @Field(() => Boolean, { nullable: true })
  public resetTrack?: boolean

  @Field(() => String, { nullable: true })
  public setAlbum?: string

  @Field(() => String, { nullable: true })
  public setAlbumArtist?: string

  @Field(() => String, { nullable: true })
  public setArtist?: string

  @Field(() => [AlbumSetMetadataRecordInput], { nullable: true })
  public setMetadata?: AlbumSetMetadataRecordInput[]

  @Field(() => Boolean, { nullable: true })
  public swapArtistAlbumartist?: boolean

  @Field(() => String, { nullable: true })
  public titleFilenameStrategy?: string
}
