import { readFile } from 'node:fs/promises'
import { describe, expect, it } from 'vitest'

describe('GraphQL album disc metadata contract', () => {
  it('publishes disc inputs and result fields in generated SDL', async () => {
    const schema = await readFile('src/web/modules/graphql/schema.gql', 'utf8')

    expect(schema).toMatch(/input AlbumFixTagsInput \{[^}]*discStrategy: String/s)
    expect(schema).toMatch(/type AlbumFixTagsRow \{[^}]*discNumber: Int[^}]*discTotal: Int/s)
    expect(schema).toMatch(/type AlbumFixTagsRow \{[^}]*newDiscNumber: Int[^}]*newDiscTotal: Int/s)
    expect(schema).toMatch(/type AlbumSummaryRow \{[^}]*discNumber: String![^}]*discTotal: String!/s)
    expect(schema).toMatch(/type AlbumValidationRow \{[^}]*discNumber: String![^}]*discTotal: String!/s)
    expect(schema).toMatch(/type AlbumOrganizeFilesRow \{[^}]*discNumber: String![^}]*discTotal: String!/s)
  })
})
