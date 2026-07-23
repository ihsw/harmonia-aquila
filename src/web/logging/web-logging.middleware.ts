import { randomUUID } from 'node:crypto'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { performance } from 'node:perf_hooks'
import type { Logger } from 'pino'

const REQUEST_ID = /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/
const SAFE_PATHS = new Set([
  '/manage-albums/fix-tags',
  '/manage-albums/organize-files',
  '/manage-albums/summarize-source-dir',
  '/manage-albums/validate',
  '/manage-audiobooks/convert-file',
  '/manage-audiobooks/copy-and-rename',
  '/manage-audiobooks/crawl',
  '/manage-audiobooks/merge',
  '/manage-audiobooks/set-metadata',
  '/manage-audiobooks/validate',
  '/mcp',
])

export type WebRequest = IncomingMessage & {
  webRequestId?: string
}

export class WebLoggingMiddleware {
  public constructor(private readonly logger: Logger) {}

  public use(request: WebRequest, response: ServerResponse, next: () => void): void {
    const requestId = getRequestId(request)
    const startedAt = performance.now()

    request.webRequestId = requestId
    response.setHeader('x-request-id', requestId)
    response.once('finish', () => {
      const record = {
        durationMs: Math.round(performance.now() - startedAt),
        event: 'web.request.completed',
        method: request.method ?? 'UNKNOWN',
        path: getPath(request.url),
        requestId,
        statusCode: response.statusCode,
      }

      if (response.statusCode >= 500) {
        this.logger.error(record)
      }
      else {
        this.logger.info(record)
      }
    })
    next()
  }
}

export function getWebRequestId(request: WebRequest): string | undefined {
  return request.webRequestId
}

function getRequestId(request: IncomingMessage): string {
  const incoming = request.headers['x-request-id']

  if (typeof incoming === 'string' && REQUEST_ID.test(incoming)) {
    return incoming
  }

  return randomUUID()
}

function getPath(url: string | undefined): string {
  const requestUrl = url ?? '/'
  const queryIndex = requestUrl.indexOf('?')
  const path = queryIndex === -1 ? requestUrl : requestUrl.slice(0, queryIndex)

  return SAFE_PATHS.has(path) ? path : '/unmatched'
}
