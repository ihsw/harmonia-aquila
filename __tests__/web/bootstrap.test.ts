import type { INestApplication } from '@nestjs/common'
import { afterEach, describe, expect, it } from 'vitest'

import { createWebApp } from '../../src/web/main.js'

describe('web bootstrap', () => {
  let app: INestApplication | undefined

  afterEach(async () => {
    await app?.close()
    app = undefined
  })

  it('creates and initializes the Nest application', async () => {
    app = await createWebApp()
    await app.init()

    expect(app.getHttpServer()).toBeDefined()
  })
})
