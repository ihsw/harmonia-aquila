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
