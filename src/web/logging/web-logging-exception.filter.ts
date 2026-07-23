import { type ArgumentsHost, Catch, HttpException, type HttpServer } from '@nestjs/common'
import { BaseExceptionFilter } from '@nestjs/core'
import type { Logger } from 'pino'

import { getWebRequestId, type WebRequest } from './web-logging.middleware.js'

@Catch()
export class WebLoggingExceptionFilter extends BaseExceptionFilter {
  public constructor(applicationRef: HttpServer, private readonly logger: Logger) {
    super(applicationRef)
  }

  public catch(exception: unknown, host: ArgumentsHost): void {
    if (!(exception instanceof HttpException) || exception.getStatus() >= 500) {
      const request = host.switchToHttp().getRequest<WebRequest>()

      this.logger.error({
        err: toError(exception),
        event: 'web.request.failed',
        requestId: getWebRequestId(request),
      })
    }

    super.catch(exception, host)
  }
}

function toError(exception: unknown): Error {
  return exception instanceof Error ? exception : new Error('Unexpected non-error exception')
}
