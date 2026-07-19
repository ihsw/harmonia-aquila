import 'reflect-metadata'

import type { INestApplication } from '@nestjs/common'
import { NestFactory } from '@nestjs/core'

import { createAppModule } from './modules/app.module.js'
import { normalizeWebRoots, type WebRoots } from './providers/path-resolver.js'

export interface ServeWebOptions extends WebRoots {
  host: string
  port: number
}

export async function createWebApp(roots: WebRoots): Promise<INestApplication> {
  const normalizedRoots = await normalizeWebRoots(roots)

  return NestFactory.create(createAppModule(normalizedRoots), { logger: false })
}

export async function serveWeb(options: ServeWebOptions): Promise<INestApplication> {
  const app = await createWebApp(options)
  await app.listen(options.port, options.host)

  return app
}
