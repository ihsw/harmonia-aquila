/* eslint-disable max-classes-per-file -- GraphQL result declarations form one API contract. */
import { Field, Int, ObjectType } from '@nestjs/graphql'

@ObjectType()
export class AlbumSummaryRow {
  @Field(() => String)
  public album!: string

  @Field(() => String)
  public albumartist!: string

  @Field(() => String)
  public artist!: string

  @Field(() => String)
  public bitrate!: string

  @Field(() => String)
  public discNumber!: string

  @Field(() => String)
  public discTotal!: string

  @Field(() => String)
  public duration!: string

  @Field(() => String)
  public filename!: string

  @Field(() => String)
  public grouping!: string

  @Field(() => String)
  public label!: string

  @Field(() => String)
  public originalalbum!: string

  @Field(() => String)
  public publisher!: string

  @Field(() => String)
  public sampleRate!: string

  @Field(() => String)
  public subtitle!: string

  @Field(() => String)
  public title!: string

  @Field(() => String)
  public year!: string
}

@ObjectType()
export class AlbumValidationRow {
  @Field(() => String)
  public album!: string

  @Field(() => String)
  public artistFilename!: string

  @Field(() => String)
  public artistFilenameStrategy!: string

  @Field(() => String)
  public destination!: string

  @Field(() => String)
  public discNumber!: string

  @Field(() => String)
  public discTotal!: string

  @Field(() => String)
  public filename!: string

  @Field(() => [String])
  public issues!: string[]

  @Field(() => String)
  public status!: string

  @Field(() => String)
  public titleFilename!: string

  @Field(() => String)
  public titleFilenameStrategy!: string

  @Field(() => String)
  public trackNumber!: string
}

@ObjectType()
export class AlbumMetadataChangesRow {
  @Field(() => String)
  public album!: string

  @Field(() => [String], { nullable: true })
  public albumartists?: string[]

  @Field(() => String)
  public artist!: string

  @Field(() => Int, { nullable: true })
  public discNumber?: number

  @Field(() => Int, { nullable: true })
  public discTotal?: number

  @Field(() => [String], { nullable: true })
  public newAlbumartists?: string[]

  @Field(() => [String], { nullable: true })
  public newArtists?: string[]

  @Field(() => Int, { nullable: true })
  public newDiscNumber?: number

  @Field(() => Int, { nullable: true })
  public newDiscTotal?: number

  @Field(() => String, { nullable: true })
  public newAlbum?: string

  @Field(() => [String], { nullable: true })
  public newProducers?: string[]

  @Field(() => String, { nullable: true })
  public newTitle?: string

  @Field(() => Int, { nullable: true })
  public newTrackNumber?: number

  @Field(() => [String], { nullable: true })
  public producers?: string[]

  @Field(() => String)
  public title!: string

  @Field(() => String, { nullable: true })
  public trackNumber?: string
}

@ObjectType()
export class AlbumOrganizeFilesRow {
  @Field(() => String)
  public action!: string

  @Field(() => String, { nullable: true })
  public album?: string

  @Field(() => String, { nullable: true })
  public artistFilename?: string

  @Field(() => String, { nullable: true })
  public artistFilenameStrategy?: string

  @Field(() => String)
  public destination!: string

  @Field(() => String, { nullable: true })
  public discNumber?: string

  @Field(() => String, { nullable: true })
  public discTotal?: string

  @Field(() => String)
  public fileType!: string

  @Field(() => String)
  public filename!: string

  @Field(() => AlbumMetadataChangesRow, { nullable: true })
  public tagChanges?: AlbumMetadataChangesRow

  @Field(() => String, { nullable: true })
  public titleFilename?: string

  @Field(() => String, { nullable: true })
  public titleFilenameStrategy?: string

  @Field(() => String, { nullable: true })
  public trackNumber?: string
}
