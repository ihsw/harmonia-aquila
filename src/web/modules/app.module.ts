import { type DynamicModule, Module } from '@nestjs/common'

import { ManageAlbumsController } from '../controllers/manage-albums.controller.js'
import { ManageAudiobooksController } from '../controllers/manage-audiobooks.controller.js'
import { McpController } from '../controllers/mcp.controller.js'
import { WebPathResolver, type WebRoots } from '../providers/path-resolver.js'
import { WebMcpServerFactory } from '../servers/mcp-server.js'

import { createGraphqlModule } from './graphql/graphql.module.js'

@Module({})
export class AppModule {}

export function createAppModule(roots: WebRoots): DynamicModule {
  return {
    controllers: [ManageAlbumsController, ManageAudiobooksController, McpController],
    imports: [createGraphqlModule(roots)],
    module: AppModule,
    providers: [
      {
        provide: WebPathResolver,
        useValue: new WebPathResolver(roots),
      },
      WebMcpServerFactory,
    ],
  }
}
