import { resolve } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import {
  assertNoSourceIndexInRecords,
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

  it('reconciles records with source filenames keyed by resolved source path', () => {
    const recordsBySourcePath = reconcileSetMetadata([
      { album: 'Album', artist: 'Artist', filename: 'track01.flac', title: 'Title', trackNumber: 1 },
    ], '/music/album', ['track01.flac'])

    expect(recordsBySourcePath.get(resolve('/music/album', 'track01.flac'))?.trackNumber).toBe(1)
    expect(recordsBySourcePath.get('track01.flac')).toBeUndefined()
  })

  it('reports source files missing metadata records', () => {
    expect(() => reconcileSetMetadata([], '/music/album', ['track01.flac'])).toThrow('missing metadata records')
  })

  it('rejects sourceIndex outside concatenate mode, naming every offending filename', () => {
    const records = [
      { album: 'Album', artist: 'Artist', filename: 'one.flac', sourceIndex: 1, title: 'One', trackNumber: 1 },
      { album: 'Album', artist: 'Artist', filename: 'two.flac', title: 'Two', trackNumber: 2 },
      { album: 'Album', artist: 'Artist', filename: 'three.flac', sourceIndex: 2, title: 'Three', trackNumber: 3 },
    ]

    expect(() => {
      assertNoSourceIndexInRecords(records)
    }).toThrow('one.flac, three.flac')
    expect(() => reconcileSetMetadata(records, '/music/album', ['one.flac', 'two.flac', 'three.flac']))
      .toThrow('sourceIndex is only supported with sourceDirs')
  })

  it('accepts records without sourceIndex', () => {
    expect(() => {
      assertNoSourceIndexInRecords([
        { album: 'Album', artist: 'Artist', filename: 'one.flac', title: 'One', trackNumber: 1 },
      ])
    }).not.toThrow()
  })

  it.each([
    { contents: JSON.stringify([{
      album: 'Album', artist: 'Artist', filename: 'track01.flac', sourceIndex: 2, title: 'Title', trackNumber: 1,
    }]), extension: 'json' },
    {
      contents: 'filename,artist,album,trackNumber,title,sourceIndex\ntrack01.flac,Artist,Album,1,Title,2',
      extension: 'csv',
    },
  ])('parses optional sourceIndex from $extension', async ({ contents, extension }) => {
    const metadataPath = await createTempFile(tempDir, `metadata.${extension}`, contents)

    await expect(parseSetMetadataFile(metadataPath)).resolves.toEqual([{
      album: 'Album',
      artist: 'Artist',
      filename: 'track01.flac',
      sourceIndex: 2,
      title: 'Title',
      trackNumber: 1,
    }])
  })

  it('treats an empty CSV sourceIndex cell as absent', async () => {
    const metadataPath = await createTempFile(
      tempDir,
      'metadata.csv',
      'filename,artist,album,trackNumber,title,sourceIndex\ntrack01.flac,Artist,Album,1,Title,\ntrack02.flac,Artist,Album,2,Second,2',
    )

    await expect(parseSetMetadataFile(metadataPath)).resolves.toEqual([
      { album: 'Album', artist: 'Artist', filename: 'track01.flac', title: 'Title', trackNumber: 1 },
      { album: 'Album', artist: 'Artist', filename: 'track02.flac', sourceIndex: 2, title: 'Second', trackNumber: 2 },
    ])
  })

  it.each([
    [0, 'invalid sourceIndex'],
    [-1, 'invalid sourceIndex'],
    [1.5, 'invalid sourceIndex'],
    ['x', 'invalid sourceIndex'],
  ])('rejects invalid sourceIndex %j', async (sourceIndex, message) => {
    const metadataPath = await createTempFile(
      tempDir,
      'metadata.json',
      JSON.stringify([{
        album: 'Album', artist: 'Artist', filename: 'track01.flac', sourceIndex, title: 'Title', trackNumber: 1,
      }]),
    )

    await expect(parseSetMetadataFile(metadataPath)).rejects.toThrow(message)
  })

  it('accepts one filename twice when each record carries a distinct sourceIndex', async () => {
    const metadataPath = await createTempFile(
      tempDir,
      'metadata.json',
      JSON.stringify([
        { album: 'Album', artist: 'Artist', filename: 'track.flac', sourceIndex: 1, title: 'One', trackNumber: 1 },
        { album: 'Album', artist: 'Artist', filename: 'track.flac', sourceIndex: 2, title: 'Two', trackNumber: 1 },
      ]),
    )

    await expect(parseSetMetadataFile(metadataPath)).resolves.toHaveLength(2)
  })

  it.each([
    { fields: [{}, {}], label: 'neither record carries sourceIndex' },
    { fields: [{ sourceIndex: 1 }, { sourceIndex: 1 }], label: 'both records share one sourceIndex' },
    { fields: [{ sourceIndex: 1 }, {}], label: 'only one record carries sourceIndex' },
  ])('rejects duplicate records when $label', async ({ fields }) => {
    const metadataPath = await createTempFile(
      tempDir,
      'metadata.json',
      JSON.stringify(fields.map(extra => ({
        album: 'Album', artist: 'Artist', filename: 'track.flac', title: 'Title', trackNumber: 1, ...extra,
      }))),
    )

    await expect(parseSetMetadataFile(metadataPath)).rejects.toThrow('duplicate record for filename "track.flac"')
  })
})
