import { Body, Controller, Get, Inject, Post, Query } from '@nestjs/common'

import { listAlbumSourceDir } from '../../lib/albums/list.js'
import { organizeAlbumFiles } from '../../lib/albums/organize-files.js'
import { summarizeAlbumSourceDir } from '../../lib/albums/summarize-source-dir.js'
import { validateAlbumSourceDir } from '../../lib/albums/validate.js'
import { throwHttpError } from '../http-errors.js'
import { WebPathResolver } from '../providers/path-resolver.js'
import {
  listAlbumQuerySchema,
  optionalEntry,
  organizeFilesBodySchema,
  parseRequest,
  type QueryRecord,
  summarizeSourceDirQuerySchema,
  validateAlbumQuerySchema,
} from '../schemas/request-schemas.js'

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

@Controller('manage-albums')
export class ManageAlbumsController {
  public constructor(@Inject(WebPathResolver) private readonly pathResolver: WebPathResolver) {}

  @Get('list')
  public async list(@Query() query: QueryRecord): Promise<unknown> {
    try {
      const options = parseRequest(listAlbumQuerySchema, query)

      return await listAlbumSourceDir({
        sourceDir: options.useScratchDir === true
          ? this.pathResolver.scratchDir
          : this.pathResolver.sourceDir,
        ...optionalEntry('prefix', options.prefix),
      })
    }
    catch (error) {
      throwHttpError(error)
    }
  }

  @Get('summarize-source-dir')
  public async summarizeSourceDir(@Query() query: QueryRecord): Promise<unknown> {
    try {
      const options = parseRequest(summarizeSourceDirQuerySchema, query)

      return await summarizeAlbumSourceDir({
        dirName: await this.pathResolver.resolveSource(options.dirName, 'dirName'),
        ...optionalEntry('ignoreNonAudioFiles', options.ignoreNonAudioFiles),
        ...optionalEntry('limit', options.limit),
      })
    }
    catch (error) {
      throwHttpError(error)
    }
  }

  @Get('validate')
  public async validate(@Query() query: QueryRecord): Promise<unknown> {
    try {
      const options = parseRequest(validateAlbumQuerySchema, query)

      return await validateAlbumSourceDir({
        dirName: await this.pathResolver.resolveSource(options.dirName, 'dirName'),
        ...optionalEntry('artistFilenameStrategy', options.artistFilenameStrategy),
        ...optionalEntry('ignoreNonAudioFiles', options.ignoreNonAudioFiles),
        ...optionalEntry('limit', options.limit),
        ...optionalEntry('titleFilenameStrategy', options.titleFilenameStrategy),
      })
    }
    catch (error) {
      throwHttpError(error)
    }
  }

  @Post('organize-files')
  public async organizeFiles(@Body() rawBody: unknown): Promise<unknown> {
    try {
      const options = parseRequest(organizeFilesBodySchema, rawBody, {
        destDir: 'web serve --dest-dir is reserved for audiobooks; useScratchDir selects album output',
        sourceDir: 'sourceDir is configured by web serve --source-dir',
      })

      return await organizeAlbumFiles({
        destDir: options.useScratchDir === true
          ? this.pathResolver.scratchDir
          : this.pathResolver.sourceDir,
        ...(await resolveOrganizeSourceOptions(this.pathResolver, options.albumDirs)),
        ...optionalEntry('albumArtStrategy', options.albumArtStrategy),
        ...optionalEntry('albumArtistsStrategy', options.albumArtistsStrategy),
        ...optionalEntry('albumStrategy', options.albumStrategy),
        ...optionalEntry('artistFilenameStrategy', options.artistFilenameStrategy),
        ...optionalEntry('destinationStrategy', options.destinationStrategy),
        ...optionalEntry('discStrategy', options.discStrategy),
        ...optionalEntry('execute', options.execute),
        ...optionalEntry('ignoreAudioFilesWithoutTracks', options.ignoreAudioFilesWithoutTracks),
        ...optionalEntry('ignoreNonAudioFiles', options.ignoreNonAudioFiles),
        ...optionalEntry('limit', options.limit),
        ...optionalEntry('producerStrategy', options.producerStrategy),
        ...optionalEntry('resetTrack', options.resetTrack),
        ...optionalEntry('setAlbum', options.setAlbum),
        ...optionalEntry('setAlbumArtist', options.setAlbumArtist),
        ...optionalEntry('setArtist', options.setArtist),
        ...optionalEntry('setMetadataRecords', options.setMetadata),
        ...optionalEntry('swapArtistAlbumartist', options.swapArtistAlbumartist),
        ...optionalEntry('titleFilenameStrategy', options.titleFilenameStrategy),
      })
    }
    catch (error) {
      throwHttpError(error)
    }
  }
}
