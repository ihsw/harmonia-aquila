/* eslint-disable max-classes-per-file -- GraphQL input declarations form one API contract. */
import { Field, InputType } from '@nestjs/graphql'

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
export class AlbumFixTagsInput {
  @Field(() => String, { nullable: true })
  public albumArtistsStrategy?: string

  @Field(() => String, { nullable: true })
  public albumStrategy?: string

  @Field(() => String, { nullable: true })
  public destinationStrategy?: string

  @Field(() => Boolean, { nullable: true })
  public execute?: boolean

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

  @Field(() => String, { nullable: true })
  public setMetadata?: string

  @Field(() => Boolean, { nullable: true })
  public swapArtistAlbumartist?: boolean
}

@InputType()
export class AlbumOrganizeFilesInput {
  @Field(() => String, { nullable: true })
  public artistFilenameStrategy?: string

  @Field(() => Boolean, { nullable: true })
  public execute?: boolean

  @Field(() => Boolean, { nullable: true })
  public ignoreAudioFilesWithoutTracks?: boolean

  @Field(() => Boolean, { nullable: true })
  public ignoreNonAudioFiles?: boolean

  @Field(() => String, { nullable: true })
  public limit?: string

  @Field(() => String, { nullable: true })
  public titleFilenameStrategy?: string
}
