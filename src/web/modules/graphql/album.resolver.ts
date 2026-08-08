import { Inject, UseFilters } from '@nestjs/common'
import { Args, Mutation, Query, Resolver } from '@nestjs/graphql'

import { listAlbumSourceDir, type ListAlbumSourceDirJsonOutput } from '../../../lib/albums/list.js'
import { organizeAlbumFiles, type OrganizeFilesJsonOutput } from '../../../lib/albums/organize-files.js'
import { summarizeAlbumSourceDir, type SummarizeSourceDirJsonOutput } from '../../../lib/albums/summarize-source-dir.js'
import { validateAlbumSourceDir, type ValidateAlbumSourceDirJsonOutput } from '../../../lib/albums/validate.js'
import { WebPathResolver } from '../../providers/path-resolver.js'

import {
  AlbumListInput,
  AlbumOrganizeFilesInput,
  AlbumSummaryInput,
  AlbumValidationInput,
} from './album.inputs.js'
import {
  AlbumOrganizeFilesRow,
  AlbumSummaryRow,
  AlbumValidationRow,
} from './album.rows.js'
import { GraphqlErrorFilter } from './graphql-error.filter.js'

function optionalEntry<T>(key: string, value: T | undefined): Record<string, T> {
  return value === undefined ? {} : { [key]: value }
}

async function resolveOrganizeSourceOptions(
  pathResolver: WebPathResolver,
  albumDirs: string[] | undefined,
): Promise<{ sourceDir: string } | { sourceDirs: string[] }> {
  if (albumDirs === undefined) {
    return { sourceDir: pathResolver.sourceDir }
  }
  return {
    sourceDirs: await Promise.all(albumDirs.map((albumDir, index) => pathResolver.resolveSource(albumDir, `albumDirs[${String(index)}]`))),
  }
}

@Resolver()
@UseFilters(GraphqlErrorFilter)
export class AlbumResolver {
  public constructor(@Inject(WebPathResolver) private readonly pathResolver: WebPathResolver) {}

  @Query(() => [String])
  public async albumList(
    @Args('input', { type: () => AlbumListInput }) input: AlbumListInput,
  ): Promise<ListAlbumSourceDirJsonOutput> {
    return listAlbumSourceDir({
      sourceDir: this.pathResolver.sourceDir,
      ...optionalEntry('prefix', input.prefix),
    })
  }

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

  @Mutation(() => [AlbumOrganizeFilesRow])
  public async albumOrganizeFiles(
    @Args('input', { type: () => AlbumOrganizeFilesInput }) input: AlbumOrganizeFilesInput,
  ): Promise<OrganizeFilesJsonOutput> {
    return organizeAlbumFiles({
      destDir: this.pathResolver.destDir,
      ...(await resolveOrganizeSourceOptions(this.pathResolver, input.albumDirs)),
      ...optionalEntry('albumArtStrategy', input.albumArtStrategy),
      ...optionalEntry('albumArtistsStrategy', input.albumArtistsStrategy),
      ...optionalEntry('albumStrategy', input.albumStrategy),
      ...optionalEntry('allowMultipleAlbums', input.allowMultipleAlbums),
      ...optionalEntry('artistFilenameStrategy', input.artistFilenameStrategy),
      ...optionalEntry('destinationStrategy', input.destinationStrategy),
      ...optionalEntry('discStrategy', input.discStrategy),
      ...optionalEntry('execute', input.execute),
      ...optionalEntry('ignoreAudioFilesWithoutTracks', input.ignoreAudioFilesWithoutTracks),
      ...optionalEntry('ignoreNonAudioFiles', input.ignoreNonAudioFiles),
      ...optionalEntry('limit', input.limit),
      ...optionalEntry('producerStrategy', input.producerStrategy),
      ...optionalEntry('resetTrack', input.resetTrack),
      ...optionalEntry('setAlbum', input.setAlbum),
      ...optionalEntry('setAlbumArtist', input.setAlbumArtist),
      ...optionalEntry('setArtist', input.setArtist),
      ...optionalEntry('setMetadataRecords', input.setMetadata),
      ...optionalEntry('swapArtistAlbumartist', input.swapArtistAlbumartist),
      ...optionalEntry('titleFilenameStrategy', input.titleFilenameStrategy),
    })
  }
}
