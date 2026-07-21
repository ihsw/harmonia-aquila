import { Body, Controller, Get, Inject, Post, Query } from '@nestjs/common'

import { fixAlbumTags } from '../../lib/albums/fix-tags.js'
import { organizeAlbumFiles } from '../../lib/albums/organize-files.js'
import { summarizeAlbumSourceDir } from '../../lib/albums/summarize-source-dir.js'
import { validateAlbumSourceDir } from '../../lib/albums/validate.js'
import { throwHttpError } from '../http-errors.js'
import { WebPathResolver } from '../providers/path-resolver.js'
import {
  fixTagsBodySchema,
  optionalEntry,
  organizeFilesBodySchema,
  parseRequest,
  type QueryRecord,
  summarizeSourceDirQuerySchema,
  validateAlbumQuerySchema,
} from '../schemas/request-schemas.js'

@Controller('manage-albums')
export class ManageAlbumsController {
  public constructor(@Inject(WebPathResolver) private readonly pathResolver: WebPathResolver) {}

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

  @Post('fix-tags')
  public async fixTags(@Body() rawBody: unknown): Promise<unknown> {
    try {
      const options = parseRequest(fixTagsBodySchema, rawBody, {
        destDir: 'destDir is configured by web serve --dest-dir',
        sourceDir: 'sourceDir is configured by web serve --source-dir',
      })

      return await fixAlbumTags({
        destDir: this.pathResolver.destDir,
        sourceDir: this.pathResolver.sourceDir,
        ...optionalEntry('albumArtistsStrategy', options.albumArtistsStrategy),
        ...optionalEntry('albumStrategy', options.albumStrategy),
        ...optionalEntry('destinationStrategy', options.destinationStrategy),
        ...optionalEntry('execute', options.execute),
        ...optionalEntry('limit', options.limit),
        ...optionalEntry('producerStrategy', options.producerStrategy),
        ...optionalEntry('resetTrack', options.resetTrack),
        ...optionalEntry('setAlbum', options.setAlbum),
        ...optionalEntry('setAlbumArtist', options.setAlbumArtist),
        ...optionalEntry('setArtist', options.setArtist),
        ...optionalEntry('setMetadata', options.setMetadata),
        ...optionalEntry('swapArtistAlbumartist', options.swapArtistAlbumartist),
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
        destDir: 'destDir is configured by web serve --dest-dir',
        sourceDir: 'sourceDir is configured by web serve --source-dir',
      })

      return await organizeAlbumFiles({
        destDir: this.pathResolver.destDir,
        sourceDir: this.pathResolver.sourceDir,
        ...optionalEntry('artistFilenameStrategy', options.artistFilenameStrategy),
        ...optionalEntry('execute', options.execute),
        ...optionalEntry('ignoreAudioFilesWithoutTracks', options.ignoreAudioFilesWithoutTracks),
        ...optionalEntry('ignoreNonAudioFiles', options.ignoreNonAudioFiles),
        ...optionalEntry('limit', options.limit),
        ...optionalEntry('titleFilenameStrategy', options.titleFilenameStrategy),
      })
    }
    catch (error) {
      throwHttpError(error)
    }
  }
}
