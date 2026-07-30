import { UserInputError } from '../errors.js'

import type {
  AlbumArtistsStrategy,
  AlbumStrategy,
  DestinationStrategy,
  DiscStrategy,
  FixTagsOptions,
  NormalizedFixTagsOptions,
  ProducerStrategy,
} from './fix-tags-types.js'

function parseDestinationStrategy(value: string | undefined): DestinationStrategy {
  const strategy = value ?? 'error'

  if (strategy !== 'error' && strategy !== 'ignore' && strategy !== 'overwrite') {
    throw new UserInputError('--destination-strategy must be one of: error, ignore, overwrite')
  }

  return strategy
}

function parseAlbumArtistsStrategy(value: string | undefined): AlbumArtistsStrategy {
  const strategy = value ?? 'no change'

  if (strategy !== 'no change' && strategy !== 'aggregate' && strategy !== 'blank') {
    throw new UserInputError('--album-artists-strategy must be one of: no change, aggregate, blank')
  }

  return strategy
}

function parseAlbumStrategy(value: string | undefined): AlbumStrategy {
  const strategy = value ?? 'no change'

  if (strategy !== 'no change' && strategy !== 'grouping' && strategy !== 'originalalbum') {
    throw new UserInputError('--album-strategy must be one of: no change, grouping, originalalbum')
  }

  return strategy
}

function parseDiscStrategy(value: string | undefined): DiscStrategy {
  const strategy = value ?? 'no change'

  if (strategy !== 'no change' && strategy !== 'infer') {
    throw new UserInputError('--disc-strategy must be one of: no change, infer')
  }

  return strategy
}

function parseProducerStrategy(value: string | undefined): ProducerStrategy {
  const strategy = value ?? 'no change'

  if (
    strategy !== 'no change'
    && strategy !== 'blank'
    && strategy !== 'aggregate'
    && strategy !== 'copy-from-album-artists'
  ) {
    throw new UserInputError(
      '--producer-strategy must be one of: no change, blank, aggregate, copy-from-album-artists',
    )
  }

  return strategy
}

function validateOptionConflicts(options: NormalizedFixTagsOptions): void {
  if (options.swapArtistAlbumartist && options.albumArtistsStrategy !== 'no change') {
    throw new UserInputError('--swap-artist-albumartist conflicts with --album-artists-strategy')
  }

  if (options.setAlbumArtist !== undefined && options.albumArtistsStrategy !== 'no change') {
    throw new UserInputError('--set-album-artist conflicts with --album-artists-strategy')
  }

  if (options.setAlbumArtist !== undefined && options.swapArtistAlbumartist) {
    throw new UserInputError('--set-album-artist conflicts with --swap-artist-albumartist')
  }

  if (options.setArtist !== undefined && options.swapArtistAlbumartist) {
    throw new UserInputError('--set-artist conflicts with --swap-artist-albumartist')
  }

  if (options.setAlbum !== undefined && options.albumStrategy !== 'no change') {
    throw new UserInputError('--set-album conflicts with --album-strategy')
  }

  if (options.discStrategy === 'infer' && options.resetTrack) {
    throw new UserInputError('--disc-strategy infer conflicts with --reset-track')
  }

  if (options.setMetadata === undefined) {
    return
  }

  const conflicts = [
    options.setArtist === undefined ? undefined : '--set-artist',
    options.setAlbum === undefined ? undefined : '--set-album',
    options.albumStrategy === 'no change' ? undefined : '--album-strategy',
    options.resetTrack ? '--reset-track' : undefined,
    options.swapArtistAlbumartist ? '--swap-artist-albumartist' : undefined,
  ].filter((value): value is string => value !== undefined)

  if (conflicts.length > 0) {
    throw new UserInputError(`--set-metadata conflicts with ${conflicts.join(', ')}`)
  }
}

export function normalizeFixTagsOptions(options: FixTagsOptions): NormalizedFixTagsOptions {
  const normalized: NormalizedFixTagsOptions = {
    albumArtistsStrategy: parseAlbumArtistsStrategy(options.albumArtistsStrategy),
    albumStrategy: parseAlbumStrategy(options.albumStrategy),
    destinationStrategy: parseDestinationStrategy(options.destinationStrategy),
    discStrategy: parseDiscStrategy(options.discStrategy),
    execute: options.execute === true,
    producerStrategy: parseProducerStrategy(options.producerStrategy),
    resetTrack: options.resetTrack === true,
    setAlbum: options.setAlbum,
    setAlbumArtist: options.setAlbumArtist,
    setArtist: options.setArtist,
    setMetadata: options.setMetadata,
    swapArtistAlbumartist: options.swapArtistAlbumartist === true,
  }

  validateOptionConflicts(normalized)
  return normalized
}
