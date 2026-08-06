import type { Dirent } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

import type { SetMetadataRecord } from '../../../src/commands/manage-albums/helpers/set-metadata.js'
import type { ConcatenateSourceEntry } from '../../../src/lib/albums/concatenate-album-sources.js'
import {
  assertNoDiscFieldsInRecords,
  reconcileConcatenateSetMetadata,
} from '../../../src/lib/albums/concatenate-set-metadata.js'

function fakeDirent(name: string): Dirent {
  return { name } as Dirent
}

function entry(sourceDirectory: string, sourceIndex: number, filenames: string[]): ConcatenateSourceEntry {
  return {
    albumArtFiles: [],
    files: filenames.map(fakeDirent),
    sourceDirectory,
    sourceIndex,
  }
}

function record(overrides: Partial<SetMetadataRecord> & Pick<SetMetadataRecord, 'filename'>): SetMetadataRecord {
  return { album: 'Album', artist: 'Artist', title: 'Title', trackNumber: 1, ...overrides }
}

describe('assertNoDiscFieldsInRecords', () => {
  it('accepts records without disc fields', () => {
    expect(() => {
      assertNoDiscFieldsInRecords([record({ filename: 'one.flac' })])
    }).not.toThrow()
  })

  it('accepts records carrying a year (year is not a disc field)', () => {
    expect(() => {
      assertNoDiscFieldsInRecords([record({ filename: 'one.flac', year: 1986 })])
    }).not.toThrow()
  })

  it('rejects a single record with discNumber', () => {
    expect(() => {
      assertNoDiscFieldsInRecords([record({ discNumber: 1, filename: 'one.flac' })])
    }).toThrow('one.flac')
  })

  it('rejects multiple offending records naming every filename', () => {
    expect(() => {
      assertNoDiscFieldsInRecords([
        record({ discNumber: 1, filename: 'one.flac' }),
        record({ discTotal: 2, filename: 'two.flac' }),
        record({ filename: 'three.flac' }),
      ])
    }).toThrow('one.flac, two.flac')
  })
})

describe('reconcileConcatenateSetMetadata', () => {
  it('reconciles records to a source-path map when every file has exactly one match', () => {
    const entries = [entry('/a', 0, ['one.flac']), entry('/b', 1, ['two.flac'])]
    const records = [record({ filename: 'one.flac' }), record({ filename: 'two.flac', trackNumber: 2 })]

    const result = reconcileConcatenateSetMetadata(records, entries)

    expect(result.get(resolve('/a', 'one.flac'))).toEqual(records[0])
    expect(result.get(resolve('/b', 'two.flac'))).toEqual(records[1])
    expect(result.get('one.flac')).toBeUndefined()
  })

  it('maps a filename repeated across directories to a distinct record per sourceIndex', () => {
    const entries = [entry('/a', 0, ['track.flac']), entry('/b', 1, ['track.flac'])]
    const records = [
      record({ filename: 'track.flac', sourceIndex: 1, title: 'First' }),
      record({ filename: 'track.flac', sourceIndex: 2, title: 'Second', trackNumber: 2 }),
    ]

    const result = reconcileConcatenateSetMetadata(records, entries)

    expect(result.get(resolve('/a', 'track.flac'))?.title).toBe('First')
    expect(result.get(resolve('/b', 'track.flac'))?.title).toBe('Second')
  })

  it('carries year through reconciliation on both discs', () => {
    const entries = [entry('/a', 0, ['track.flac']), entry('/b', 1, ['track.flac'])]
    const records = [
      record({ filename: 'track.flac', sourceIndex: 1, year: 1986 }),
      record({ filename: 'track.flac', sourceIndex: 2, trackNumber: 2, year: 1986 }),
    ]

    const result = reconcileConcatenateSetMetadata(records, entries)

    expect(result.get(resolve('/a', 'track.flac'))?.year).toBe(1986)
    expect(result.get(resolve('/b', 'track.flac'))?.year).toBe(1986)
  })

  it('rejects disc fields before any other check', () => {
    const entries = [entry('/a', 0, ['one.flac'])]
    const records = [record({ discNumber: 1, filename: 'one.flac' })]

    expect(() => reconcileConcatenateSetMetadata(records, entries)).toThrow('discNumber/discTotal')
  })

  it('rejects a sourceIndex beyond the sourceDirs count', () => {
    const entries = [entry('/a', 0, ['one.flac']), entry('/b', 1, ['two.flac'])]
    const records = [
      record({ filename: 'one.flac', sourceIndex: 1 }),
      record({ filename: 'two.flac', sourceIndex: 3 }),
    ]

    expect(() => reconcileConcatenateSetMetadata(records, entries))
      .toThrow('sourceIndex is out of range (expected 1..2): "two.flac" (3)')
  })

  it('rejects an ambiguous filename supplied without sourceIndex, naming every directory', () => {
    const entries = [entry('/a', 0, ['track.flac']), entry('/b', 1, ['track.flac'])]
    const records = [record({ filename: 'track.flac' })]

    expect(() => reconcileConcatenateSetMetadata(records, entries))
      .toThrow('requires sourceIndex to disambiguate filenames present in multiple sourceDirs: "track.flac" (/a (1), /b (2))')
  })

  it('rejects a sourceIndex naming a directory that does not contain the file', () => {
    const entries = [entry('/a', 0, ['one.flac']), entry('/b', 1, ['two.flac'])]
    const records = [
      record({ filename: 'one.flac', sourceIndex: 2 }),
      record({ filename: 'two.flac', sourceIndex: 2 }),
    ]

    expect(() => reconcileConcatenateSetMetadata(records, entries))
      .toThrow('does not contain the file: "one.flac" (2); present in /a (1)')
  })

  it('rejects two records resolving to the same file', () => {
    const entries = [entry('/a', 0, ['one.flac'])]
    const records = [
      record({ filename: 'one.flac' }),
      record({ filename: 'one.flac', sourceIndex: 1, title: 'Other' }),
    ]

    expect(() => reconcileConcatenateSetMetadata(records, entries))
      .toThrow(`multiple records resolving to the same file: ${resolve('/a', 'one.flac')}`)
  })

  it('rejects missing records relative to the union of all sourceDirs files', () => {
    const entries = [entry('/a', 0, ['one.flac']), entry('/b', 1, ['two.flac'])]
    const records = [record({ filename: 'one.flac' })]

    expect(() => reconcileConcatenateSetMetadata(records, entries))
      .toThrow('Source audio files are missing metadata records: two.flac')
  })

  it('qualifies a missing ambiguous filename with its directory', () => {
    const entries = [entry('/a', 0, ['track.flac']), entry('/b', 1, ['track.flac'])]
    const records = [record({ filename: 'track.flac', sourceIndex: 1 })]

    expect(() => reconcileConcatenateSetMetadata(records, entries))
      .toThrow('Source audio files are missing metadata records: track.flac (/b)')
  })

  it('rejects extra records that reference files absent from every sourceDir', () => {
    const entries = [entry('/a', 0, ['one.flac'])]
    const records = [record({ filename: 'one.flac' }), record({ filename: 'ghost.flac' })]

    expect(() => reconcileConcatenateSetMetadata(records, entries))
      .toThrow('Metadata records reference files that are not present in the source directory: ghost.flac')
  })
})
