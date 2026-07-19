import { Body, Controller, Get, Inject, Post, Query } from '@nestjs/common'

import { convertAudiobookFiles } from '../../lib/audiobooks/convert-file.js'
import { copyAndRenameAudiobook } from '../../lib/audiobooks/copy-and-rename.js'
import { crawlAudiobooks } from '../../lib/audiobooks/crawl.js'
import { mergeAudiobooks } from '../../lib/audiobooks/merge.js'
import { setAudiobookMetadata } from '../../lib/audiobooks/set-metadata.js'
import { validateAudiobook } from '../../lib/audiobooks/validate.js'
import { throwHttpError } from '../http-errors.js'
import { WebPathResolver } from '../providers/path-resolver.js'
import {
  convertFileBodySchema,
  copyAndRenameBodySchema,
  crawlAudiobooksQuerySchema,
  mergeBodySchema,
  optionalEntry,
  parseRequest,
  type QueryRecord,
  setMetadataBodySchema,
  validateAudiobookQuerySchema,
} from '../schemas/request-schemas.js'

@Controller('manage-audiobooks')
export class ManageAudiobooksController {
  public constructor(@Inject(WebPathResolver) private readonly pathResolver: WebPathResolver) {}

  @Get('validate')
  public async validate(@Query() query: QueryRecord): Promise<unknown> {
    try {
      const options = parseRequest(validateAudiobookQuerySchema, query)

      return await validateAudiobook({
        fileName: await this.pathResolver.resolveSource(options.fileName, 'fileName'),
      })
    }
    catch (error) {
      throwHttpError(error)
    }
  }

  @Get('crawl')
  public async crawl(@Query() query: QueryRecord): Promise<unknown> {
    try {
      const options = parseRequest(crawlAudiobooksQuerySchema, query)

      return await crawlAudiobooks({
        dirName: await this.pathResolver.resolveSource(options.dirName, 'dirName'),
      })
    }
    catch (error) {
      throwHttpError(error)
    }
  }

  @Post('copy-and-rename')
  public async copyAndRename(@Body() rawBody: unknown): Promise<unknown> {
    try {
      const options = parseRequest(copyAndRenameBodySchema, rawBody, {
        destDir: 'destDir is configured by web serve --dest-dir',
      })

      return await copyAndRenameAudiobook({
        destDir: this.pathResolver.destDir,
        fileName: await this.pathResolver.resolveSource(options.fileName, 'fileName'),
        ...optionalEntry('execute', options.execute),
      })
    }
    catch (error) {
      throwHttpError(error)
    }
  }

  @Post('convert-file')
  public async convertFile(@Body() rawBody: unknown): Promise<unknown> {
    try {
      const options = parseRequest(convertFileBodySchema, rawBody, {
        destDir: 'destDir is configured by web serve --dest-dir',
      })

      return await convertAudiobookFiles({
        ...optionalEntry('author', options.author),
        concurrency: options.concurrency ?? '4',
        destDir: this.pathResolver.destDir,
        ...optionalEntry('execute', options.execute),
        fileName: await Promise.all(
          options.fileName.map(fileName => this.pathResolver.resolveSource(fileName, 'fileName')),
        ),
        jobs: options.jobs ?? '16',
        ...optionalEntry('narrator', options.narrator),
        ...optionalEntry('title', options.title),
      })
    }
    catch (error) {
      throwHttpError(error)
    }
  }

  @Post('merge')
  public async merge(@Body() rawBody: unknown): Promise<unknown> {
    try {
      const options = parseRequest(mergeBodySchema, rawBody, {
        destDir: 'destDir is configured by web serve --dest-dir',
        sourceDir: 'sourceDir is configured by web serve --source-dir',
      })

      return await mergeAudiobooks({
        destDir: this.pathResolver.destDir,
        ...optionalEntry('bypassMetadata', options.bypassMetadata),
        ...optionalEntry('execute', options.execute),
        jobs: options.jobs ?? '16',
        sourceDir: this.pathResolver.sourceDir,
      })
    }
    catch (error) {
      throwHttpError(error)
    }
  }

  @Post('set-metadata')
  public async setMetadata(@Body() rawBody: unknown): Promise<unknown> {
    try {
      const options = parseRequest(setMetadataBodySchema, rawBody)

      return await setAudiobookMetadata({
        author: options.author,
        destFilepath: await this.pathResolver.resolveDest(options.destFilepath, 'destFilepath'),
        ...optionalEntry('execute', options.execute),
        ...optionalEntry('narrator', options.narrator),
        sourceFilepath: await this.pathResolver.resolveSource(options.sourceFilepath, 'sourceFilepath'),
        title: options.title,
      })
    }
    catch (error) {
      throwHttpError(error)
    }
  }
}
