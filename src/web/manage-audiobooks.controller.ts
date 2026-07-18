import { Body, Controller, Get, Inject, Post, Query } from '@nestjs/common'

import { convertAudiobookFiles } from '../lib/audiobooks/convert-file.js'
import { copyAndRenameAudiobook } from '../lib/audiobooks/copy-and-rename.js'
import { crawlAudiobooks } from '../lib/audiobooks/crawl.js'
import { mergeAudiobooks } from '../lib/audiobooks/merge.js'
import { setAudiobookMetadata } from '../lib/audiobooks/set-metadata.js'
import { validateAudiobook } from '../lib/audiobooks/validate.js'

import { throwHttpError } from './http-errors.js'
import { WebPathResolver } from './path-resolver.js'
import { bodyRecord, optionalBoolean, optionalEntry, optionalString, type QueryRecord, rejectPresent, requiredString, stringArray } from './request-options.js'

@Controller('manage-audiobooks')
export class ManageAudiobooksController {
  public constructor(@Inject(WebPathResolver) private readonly pathResolver: WebPathResolver) {}

  @Get('validate')
  public async validate(@Query() query: QueryRecord): Promise<unknown> {
    try {
      return await validateAudiobook({
        fileName: await this.pathResolver.resolveSource(requiredString(query, 'fileName'), 'fileName'),
      })
    }
    catch (error) {
      throwHttpError(error)
    }
  }

  @Get('crawl')
  public async crawl(@Query() query: QueryRecord): Promise<unknown> {
    try {
      return await crawlAudiobooks({
        dirName: await this.pathResolver.resolveSource(requiredString(query, 'dirName'), 'dirName'),
      })
    }
    catch (error) {
      throwHttpError(error)
    }
  }

  @Post('copy-and-rename')
  public async copyAndRename(@Body() rawBody: unknown): Promise<unknown> {
    try {
      const body = bodyRecord(rawBody)
      rejectPresent(body, 'destDir', 'destDir is configured by web serve --dest-dir')

      return await copyAndRenameAudiobook({
        destDir: this.pathResolver.destDir,
        fileName: await this.pathResolver.resolveSource(requiredString(body, 'fileName'), 'fileName'),
        ...optionalEntry('execute', optionalBoolean(body.execute)),
      })
    }
    catch (error) {
      throwHttpError(error)
    }
  }

  @Post('convert-file')
  public async convertFile(@Body() rawBody: unknown): Promise<unknown> {
    try {
      const body = bodyRecord(rawBody)
      rejectPresent(body, 'destDir', 'destDir is configured by web serve --dest-dir')

      return await convertAudiobookFiles({
        concurrency: optionalString(body, 'concurrency') ?? '4',
        destDir: this.pathResolver.destDir,
        fileName: await Promise.all(
          stringArray(body, 'fileName').map(fileName => this.pathResolver.resolveSource(fileName, 'fileName')),
        ),
        jobs: optionalString(body, 'jobs') ?? '16',
        ...optionalEntry('author', optionalString(body, 'author')),
        ...optionalEntry('execute', optionalBoolean(body.execute)),
        ...optionalEntry('narrator', optionalString(body, 'narrator')),
        ...optionalEntry('title', optionalString(body, 'title')),
      })
    }
    catch (error) {
      throwHttpError(error)
    }
  }

  @Post('merge')
  public async merge(@Body() rawBody: unknown): Promise<unknown> {
    try {
      const body = bodyRecord(rawBody)
      rejectPresent(body, 'destDir', 'destDir is configured by web serve --dest-dir')
      rejectPresent(body, 'sourceDir', 'sourceDir is configured by web serve --source-dir')

      return await mergeAudiobooks({
        destDir: this.pathResolver.destDir,
        jobs: optionalString(body, 'jobs') ?? '16',
        sourceDir: this.pathResolver.sourceDir,
        ...optionalEntry('bypassMetadata', optionalBoolean(body.bypassMetadata)),
        ...optionalEntry('execute', optionalBoolean(body.execute)),
      })
    }
    catch (error) {
      throwHttpError(error)
    }
  }

  @Post('set-metadata')
  public async setMetadata(@Body() rawBody: unknown): Promise<unknown> {
    try {
      const body = bodyRecord(rawBody)

      return await setAudiobookMetadata({
        author: requiredString(body, 'author'),
        destFilepath: await this.pathResolver.resolveDest(requiredString(body, 'destFilepath'), 'destFilepath'),
        sourceFilepath: await this.pathResolver.resolveSource(requiredString(body, 'sourceFilepath'), 'sourceFilepath'),
        title: requiredString(body, 'title'),
        ...optionalEntry('execute', optionalBoolean(body.execute)),
        ...optionalEntry('narrator', optionalString(body, 'narrator')),
      })
    }
    catch (error) {
      throwHttpError(error)
    }
  }
}
