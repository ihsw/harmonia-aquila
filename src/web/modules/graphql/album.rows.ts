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
export class AlbumFixTagsRow {
  @Field(() => String)
  public album!: string

  @Field(() => [String], { nullable: true })
  public albumartists?: string[]

  @Field(() => String)
  public artist!: string

  @Field(() => [String], { nullable: true })
  public newAlbumartists?: string[]

  @Field(() => [String], { nullable: true })
  public newArtists?: string[]

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

  @Field(() => String)
  public album!: string

  @Field(() => String)
  public artistFilename!: string

  @Field(() => String)
  public artistFilenameStrategy!: string

  @Field(() => String)
  public destination!: string

  @Field(() => String)
  public filename!: string

  @Field(() => String)
  public titleFilename!: string

  @Field(() => String)
  public titleFilenameStrategy!: string

  @Field(() => String)
  public trackNumber!: string
}
