import { Body, Controller, Get, Inject, Post, Query } from '@nestjs/common'

import { fixAlbumTags } from '../lib/albums/fix-tags.js'
import { organizeAlbumFiles } from '../lib/albums/organize-files.js'
import { summarizeAlbumSourceDir } from '../lib/albums/summarize-source-dir.js'

import { throwHttpError } from './http-errors.js'
import { WebPathResolver } from './path-resolver.js'
import { bodyRecord, optionalBoolean, optionalEntry, optionalString, type QueryRecord, rejectPresent, requiredString } from './request-options.js'

@Controller('manage-albums')
export class ManageAlbumsController {
  public constructor(@Inject(WebPathResolver) private readonly pathResolver: WebPathResolver) {}

  @Get('summarize-source-dir')
  public async summarizeSourceDir(@Query() query: QueryRecord): Promise<unknown> {
    try {
      return await summarizeAlbumSourceDir({
        dirName: await this.pathResolver.resolveSource(requiredString(query, 'dirName'), 'dirName'),
        ...optionalEntry('ignoreNonAudioFiles', optionalBoolean(query.ignoreNonAudioFiles)),
        ...optionalEntry('limit', optionalString(query, 'limit')),
      })
    }
    catch (error) {
      throwHttpError(error)
    }
  }

  @Post('fix-tags')
  public async fixTags(@Body() rawBody: unknown): Promise<unknown> {
    try {
      const body = bodyRecord(rawBody)
      rejectPresent(body, 'destDir', 'destDir is configured by web serve --dest-dir')
      rejectPresent(body, 'sourceDir', 'sourceDir is configured by web serve --source-dir')

      return await fixAlbumTags({
        destDir: this.pathResolver.destDir,
        sourceDir: this.pathResolver.sourceDir,
        ...optionalEntry('albumArtistsStrategy', optionalString(body, 'albumArtistsStrategy')),
        ...optionalEntry('albumStrategy', optionalString(body, 'albumStrategy')),
        ...optionalEntry('destinationStrategy', optionalString(body, 'destinationStrategy')),
        ...optionalEntry('execute', optionalBoolean(body.execute)),
        ...optionalEntry('limit', optionalString(body, 'limit')),
        ...optionalEntry('producerStrategy', optionalString(body, 'producerStrategy')),
        ...optionalEntry('resetTrack', optionalBoolean(body.resetTrack)),
        ...optionalEntry('setAlbum', optionalString(body, 'setAlbum')),
        ...optionalEntry('setAlbumArtist', optionalString(body, 'setAlbumArtist')),
        ...optionalEntry('setArtist', optionalString(body, 'setArtist')),
        ...optionalEntry('setMetadata', optionalString(body, 'setMetadata')),
        ...optionalEntry('swapArtistAlbumartist', optionalBoolean(body.swapArtistAlbumartist)),
      })
    }
    catch (error) {
      throwHttpError(error)
    }
  }

  @Post('organize-files')
  public async organizeFiles(@Body() rawBody: unknown): Promise<unknown> {
    try {
      const body = bodyRecord(rawBody)
      rejectPresent(body, 'destDir', 'destDir is configured by web serve --dest-dir')
      rejectPresent(body, 'sourceDir', 'sourceDir is configured by web serve --source-dir')

      return await organizeAlbumFiles({
        destDir: this.pathResolver.destDir,
        sourceDir: this.pathResolver.sourceDir,
        ...optionalEntry('artistFilenameStrategy', optionalString(body, 'artistFilenameStrategy')),
        ...optionalEntry('execute', optionalBoolean(body.execute)),
        ...optionalEntry('ignoreAudioFilesWithoutTracks', optionalBoolean(body.ignoreAudioFilesWithoutTracks)),
        ...optionalEntry('ignoreNonAudioFiles', optionalBoolean(body.ignoreNonAudioFiles)),
        ...optionalEntry('limit', optionalString(body, 'limit')),
        ...optionalEntry('titleFilenameStrategy', optionalString(body, 'titleFilenameStrategy')),
      })
    }
    catch (error) {
      throwHttpError(error)
    }
  }
}
