import { Inject, UseFilters } from '@nestjs/common'
import { Args, Mutation, Query, Resolver } from '@nestjs/graphql'

import { convertAudiobookFiles, type ConvertFileRow } from '../../../lib/audiobooks/convert-file.js'
import { copyAndRenameAudiobook, type CopyAndRenameAudiobookJsonOutput } from '../../../lib/audiobooks/copy-and-rename.js'
import { type CrawlAudiobookJsonOutput, crawlAudiobooks } from '../../../lib/audiobooks/crawl.js'
import { type MergeAudiobookRow, mergeAudiobooks } from '../../../lib/audiobooks/merge.js'
import { setAudiobookMetadata, type SetMetadataRow } from '../../../lib/audiobooks/set-metadata.js'
import { validateAudiobook, type ValidateAudiobookJsonOutput } from '../../../lib/audiobooks/validate.js'
import { WebPathResolver } from '../../providers/path-resolver.js'

import {
  AudiobookConvertFilesInput,
  AudiobookCopyAndRenameInput,
  AudiobookCrawlInput,
  AudiobookMergeInput,
  AudiobookSetMetadataInput,
  AudiobookValidationInput,
} from './audiobook.inputs.js'
import {
  AudiobookConvertFilesRow,
  AudiobookCopyAndRenameRow,
  AudiobookCrawlRow,
  AudiobookMergeRow,
  AudiobookSetMetadataRow,
  AudiobookValidationRow,
} from './audiobook.rows.js'
import { GraphqlErrorFilter } from './graphql-error.filter.js'

function optionalEntry<T>(key: string, value: T | undefined): Record<string, T> {
  return value === undefined ? {} : { [key]: value }
}

@Resolver()
@UseFilters(GraphqlErrorFilter)
export class AudiobookResolver {
  public constructor(@Inject(WebPathResolver) private readonly pathResolver: WebPathResolver) {}

  @Query(() => [AudiobookValidationRow])
  public async audiobookValidate(
    @Args('input', { type: () => AudiobookValidationInput }) input: AudiobookValidationInput,
  ): Promise<ValidateAudiobookJsonOutput> {
    return validateAudiobook({
      fileName: await this.pathResolver.resolveSource(input.fileName, 'fileName'),
    })
  }

  @Query(() => [AudiobookCrawlRow])
  public async audiobookCrawl(
    @Args('input', { type: () => AudiobookCrawlInput }) input: AudiobookCrawlInput,
  ): Promise<CrawlAudiobookJsonOutput> {
    return crawlAudiobooks({
      dirName: await this.pathResolver.resolveSource(input.dirName, 'dirName'),
    })
  }

  @Mutation(() => [AudiobookCopyAndRenameRow])
  public async audiobookCopyAndRename(
    @Args('input', { type: () => AudiobookCopyAndRenameInput }) input: AudiobookCopyAndRenameInput,
  ): Promise<CopyAndRenameAudiobookJsonOutput> {
    return copyAndRenameAudiobook({
      destDir: this.pathResolver.destDir,
      fileName: await this.pathResolver.resolveSource(input.fileName, 'fileName'),
      ...optionalEntry('execute', input.execute),
    })
  }

  @Mutation(() => [AudiobookConvertFilesRow])
  public async audiobookConvertFiles(
    @Args('input', { type: () => AudiobookConvertFilesInput }) input: AudiobookConvertFilesInput,
  ): Promise<ConvertFileRow[]> {
    return convertAudiobookFiles({
      concurrency: input.concurrency ?? '4',
      destDir: this.pathResolver.destDir,
      fileName: await Promise.all(
        input.fileNames.map(fileName => this.pathResolver.resolveSource(fileName, 'fileNames')),
      ),
      jobs: input.jobs ?? '16',
      ...optionalEntry('author', input.author),
      ...optionalEntry('execute', input.execute),
      ...optionalEntry('narrator', input.narrator),
      ...optionalEntry('title', input.title),
    })
  }

  @Mutation(() => [AudiobookMergeRow])
  public async audiobookMerge(
    @Args('input', { type: () => AudiobookMergeInput }) input: AudiobookMergeInput,
  ): Promise<MergeAudiobookRow[]> {
    return mergeAudiobooks({
      destDir: this.pathResolver.destDir,
      jobs: input.jobs ?? '16',
      sourceDir: this.pathResolver.sourceDir,
      ...optionalEntry('bypassMetadata', input.bypassMetadata),
      ...optionalEntry('execute', input.execute),
    })
  }

  @Mutation(() => [AudiobookSetMetadataRow])
  public async audiobookSetMetadata(
    @Args('input', { type: () => AudiobookSetMetadataInput }) input: AudiobookSetMetadataInput,
  ): Promise<SetMetadataRow[]> {
    return setAudiobookMetadata({
      author: input.author,
      destFilepath: await this.pathResolver.resolveDest(input.destFilepath, 'destFilepath'),
      sourceFilepath: await this.pathResolver.resolveSource(input.sourceFilepath, 'sourceFilepath'),
      title: input.title,
      ...optionalEntry('execute', input.execute),
      ...optionalEntry('narrator', input.narrator),
    })
  }
}
