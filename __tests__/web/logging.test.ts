import { type INestApplication, InternalServerErrorException } from '@nestjs/common'
import type { Server } from 'node:http'
import type { DestinationStream, Logger } from 'pino'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { ManageAlbumsController } from '../../src/web/controllers/manage-albums.controller.js'
import { createWebLogger } from '../../src/web/logging/web-logger.js'
import { createWebApp, serveWeb } from '../../src/web/main.js'
import { createTempDir, removeTempDir } from '../test-helpers.js'

interface LogRecord {
  durationMs?: number
  err?: { type?: string }
  event?: string
  level?: number
  method?: string
  path?: string
  port?: number
  requestId?: string
  statusCode?: number
}

describe('web structured logging', () => {
  let app: INestApplication | undefined
  let destDir: string
  let logger: Logger
  let records: LogRecord[]
  let sourceDir: string

  beforeEach(async () => {
    destDir = await createTempDir('web-logging-dest-')
    sourceDir = await createTempDir('web-logging-source-')
    records = []
    logger = createWebLogger(createLogDestination(records))
    app = await createWebApp({ destDir, sourceDir }, { logger })
    await app.listen(0, '127.0.0.1')
  })

  afterEach(async () => {
    await app?.close()
    app = undefined
    await removeTempDir(destDir)
    await removeTempDir(sourceDir)
  })

  it('logs a successful request with its safe correlated request ID', async () => {
    const response = await fetch(`${baseUrl()}/manage-albums/summarize-source-dir?dirName=.&query-marker=secret`, {
      headers: { 'x-request-id': 'valid-request-id.1' },
    })
    const requestId = response.headers.get('x-request-id')
    const completion = completionFor(requestId)

    expect(response.status).toBe(200)
    expect(requestId).toBe('valid-request-id.1')
    expect(completion).toMatchObject({
      event: 'web.request.completed',
      level: 30,
      method: 'GET',
      path: '/manage-albums/summarize-source-dir',
      requestId,
      statusCode: 200,
    })
    expect(completion.durationMs).toBeTypeOf('number')
    expect(JSON.stringify(records)).not.toContain('query-marker=secret')
  })

  it('logs a 4xx completion without an unexpected-error record or client data', async () => {
    const response = await fetch(`${baseUrl()}/manage-albums/organize-files?query-marker=secret`, {
      body: JSON.stringify({ execute: 'not-a-boolean', requestBodyMarker: 'do-not-log' }),
      headers: {
        'Content-Type': 'application/json',
        'x-request-id': 'invalid request ID',
      },
      method: 'POST',
    })
    const requestId = response.headers.get('x-request-id')
    const completion = completionFor(requestId)

    expect(response.status).toBe(400)
    expect(requestId).toMatch(/^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/)
    expect(completion).toMatchObject({ event: 'web.request.completed', level: 30, requestId, statusCode: 400 })
    expect(records.filter(record => record.event === 'web.request.failed')).toHaveLength(0)
    expect(JSON.stringify(records)).not.toContain('query-marker=secret')
    expect(JSON.stringify(records)).not.toContain('do-not-log')
  })

  it('redacts arbitrary client-supplied paths', async () => {
    const response = await fetch(`${baseUrl()}/Users/example/private.m4b?query-marker=secret`)
    const completion = completionFor(response.headers.get('x-request-id'))

    expect(response.status).toBe(404)
    expect(completion).toMatchObject({ event: 'web.request.completed', path: '/unmatched', statusCode: 404 })
    expect(JSON.stringify(records)).not.toContain('private.m4b')
  })

  it('correlates unexpected failures with their error completion record', async () => {
    await requireApp().close()
    const originalMethod = getControllerMethod()
    const metadata = Reflect.getMetadataKeys(originalMethod)
      .map(key => [key, Reflect.getMetadata(key, originalMethod)] as const)
    const spy = vi.spyOn(ManageAlbumsController.prototype, 'summarizeSourceDir')
      .mockRejectedValue(new InternalServerErrorException('unexpected request failure'))
    const mockedMethod = getControllerMethod()

    for (const [key, value] of metadata) {
      Reflect.defineMetadata(key, value, mockedMethod)
    }

    app = await createWebApp({ destDir, sourceDir }, { logger })
    await app.listen(0, '127.0.0.1')

    try {
      const response = await fetch(`${baseUrl()}/manage-albums/summarize-source-dir?dirName=.`, {
        headers: { 'x-request-id': 'failure-request-id' },
      })
      const requestId = response.headers.get('x-request-id')
      const failed = records.find(record => record.event === 'web.request.failed' && record.requestId === requestId)
      const completion = completionFor(requestId)

      expect(response.status).toBe(500)
      expect(failed).toMatchObject({
        err: { type: 'InternalServerErrorException' },
        event: 'web.request.failed',
        level: 50,
        requestId,
      })
      expect(completion).toMatchObject({ event: 'web.request.completed', level: 50, requestId, statusCode: 500 })
    }
    finally {
      spy.mockRestore()
    }
  })

  it('logs readiness only after an injected server listens', async () => {
    const servedApp = await serveWeb({ destDir, host: '127.0.0.1', logger, port: 0, sourceDir })

    try {
      const readyRecords = records.filter(record => record.event === 'web.server.ready')
      const [ready] = readyRecords

      expect(readyRecords).toHaveLength(1)
      expect(ready).toMatchObject({ event: 'web.server.ready', host: '127.0.0.1' })
      expect(ready?.port).toBeTypeOf('number')
    }
    finally {
      await servedApp.close()
    }
  })

  function baseUrl(): string {
    const address = (requireApp().getHttpServer() as Server).address()

    if (address === null || typeof address === 'string') {
      throw new Error('Expected a TCP listening address')
    }

    return `http://127.0.0.1:${address.port.toString()}`
  }

  function completionFor(requestId: string | null): LogRecord | undefined {
    const completions = records.filter(record => record.event === 'web.request.completed' && record.requestId === requestId)

    expect(completions).toHaveLength(1)

    return completions[0]
  }

  function requireApp(): INestApplication {
    if (app === undefined) {
      throw new Error('Expected a web application')
    }

    return app
  }

  function getControllerMethod(): object {
    const method: unknown = Object.getOwnPropertyDescriptor(ManageAlbumsController.prototype, 'summarizeSourceDir')?.value

    if (typeof method !== 'function') {
      throw new Error('Expected a controller method')
    }

    return method
  }
})

function createLogDestination(records: LogRecord[]): DestinationStream {
  return {
    write(message: string): void {
      records.push(JSON.parse(message) as LogRecord)
    },
  }
}
