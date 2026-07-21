import { extname, join } from 'node:path'

import { UserInputError } from '../errors.js'

export type ArtistFilenameStrategy = 'albumartist' | 'artist' | 'label' | 'producer'
export type TitleFilenameStrategy = 'subtitle' | 'title'

export function sanitizePathSegment(value: string): string {
  return Array.from(value).map((character) => {
    if (character.charCodeAt(0) < 32 || '<>:"/\\|?*'.includes(character)) {
      return '-'
    }

    return character
  }).join('').replaceAll(/\s+/g, ' ').trim()
}

export function formatTrackNumber(trackNumber: number): string {
  return trackNumber.toString().padStart(2, '0')
}

export function formatMetadataValues(values: string[] | undefined): string {
  return values?.filter(value => value !== '').join('; ') ?? ''
}

export function parseArtistFilenameStrategy(value: string | undefined): ArtistFilenameStrategy {
  const strategy = value ?? 'artist'

  if (strategy !== 'albumartist' && strategy !== 'artist' && strategy !== 'label' && strategy !== 'producer') {
    throw new UserInputError('--artist-filename-strategy must be one of: artist, albumartist, label, producer')
  }

  return strategy
}

export function parseTitleFilenameStrategy(value: string | undefined): TitleFilenameStrategy {
  const strategy = value ?? 'title'

  if (strategy !== 'subtitle' && strategy !== 'title') {
    throw new UserInputError('--title-filename-strategy must be one of: subtitle, title')
  }

  return strategy
}

export function getArtistFilename(
  strategy: ArtistFilenameStrategy,
  artist: string,
  albumartist: string,
  label: string[],
  producer: string[],
): string {
  if (strategy === 'albumartist') {
    return albumartist
  }

  if (strategy === 'label') {
    return formatMetadataValues(label)
  }

  if (strategy === 'producer') {
    return formatMetadataValues(producer)
  }

  return artist
}

export function getAlbumDestination(
  artistFilename: string,
  album: string,
  trackNumber: number,
  titleFilename: string,
  sourceFilename: string,
): string {
  return join(
    sanitizePathSegment(artistFilename),
    sanitizePathSegment(album),
    `${formatTrackNumber(trackNumber)} - ${sanitizePathSegment(titleFilename)}${extname(sourceFilename)}`,
  )
}
