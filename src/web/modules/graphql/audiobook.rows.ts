/* eslint-disable max-classes-per-file -- GraphQL result declarations form one API contract. */
import { Field, Int, ObjectType } from '@nestjs/graphql'

@ObjectType()
export class AudiobookValidationRow {
  @Field(() => String)
  public filename!: string

  @Field(() => String)
  public performer!: string

  @Field(() => String)
  public title!: string

  @Field(() => Boolean)
  public valid!: boolean
}

@ObjectType()
export class AudiobookCrawlRow {
  @Field(() => String)
  public category!: string

  @Field(() => String)
  public expectedFilename!: string

  @Field(() => String)
  public filename!: string

  @Field(() => String)
  public path!: string

  @Field(() => String)
  public performer!: string

  @Field(() => String)
  public reason!: string

  @Field(() => String)
  public reasonCode!: string

  @Field(() => String)
  public title!: string
}

@ObjectType()
export class AudiobookCopyAndRenameRow {
  @Field(() => String)
  public action!: string

  @Field(() => String)
  public destination!: string

  @Field(() => String)
  public filename!: string

  @Field(() => String)
  public performer!: string

  @Field(() => String)
  public title!: string
}

@ObjectType()
export class AudiobookConvertFilesRow {
  @Field(() => String)
  public action!: string

  @Field(() => String)
  public destination!: string

  @Field(() => String, { nullable: true })
  public narrator?: string

  @Field(() => String)
  public performer!: string

  @Field(() => String)
  public source!: string

  @Field(() => String)
  public title!: string
}

@ObjectType()
export class AudiobookMergeRow {
  @Field(() => String)
  public action!: string

  @Field(() => String)
  public destination!: string

  @Field(() => Boolean)
  public metadataBypassed!: boolean

  @Field(() => String, { nullable: true })
  public performer?: string | null

  @Field(() => Int)
  public sourceFiles!: number

  @Field(() => String, { nullable: true })
  public title?: string | null
}

@ObjectType()
export class AudiobookSetMetadataRow {
  @Field(() => String)
  public action!: string

  @Field(() => String)
  public author!: string

  @Field(() => String)
  public destination!: string

  @Field(() => String)
  public narrator!: string

  @Field(() => String)
  public source!: string

  @Field(() => String)
  public title!: string
}
