import { Catch, Logger } from '@nestjs/common'
import type { GqlExceptionFilter } from '@nestjs/graphql'
import { GraphQLError } from 'graphql'

import { UserInputError } from '../../../lib/errors.js'

@Catch()
export class GraphqlErrorFilter implements GqlExceptionFilter<unknown, GraphQLError> {
  public catch(exception: unknown): GraphQLError {
    if (exception instanceof UserInputError) {
      return new GraphQLError(exception.message, {
        extensions: { code: 'BAD_USER_INPUT' },
      })
    }

    Logger.error(
      `Unexpected GraphQL resolver failure (${getErrorCategory(exception)})`,
      GraphqlErrorFilter.name,
    )

    return new GraphQLError('Internal server error', {
      extensions: { code: 'INTERNAL_SERVER_ERROR' },
    })
  }
}

function getErrorCategory(exception: unknown): string {
  return exception instanceof Error ? exception.name : typeof exception
}
