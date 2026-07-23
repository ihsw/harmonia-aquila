import 'reflect-metadata'

import type { INestApplication } from '@nestjs/common'
import { NestFactory } from '@nestjs/core'
import type { Server } from 'node:http'
import type { Logger } from 'pino'

import { createWebLogger, WebLogger } from './logging/web-logger.js'
import { WebLoggingExceptionFilter } from './logging/web-logging-exception.filter.js'
import { WebLoggingMiddleware } from './logging/web-logging.middleware.js'
import { createAppModule } from './modules/app.module.js'
import { normalizeWebRoots, type WebRoots } from './providers/path-resolver.js'

export interface CreateWebAppOptions {
  logger?: Logger
}

export interface ServeWebOptions extends WebRoots, CreateWebAppOptions {
  host: string
  port: number
}

export async function createWebApp(
  roots: WebRoots,
  options: CreateWebAppOptions = {},
): Promise<INestApplication> {
  const normalizedRoots = await normalizeWebRoots(roots)
  const logger = options.logger ?? createWebLogger()
  const app = await NestFactory.create(createAppModule(normalizedRoots), {
    logger: new WebLogger(logger),
  })
  const requestLogging = new WebLoggingMiddleware(logger)

  app.use(requestLogging.use.bind(requestLogging))
  app.useGlobalFilters(new WebLoggingExceptionFilter(app.getHttpAdapter(), logger))

  return app
}

export async function serveWeb(options: ServeWebOptions): Promise<INestApplication> {
  const logger = options.logger ?? createWebLogger()
  const app = await createWebApp(options, { logger })
  await app.listen(options.port, options.host)
  const address = (app.getHttpServer() as Server).address()

  logger.info({
    event: 'web.server.ready',
    host: typeof address === 'object' && address !== null ? address.address : options.host,
    port: typeof address === 'object' && address !== null ? address.port : options.port,
  })

  return app
}
