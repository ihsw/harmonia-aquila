import { BadRequestException, InternalServerErrorException } from '@nestjs/common'

import { getErrorMessage, UserInputError } from '../lib/errors.js'

export function throwHttpError(error: unknown): never {
  if (error instanceof UserInputError) {
    throw new BadRequestException({
      error: 'Bad Request',
      message: error.message,
      statusCode: 400,
    })
  }

  throw new InternalServerErrorException({
    error: 'Internal Server Error',
    message: getErrorMessage(error),
    statusCode: 500,
  })
}
