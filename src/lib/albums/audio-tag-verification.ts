import { type IAudioMetadata, parseFile } from 'music-metadata'

import type { AudioTagFix } from './audio-tags.js'

/** ID3v2.3 text frames are single-valued; node-taglib-sharp stores multi-value lists joined. */
const ID3V2_3_LIST_SEPARATOR = '/'

function metadataValues(values: string[] | undefined, value: string | undefined): string[] {
  return values ?? (value === undefined || value === '' ? [] : [value])
}

function matchesNumericTagFix(value: number | null, kindedValue: AudioTagFix['discNumber']): boolean {
  return kindedValue === undefined || (
    kindedValue.kind === 'clear'
      ? value === null || value === 0
      : value === kindedValue.value
  )
}

function matchesList(actual: string[], expected: string[]): boolean {
  return JSON.stringify(actual) === JSON.stringify(expected)
}

function joinsTextLists(metadata: IAudioMetadata): boolean {
  return metadata.format.tagTypes.includes('ID3v2.3')
}

/**
 * Accepts the only representation ID3v2.3 can offer for a multi-value text frame: the requested
 * entries joined with a slash. A single-entry request is always compared exactly, so the tolerance
 * cannot mask a value that simply did not land.
 */
function matchesTextList(actual: string[], expected: string[], joinsLists: boolean): boolean {
  if (matchesList(actual, expected)) {
    return true
  }

  return joinsLists
    && expected.length > 1
    && actual.length === 1
    && actual[0] === expected.join(ID3V2_3_LIST_SEPARATOR)
}

/**
 * music-metadata does not surface the ID3v2 involved-people frame on `common.producer`, so the
 * producers written for an .mp3 are only visible in the native tag list.
 */
function involvedPeopleProducers(metadata: IAudioMetadata): string[] | undefined {
  for (const tags of Object.values(metadata.native)) {
    for (const tag of tags) {
      if (tag.id !== 'IPLS' && tag.id !== 'TIPL') {
        continue
      }
      const value: unknown = tag.value

      if (typeof value !== 'object' || value === null || !('producer' in value)) {
        continue
      }
      const producers: unknown = value.producer

      if (Array.isArray(producers) && producers.every(entry => typeof entry === 'string')) {
        return producers
      }
    }
  }

  return undefined
}

export function findUnpersistedTagFields(metadata: IAudioMetadata, fix: AudioTagFix): string[] {
  const { common } = metadata
  const joinsLists = joinsTextLists(metadata)
  const albumArtists = metadataValues(common.albumartists, common.albumartist)
  const artists = metadataValues(common.artists, common.artist)
  const producers = common.producer ?? involvedPeopleProducers(metadata) ?? []
  const checks: Array<[string, boolean]> = [
    ['album', fix.album === undefined || common.album === fix.album],
    ['albumArtists', fix.albumArtists === undefined || matchesTextList(albumArtists, fix.albumArtists, joinsLists)],
    ['artists', fix.artists === undefined || matchesTextList(artists, fix.artists, joinsLists)],
    ['discNumber', matchesNumericTagFix(common.disk.no, fix.discNumber)],
    ['discTotal', matchesNumericTagFix(common.disk.of, fix.discTotal)],
    ['producers', fix.producers === undefined || matchesList(producers, fix.producers)],
    ['title', fix.title === undefined || common.title === fix.title],
    ['trackNumber', fix.trackNumber === undefined || common.track.no === fix.trackNumber],
  ]

  return checks.flatMap(([field, matched]) => matched ? [] : [field])
}

export async function verifyTagFix(path: string, fix: AudioTagFix): Promise<void> {
  if (Object.keys(fix).length === 0) {
    return
  }
  const failed = findUnpersistedTagFields(await parseFile(path), fix)

  if (failed.length > 0) {
    throw new Error(`Metadata was not persisted: ${failed.join(', ')} (requested ${JSON.stringify(fix)})`)
  }
}
