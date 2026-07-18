import 'reflect-metadata'

import type { INestApplication } from '@nestjs/common'
import { NestFactory } from '@nestjs/core'

import { AppModule } from './app.module.js'

export interface ServeWebOptions {
  host: string
  port: number
}

export async function createWebApp(): Promise<INestApplication> {
  return NestFactory.create(AppModule, { logger: false })
}

export async function serveWeb(options: ServeWebOptions): Promise<INestApplication> {
  const app = await createWebApp()
  await app.listen(options.port, options.host)

  return app
}
