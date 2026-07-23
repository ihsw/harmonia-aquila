/* eslint-disable max-classes-per-file -- GraphQL input declarations form one API contract. */
import { Field, InputType } from '@nestjs/graphql'

@InputType()
export class AudiobookValidationInput {
  @Field(() => String)
  public fileName!: string
}

@InputType()
export class AudiobookCrawlInput {
  @Field(() => String)
  public dirName!: string
}

@InputType()
export class AudiobookCopyAndRenameInput {
  @Field(() => Boolean, { nullable: true })
  public execute?: boolean

  @Field(() => String)
  public fileName!: string
}

@InputType()
export class AudiobookConvertFilesInput {
  @Field(() => String, { nullable: true })
  public author?: string

  @Field(() => String, { nullable: true })
  public concurrency?: string

  @Field(() => Boolean, { nullable: true })
  public execute?: boolean

  @Field(() => [String])
  public fileNames!: string[]

  @Field(() => String, { nullable: true })
  public jobs?: string

  @Field(() => String, { nullable: true })
  public narrator?: string

  @Field(() => String, { nullable: true })
  public title?: string
}

@InputType()
export class AudiobookMergeInput {
  @Field(() => Boolean, { nullable: true })
  public bypassMetadata?: boolean

  @Field(() => Boolean, { nullable: true })
  public execute?: boolean

  @Field(() => String, { nullable: true })
  public jobs?: string
}

@InputType()
export class AudiobookSetMetadataInput {
  @Field(() => String)
  public author!: string

  @Field(() => String)
  public destFilepath!: string

  @Field(() => Boolean, { nullable: true })
  public execute?: boolean

  @Field(() => String, { nullable: true })
  public narrator?: string

  @Field(() => String)
  public sourceFilepath!: string

  @Field(() => String)
  public title!: string
}
