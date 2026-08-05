import type { Dirent } from 'node:fs'
import { describe, expect, it } from 'vitest'

import type { SetMetadataRecord } from '../../../src/commands/manage-albums/helpers/set-metadata.js'
import type { ConcatenateSourceEntry } from '../../../src/lib/albums/concatenate-album-sources.js'
import {
  assertNoDiscFieldsInRecords,
  assertUniqueFilenamesAcrossSources,
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

describe('assertUniqueFilenamesAcrossSources', () => {
  it('accepts unique filenames across directories', () => {
    const entries = [entry('/a', 0, ['one.flac']), entry('/b', 1, ['two.flac'])]

    expect(() => {
      assertUniqueFilenamesAcrossSources(entries)
    }).not.toThrow()
  })

  it('rejects a filename repeated across directories, naming both', () => {
    const entries = [entry('/a', 0, ['track.flac']), entry('/b', 1, ['track.flac'])]

    expect(() => {
      assertUniqueFilenamesAcrossSources(entries)
    }).toThrow('"track.flac" (/a, /b)')
  })
})

describe('reconcileConcatenateSetMetadata', () => {
  it('reconciles records to a filename map when every file has exactly one match', () => {
    const entries = [entry('/a', 0, ['one.flac']), entry('/b', 1, ['two.flac'])]
    const records = [record({ filename: 'one.flac' }), record({ filename: 'two.flac', trackNumber: 2 })]

    const result = reconcileConcatenateSetMetadata(records, entries)

    expect(result.get('one.flac')).toEqual(records[0])
    expect(result.get('two.flac')).toEqual(records[1])
  })

  it('rejects disc fields before checking coverage', () => {
    const entries = [entry('/a', 0, ['one.flac'])]
    const records = [record({ discNumber: 1, filename: 'one.flac' })]

    expect(() => reconcileConcatenateSetMetadata(records, entries)).toThrow('discNumber/discTotal')
  })

  it('rejects cross-directory filename collisions before checking coverage', () => {
    const entries = [entry('/a', 0, ['track.flac']), entry('/b', 1, ['track.flac'])]
    const records = [record({ filename: 'track.flac' })]

    expect(() => reconcileConcatenateSetMetadata(records, entries)).toThrow('unique filenames across sourceDirs')
  })

  it('rejects missing records relative to the union of all sourceDirs files', () => {
    const entries = [entry('/a', 0, ['one.flac']), entry('/b', 1, ['two.flac'])]
    const records = [record({ filename: 'one.flac' })]

    expect(() => reconcileConcatenateSetMetadata(records, entries))
      .toThrow('Source audio files are missing metadata records: two.flac')
  })

  it('rejects extra records that reference files absent from every sourceDir', () => {
    const entries = [entry('/a', 0, ['one.flac'])]
    const records = [record({ filename: 'one.flac' }), record({ filename: 'ghost.flac' })]

    expect(() => reconcileConcatenateSetMetadata(records, entries))
      .toThrow('Metadata records reference files that are not present in the source directory: ghost.flac')
  })
})
