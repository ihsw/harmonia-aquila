import { z, type ZodType } from 'zod'

import { UserInputError } from '../lib/errors.js'

export type QueryRecord = Record<string, string | string[] | undefined>

const booleanError = 'boolean values must be true or false'

function formatIssues(error: z.ZodError): string {
  return error.issues
    .map((issue) => {
      const fieldName = issue.path[0]

      return fieldName === undefined ? issue.message : `${String(fieldName)}: ${issue.message}`
    })
    .join('; ')
}

function hasOwnKey(value: object, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(value, key)
}

function requiredString(fieldName: string): ZodType<string> {
  return z.unknown().transform((value, context) => {
    if (value === undefined) {
      context.addIssue({ code: 'custom', message: `${fieldName} is required` })
      return z.NEVER
    }

    if (typeof value !== 'string') {
      context.addIssue({ code: 'custom', message: `${fieldName} must be a string` })
      return z.NEVER
    }

    return value
  })
}

function optionalString(fieldName: string): ZodType<string | undefined> {
  return z.string({ error: `${fieldName} must be a string` }).optional()
}

function optionalBodyBoolean(): ZodType<boolean | undefined> {
  return z.boolean({ error: booleanError }).optional()
}

function optionalQueryBoolean(): ZodType<boolean | undefined> {
  return z.enum(['true', 'false'], { error: booleanError })
    .transform(value => value === 'true')
    .optional()
}

function stringArray(fieldName: string): ZodType<string[]> {
  return z.unknown().transform((value, context) => {
    if (value === undefined) {
      return []
    }

    if (typeof value === 'string') {
      return [value]
    }

    if (Array.isArray(value) && value.every(item => typeof item === 'string')) {
      return value
    }

    context.addIssue({ code: 'custom', message: `${fieldName} must be a string or string array` })
    return z.NEVER
  })
}

export function parseRequest<T>(
  schema: ZodType<T>,
  value: unknown,
  forbiddenFields: Readonly<Record<string, string>> = {},
): T {
  if (typeof value === 'object' && value !== null) {
    for (const [key, message] of Object.entries(forbiddenFields)) {
      if (hasOwnKey(value, key)) {
        throw new UserInputError(message)
      }
    }
  }

  const result = schema.safeParse(value)

  if (!result.success) {
    throw new UserInputError(formatIssues(result.error))
  }

  return result.data
}

export function optionalEntry<T>(key: string, value: T | undefined): Record<string, T> {
  return value === undefined ? {} : { [key]: value }
}

export const summarizeSourceDirQuerySchema = z.object({
  dirName: requiredString('dirName'),
  ignoreNonAudioFiles: optionalQueryBoolean(),
  limit: optionalString('limit'),
})

export const fixTagsBodySchema = z.object({
  albumArtistsStrategy: optionalString('albumArtistsStrategy'),
  albumStrategy: optionalString('albumStrategy'),
  destinationStrategy: optionalString('destinationStrategy'),
  execute: optionalBodyBoolean(),
  limit: optionalString('limit'),
  producerStrategy: optionalString('producerStrategy'),
  resetTrack: optionalBodyBoolean(),
  setAlbum: optionalString('setAlbum'),
  setAlbumArtist: optionalString('setAlbumArtist'),
  setArtist: optionalString('setArtist'),
  setMetadata: optionalString('setMetadata'),
  swapArtistAlbumartist: optionalBodyBoolean(),
})

export const organizeFilesBodySchema = z.object({
  artistFilenameStrategy: optionalString('artistFilenameStrategy'),
  execute: optionalBodyBoolean(),
  ignoreAudioFilesWithoutTracks: optionalBodyBoolean(),
  ignoreNonAudioFiles: optionalBodyBoolean(),
  limit: optionalString('limit'),
  titleFilenameStrategy: optionalString('titleFilenameStrategy'),
})

export const validateAudiobookQuerySchema = z.object({
  fileName: requiredString('fileName'),
})

export const crawlAudiobooksQuerySchema = z.object({
  dirName: requiredString('dirName'),
})

export const copyAndRenameBodySchema = z.object({
  execute: optionalBodyBoolean(),
  fileName: requiredString('fileName'),
})

export const convertFileBodySchema = z.object({
  author: optionalString('author'),
  concurrency: optionalString('concurrency'),
  execute: optionalBodyBoolean(),
  fileName: stringArray('fileName'),
  jobs: optionalString('jobs'),
  narrator: optionalString('narrator'),
  title: optionalString('title'),
})

export const mergeBodySchema = z.object({
  bypassMetadata: optionalBodyBoolean(),
  execute: optionalBodyBoolean(),
  jobs: optionalString('jobs'),
})

export const setMetadataBodySchema = z.object({
  author: requiredString('author'),
  destFilepath: requiredString('destFilepath'),
  execute: optionalBodyBoolean(),
  narrator: optionalString('narrator'),
  sourceFilepath: requiredString('sourceFilepath'),
  title: requiredString('title'),
})
