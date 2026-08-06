import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { parseSetMetadataFile } from '../../../../src/commands/manage-albums/helpers/set-metadata.js'
import { createTempDir, createTempFile, removeTempDir } from '../../../test-helpers.js'

const baseRecord = {
  album: 'Album',
  artist: 'Artist',
  filename: 'track01.flac',
  title: 'Title',
  trackNumber: 1,
}

describe('set-metadata helper year field', () => {
  let tempDir: string

  beforeEach(async () => {
    tempDir = await createTempDir('set-metadata-year-')
  })

  afterEach(async () => {
    await removeTempDir(tempDir)
  })

  it('parses a numeric JSON year', async () => {
    const metadataPath = await createTempFile(
      tempDir,
      'metadata.json',
      JSON.stringify([{ ...baseRecord, year: 1986 }]),
    )

    await expect(parseSetMetadataFile(metadataPath)).resolves.toEqual([{ ...baseRecord, year: 1986 }])
  })

  it('coerces a numeric-string JSON year', async () => {
    const metadataPath = await createTempFile(
      tempDir,
      'metadata.json',
      JSON.stringify([{ ...baseRecord, year: '1986' }]),
    )

    await expect(parseSetMetadataFile(metadataPath)).resolves.toEqual([{ ...baseRecord, year: 1986 }])
  })

  it('parses a CSV year column', async () => {
    const metadataPath = await createTempFile(
      tempDir,
      'metadata.csv',
      'filename,artist,album,trackNumber,title,year\ntrack01.flac,Artist,Album,1,Title,2004',
    )

    await expect(parseSetMetadataFile(metadataPath)).resolves.toEqual([{ ...baseRecord, year: 2004 }])
  })

  it('treats an empty CSV year cell as absent', async () => {
    const metadataPath = await createTempFile(
      tempDir,
      'metadata.csv',
      'filename,artist,album,trackNumber,title,year\ntrack01.flac,Artist,Album,1,Title,',
    )

    await expect(parseSetMetadataFile(metadataPath)).resolves.toEqual([baseRecord])
  })

  it('omits year entirely when the record does not supply it', async () => {
    const metadataPath = await createTempFile(tempDir, 'metadata.json', JSON.stringify([baseRecord]))
    const [record] = await parseSetMetadataFile(metadataPath)

    expect(record).toEqual(baseRecord)
    expect(record === undefined ? true : 'year' in record).toBe(false)
  })

  it.each([
    { label: 'zero', year: 0 },
    { label: 'below the minimum', year: 999 },
    { label: 'above the maximum', year: 10_000 },
    { label: 'a non-integer', year: 1986.5 },
    { label: 'a non-numeric string', year: 'nineteen' },
    { label: 'a boolean', year: true },
  ])('rejects $label', async ({ year }) => {
    const metadataPath = await createTempFile(
      tempDir,
      'metadata.json',
      JSON.stringify([{ ...baseRecord, year }]),
    )

    await expect(parseSetMetadataFile(metadataPath)).rejects.toThrow(
      /has an invalid year .* \(expected an integer between 1000 and 9999\)/,
    )
  })

  it('names the offending record index in the error', async () => {
    const metadataPath = await createTempFile(
      tempDir,
      'metadata.json',
      JSON.stringify([baseRecord, { ...baseRecord, filename: 'track02.flac', year: 12 }]),
    )

    await expect(parseSetMetadataFile(metadataPath)).rejects.toThrow('Metadata record at index 1')
  })
})
