import { UserInputError } from '../errors.js'

import { readAudiobookFile } from './audiobook-file.js'

export interface ValidateAudiobookOptions {
  fileName: string
}

export interface ValidateAudiobookJsonOutputRow {
  filename: string
  performer: string
  title: string
  valid: true
}

export type ValidateAudiobookJsonOutput = ValidateAudiobookJsonOutputRow[]

export async function validateAudiobook(options: ValidateAudiobookOptions): Promise<ValidateAudiobookJsonOutput> {
  const audiobookFile = await readAudiobookFile(options.fileName)

  if (audiobookFile.filename !== audiobookFile.expectedFilename) {
    throw new UserInputError(`${audiobookFile.filename} does not match metadata; expected "${audiobookFile.expectedFilename}"`)
  }

  return [{
    filename: audiobookFile.filename,
    performer: audiobookFile.performer,
    title: audiobookFile.title,
    valid: true,
  }]
}
