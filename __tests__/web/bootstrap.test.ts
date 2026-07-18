import type { INestApplication } from '@nestjs/common'
import type { Server } from 'node:http'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { createWebApp, serveWeb } from '../../src/web/main.js'
import { createTempDir, removeTempDir } from '../test-helpers.js'

describe('web bootstrap', () => {
  let app: INestApplication | undefined
  let destDir: string
  let sourceDir: string

  beforeEach(async () => {
    destDir = await createTempDir('web-dest-')
    sourceDir = await createTempDir('web-source-')
  })

  afterEach(async () => {
    await app?.close()
    app = undefined
    await removeTempDir(destDir)
    await removeTempDir(sourceDir)
  })

  it('creates and initializes the Nest application', async () => {
    app = await createWebApp({ destDir, sourceDir })
    await app.init()

    expect(app.getHttpServer()).toBeDefined()
  })

  it('starts and closes the web server on an ephemeral port', async () => {
    app = await serveWeb({
      destDir,
      host: '127.0.0.1',
      port: 0,
      sourceDir,
    })

    const server = app.getHttpServer() as Server
    expect(server.listening).toBe(true)
  })
})
