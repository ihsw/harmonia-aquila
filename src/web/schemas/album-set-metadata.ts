import { z } from 'zod/v4'

const nonEmptyString = z.string().refine(value => value.trim() !== '', {
  message: 'must be a non-empty string',
})

const filenameSchema = nonEmptyString
  .refine(value => !value.includes('/') && !value.includes('\\'), {
    message: 'must be a bare file name without path separators',
  })
  .refine(value => /\.(?:flac|mp3)$/i.test(value), {
    message: 'must use a supported audio extension (.flac, .mp3)',
  })

export const albumSetMetadataRecordSchema = z.object({
  album: nonEmptyString,
  artist: nonEmptyString,
  discNumber: z.number().int().positive().optional(),
  discTotal: z.number().int().positive().optional(),
  filename: filenameSchema,
  sourceIndex: z.number().int().positive().optional(),
  title: nonEmptyString,
  trackNumber: z.number().int().positive(),
}).superRefine((record, context) => {
  if (record.discTotal !== undefined && record.discNumber === undefined) {
    context.addIssue({ code: 'custom', message: 'discTotal requires discNumber', path: ['discTotal'] })
  }
  if (record.discNumber !== undefined
    && record.discTotal !== undefined
    && record.discNumber > record.discTotal) {
    context.addIssue({ code: 'custom', message: 'discNumber must not exceed discTotal', path: ['discNumber'] })
  }
})

export const albumSetMetadataRecordsSchema = z.array(albumSetMetadataRecordSchema)
  .min(1, 'setMetadata must contain at least one record')

export type AlbumSetMetadataRecord = z.infer<typeof albumSetMetadataRecordSchema>
