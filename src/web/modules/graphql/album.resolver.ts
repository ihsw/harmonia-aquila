import { Inject, UseFilters } from '@nestjs/common'
import { Args, Mutation, Query, Resolver } from '@nestjs/graphql'

import { fixAlbumTags, type FixTagsJsonOutput } from '../../../lib/albums/fix-tags.js'
import { organizeAlbumFiles, type OrganizeFilesJsonOutput } from '../../../lib/albums/organize-files.js'
import { summarizeAlbumSourceDir, type SummarizeSourceDirJsonOutput } from '../../../lib/albums/summarize-source-dir.js'
import { validateAlbumSourceDir, type ValidateAlbumSourceDirJsonOutput } from '../../../lib/albums/validate.js'
import { WebPathResolver } from '../../providers/path-resolver.js'

import {
  AlbumFixTagsInput,
  AlbumOrganizeFilesInput,
  AlbumSummaryInput,
  AlbumValidationInput,
} from './album.inputs.js'
import {
  AlbumFixTagsRow,
  AlbumOrganizeFilesRow,
  AlbumSummaryRow,
  AlbumValidationRow,
} from './album.rows.js'
import { GraphqlErrorFilter } from './graphql-error.filter.js'

function optionalEntry<T>(key: string, value: T | undefined): Record<string, T> {
  return value === undefined ? {} : { [key]: value }
}

@Resolver()
@UseFilters(GraphqlErrorFilter)
export class AlbumResolver {
  public constructor(@Inject(WebPathResolver) private readonly pathResolver: WebPathResolver) {}

  @Query(() => [AlbumSummaryRow])
  public async albumSummarizeSourceDir(
    @Args('input', { type: () => AlbumSummaryInput }) input: AlbumSummaryInput,
  ): Promise<SummarizeSourceDirJsonOutput> {
    return summarizeAlbumSourceDir({
      dirName: await this.pathResolver.resolveSource(input.dirName, 'dirName'),
      ...optionalEntry('ignoreNonAudioFiles', input.ignoreNonAudioFiles),
      ...optionalEntry('limit', input.limit),
    })
  }

  @Query(() => [AlbumValidationRow])
  public async albumValidateSourceDir(
    @Args('input', { type: () => AlbumValidationInput }) input: AlbumValidationInput,
  ): Promise<ValidateAlbumSourceDirJsonOutput> {
    return validateAlbumSourceDir({
      dirName: await this.pathResolver.resolveSource(input.dirName, 'dirName'),
      ...optionalEntry('artistFilenameStrategy', input.artistFilenameStrategy),
      ...optionalEntry('ignoreNonAudioFiles', input.ignoreNonAudioFiles),
      ...optionalEntry('limit', input.limit),
      ...optionalEntry('titleFilenameStrategy', input.titleFilenameStrategy),
    })
  }

  @Mutation(() => [AlbumFixTagsRow])
  public async albumFixTags(
    @Args('input', { type: () => AlbumFixTagsInput }) input: AlbumFixTagsInput,
  ): Promise<FixTagsJsonOutput> {
    return fixAlbumTags({
      destDir: this.pathResolver.destDir,
      sourceDir: this.pathResolver.sourceDir,
      ...optionalEntry('albumArtistsStrategy', input.albumArtistsStrategy),
      ...optionalEntry('albumStrategy', input.albumStrategy),
      ...optionalEntry('destinationStrategy', input.destinationStrategy),
      ...optionalEntry('execute', input.execute),
      ...optionalEntry('limit', input.limit),
      ...optionalEntry('producerStrategy', input.producerStrategy),
      ...optionalEntry('resetTrack', input.resetTrack),
      ...optionalEntry('setAlbum', input.setAlbum),
      ...optionalEntry('setAlbumArtist', input.setAlbumArtist),
      ...optionalEntry('setArtist', input.setArtist),
      ...optionalEntry('setMetadata', input.setMetadata),
      ...optionalEntry('swapArtistAlbumartist', input.swapArtistAlbumartist),
    })
  }

  @Mutation(() => [AlbumOrganizeFilesRow])
  public async albumOrganizeFiles(
    @Args('input', { type: () => AlbumOrganizeFilesInput }) input: AlbumOrganizeFilesInput,
  ): Promise<OrganizeFilesJsonOutput> {
    return organizeAlbumFiles({
      destDir: this.pathResolver.destDir,
      sourceDir: this.pathResolver.sourceDir,
      ...optionalEntry('artistFilenameStrategy', input.artistFilenameStrategy),
      ...optionalEntry('execute', input.execute),
      ...optionalEntry('ignoreAudioFilesWithoutTracks', input.ignoreAudioFilesWithoutTracks),
      ...optionalEntry('ignoreNonAudioFiles', input.ignoreNonAudioFiles),
      ...optionalEntry('limit', input.limit),
      ...optionalEntry('titleFilenameStrategy', input.titleFilenameStrategy),
    })
  }
}
