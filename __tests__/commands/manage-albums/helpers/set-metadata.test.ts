import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import {
  parseSetMetadataFile,
  reconcileSetMetadata,
} from '../../../../src/commands/manage-albums/helpers/set-metadata.js'
import { createTempDir, createTempFile, removeTempDir } from '../../../test-helpers.js'

describe('set-metadata helper', () => {
  let tempDir: string

  beforeEach(async () => {
    tempDir = await createTempDir('set-metadata-helper-')
  })

  afterEach(async () => {
    await removeTempDir(tempDir)
  })

  it('parses JSON metadata records', async () => {
    const metadataPath = await createTempFile(
      tempDir,
      'metadata.json',
      JSON.stringify([{ album: 'Album', artist: 'Artist', filename: 'track01.flac', title: 'Title', trackNumber: 1 }]),
    )

    await expect(parseSetMetadataFile(metadataPath)).resolves.toEqual([{
      album: 'Album',
      artist: 'Artist',
      filename: 'track01.flac',
      title: 'Title',
      trackNumber: 1,
    }])
  })

  it('parses quoted CSV records and numeric track numbers', async () => {
    const metadataPath = await createTempFile(
      tempDir,
      'metadata.csv',
      'filename,artist,album,trackNumber,title\n"track01.mp3","Artist, The",Album,2,"Title ""Quoted"""',
    )

    await expect(parseSetMetadataFile(metadataPath)).resolves.toEqual([{
      album: 'Album',
      artist: 'Artist, The',
      filename: 'track01.mp3',
      title: 'Title "Quoted"',
      trackNumber: 2,
    }])
  })

  it.each([
    {
      contents: JSON.stringify([{
        album: 'Album',
        artist: 'Artist',
        discNumber: 2,
        discTotal: 3,
        filename: 'track01.flac',
        title: 'Title',
        trackNumber: 1,
      }]),
      extension: 'json',
    },
    {
      contents: 'filename,artist,album,trackNumber,title,discNumber,discTotal\ntrack01.flac,Artist,Album,1,Title,2,3',
      extension: 'csv',
    },
  ])('parses optional disc metadata from $extension', async ({ contents, extension }) => {
    const metadataPath = await createTempFile(tempDir, `metadata.${extension}`, contents)

    await expect(parseSetMetadataFile(metadataPath)).resolves.toEqual([{
      album: 'Album',
      artist: 'Artist',
      discNumber: 2,
      discTotal: 3,
      filename: 'track01.flac',
      title: 'Title',
      trackNumber: 1,
    }])
  })

  it.each([
    [{ discNumber: 0 }, 'invalid discNumber'],
    [{ discNumber: 1.5 }, 'invalid discNumber'],
    [{ discTotal: 2 }, 'discTotal without discNumber'],
    [{ discNumber: 3, discTotal: 2 }, 'discNumber greater than discTotal'],
  ])('rejects invalid disc metadata %j', async (discFields, message) => {
    const metadataPath = await createTempFile(
      tempDir,
      'metadata.json',
      JSON.stringify([{
        album: 'Album',
        artist: 'Artist',
        filename: 'track01.flac',
        title: 'Title',
        trackNumber: 1,
        ...discFields,
      }]),
    )

    await expect(parseSetMetadataFile(metadataPath)).rejects.toThrow(message)
  })

  it('rejects invalid metadata records with a useful message', async () => {
    const metadataPath = await createTempFile(
      tempDir,
      'metadata.json',
      JSON.stringify([{ album: 'Album', artist: 'Artist', filename: '../track01.flac', title: 'Title', trackNumber: 1 }]),
    )

    await expect(parseSetMetadataFile(metadataPath)).rejects.toThrow('must be a bare file name')
  })

  it('rejects duplicate CSV columns', async () => {
    const metadataPath = await createTempFile(
      tempDir,
      'metadata.csv',
      'filename,artist,album,trackNumber,title,title\ntrack01.flac,Artist,Album,1,Title,Duplicate',
    )

    await expect(parseSetMetadataFile(metadataPath)).rejects.toThrow('duplicate column "title"')
  })

  it('reconciles records with source filenames', () => {
    const recordsByFilename = reconcileSetMetadata([
      { album: 'Album', artist: 'Artist', filename: 'track01.flac', title: 'Title', trackNumber: 1 },
    ], ['track01.flac'])

    expect(recordsByFilename.get('track01.flac')?.trackNumber).toBe(1)
  })

  it('reports source files missing metadata records', () => {
    expect(() => reconcileSetMetadata([], ['track01.flac'])).toThrow('missing metadata records')
  })
})
