import type { INestApplication } from '@nestjs/common'
import type { Server } from 'node:http'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { createWebApp } from '../../../src/web/main.js'
import { createTempDir, removeTempDir } from '../../test-helpers.js'

interface GraphqlResponse {
  data?: Record<string, unknown>
  errors?: Array<{
    extensions?: {
      code?: string
    }
    message: string
  }>
}

describe('web GraphQL endpoint', () => {
  let app: INestApplication | undefined
  let baseUrl: string
  let destDir: string
  let sourceDir: string

  beforeEach(async () => {
    destDir = await createTempDir('graphql-dest-')
    sourceDir = await createTempDir('graphql-source-')
    app = await createWebApp({ destDir, sourceDir })
    await app.listen(0, '127.0.0.1')
    const address = (app.getHttpServer() as Server).address()

    if (typeof address !== 'object' || address === null) {
      throw new Error('GraphQL test server did not bind a TCP address')
    }

    baseUrl = `http://127.0.0.1:${String(address.port)}`
  })

  afterEach(async () => {
    await app?.close()
    app = undefined
    await removeTempDir(destDir)
    await removeTempDir(sourceDir)
  })

  it('publishes every scoped operation and returns read-only results', async () => {
    const schema = await postGraphql(`{
      __schema {
        mutationType { fields { name } }
        queryType { fields { name } }
      }
    }`)
    const result = await postGraphql(`{
      albumList(input: {})
      albumSummarizeSourceDir(input: { dirName: "." }) { filename }
      audiobookCrawl(input: { dirName: "." }) { filename }
    }`)

    expect(schema.errors).toBeUndefined()
    expect(getOperationNames(schema.data, 'mutationType')).toEqual(expect.arrayContaining([
      'albumFixTags',
      'albumOrganizeFiles',
      'audiobookConvertFiles',
      'audiobookCopyAndRename',
      'audiobookMerge',
      'audiobookSetMetadata',
    ]))
    expect(getOperationNames(schema.data, 'queryType')).toEqual(expect.arrayContaining([
      'albumList',
      'albumSummarizeSourceDir',
      'albumValidateSourceDir',
      'audiobookCrawl',
      'audiobookValidate',
    ]))
    expect(result).toEqual({
      data: {
        albumList: [],
        albumSummarizeSourceDir: [],
        audiobookCrawl: [],
      },
    })
  })

  it('keeps mutations dry-run by default and translates resolver errors safely', async () => {
    const dryRun = await postGraphql('mutation { albumFixTags(input: {}) { album } }')
    const userInputError = await postGraphql('{ audiobookValidate(input: { fileName: "../escape.m4b" }) { filename } }')
    const listTraversal = await postGraphql('{ albumList(input: { prefix: "../" }) }')
    const internalError = await postGraphql('{ audiobookValidate(input: { fileName: "missing.m4b" }) { filename } }')

    expect(dryRun).toEqual({ data: { albumFixTags: [] } })
    expect(userInputError.errors?.[0]).toMatchObject({
      extensions: { code: 'BAD_USER_INPUT' },
      message: 'fileName must stay within --source-dir',
    })
    expect(listTraversal.errors?.[0]).toMatchObject({
      extensions: { code: 'BAD_USER_INPUT' },
    })
    expect(internalError.errors?.[0]).toMatchObject({
      extensions: { code: 'INTERNAL_SERVER_ERROR' },
      message: 'Internal server error',
    })
  })

  async function postGraphql(query: string): Promise<GraphqlResponse> {
    const response = await fetch(`${baseUrl}/graphql`, {
      body: JSON.stringify({ query }),
      headers: { 'content-type': 'application/json' },
      method: 'POST',
    })

    expect(response.status).toBe(200)

    return response.json() as Promise<GraphqlResponse>
  }
})

function getOperationNames(data: Record<string, unknown> | undefined, typeName: string): string[] {
  const schema = Object.entries(data ?? {}).find(([key]) => key === '__schema')?.[1]

  if (!isRecord(schema) || !isRecord(schema[typeName]) || !Array.isArray(schema[typeName].fields)) {
    throw new Error(`GraphQL schema is missing ${typeName} fields`)
  }

  return schema[typeName].fields.map((field) => {
    if (!isRecord(field) || typeof field.name !== 'string') {
      throw new Error(`GraphQL ${typeName} field is missing a name`)
    }

    return field.name
  })
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}
