import { Body, Controller, Get, Post, Query } from '@nestjs/common'

import { convertAudiobookFiles } from '../lib/audiobooks/convert-file.js'
import { copyAndRenameAudiobook } from '../lib/audiobooks/copy-and-rename.js'
import { crawlAudiobooks } from '../lib/audiobooks/crawl.js'
import { mergeAudiobooks } from '../lib/audiobooks/merge.js'
import { setAudiobookMetadata } from '../lib/audiobooks/set-metadata.js'
import { validateAudiobook } from '../lib/audiobooks/validate.js'

import { throwHttpError } from './http-errors.js'
import { bodyRecord, optionalBoolean, optionalEntry, optionalString, type QueryRecord, requiredString, stringArray } from './request-options.js'

@Controller('manage-audiobooks')
export class ManageAudiobooksController {
  @Get('validate')
  public async validate(@Query() query: QueryRecord): Promise<unknown> {
    try {
      return await validateAudiobook({ fileName: requiredString(query, 'fileName') })
    }
    catch (error) {
      throwHttpError(error)
    }
  }

  @Get('crawl')
  public async crawl(@Query() query: QueryRecord): Promise<unknown> {
    try {
      return await crawlAudiobooks({ dirName: requiredString(query, 'dirName') })
    }
    catch (error) {
      throwHttpError(error)
    }
  }

  @Post('copy-and-rename')
  public async copyAndRename(@Body() rawBody: unknown): Promise<unknown> {
    try {
      const body = bodyRecord(rawBody)

      return await copyAndRenameAudiobook({
        destDir: requiredString(body, 'destDir'),
        fileName: requiredString(body, 'fileName'),
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

      return await convertAudiobookFiles({
        concurrency: optionalString(body, 'concurrency') ?? '4',
        destDir: requiredString(body, 'destDir'),
        fileName: stringArray(body, 'fileName'),
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

      return await mergeAudiobooks({
        destDir: requiredString(body, 'destDir'),
        jobs: optionalString(body, 'jobs') ?? '16',
        sourceDir: requiredString(body, 'sourceDir'),
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
        destFilepath: requiredString(body, 'destFilepath'),
        sourceFilepath: requiredString(body, 'sourceFilepath'),
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
