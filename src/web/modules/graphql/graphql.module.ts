import { ApolloDriver, type ApolloDriverConfig } from '@nestjs/apollo'
import { type DynamicModule, Module } from '@nestjs/common'
import { GraphQLModule } from '@nestjs/graphql'
import { resolve } from 'node:path'

import { WebPathResolver, type WebRoots } from '../../providers/path-resolver.js'

import { AlbumResolver } from './album.resolver.js'
import { AudiobookResolver } from './audiobook.resolver.js'
import { GraphqlErrorFilter } from './graphql-error.filter.js'

@Module({})
export class GraphqlModule {}

export function createGraphqlModule(roots: WebRoots): DynamicModule {
  return {
    imports: [
      GraphQLModule.forRoot<ApolloDriverConfig>({
        autoSchemaFile: resolve(process.cwd(), 'src/web/modules/graphql/schema.gql'),
        driver: ApolloDriver,
        path: '/graphql',
        sortSchema: true,
      }),
    ],
    module: GraphqlModule,
    providers: [
      {
        provide: WebPathResolver,
        useValue: new WebPathResolver(roots),
      },
      AlbumResolver,
      AudiobookResolver,
      GraphqlErrorFilter,
    ],
  }
}
