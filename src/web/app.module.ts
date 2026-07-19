import { type DynamicModule, Module } from '@nestjs/common'

import { ManageAlbumsController } from './manage-albums.controller.js'
import { ManageAudiobooksController } from './manage-audiobooks.controller.js'
import { WebMcpServerFactory } from './mcp-server.js'
import { McpController } from './mcp.controller.js'
import { WebPathResolver, type WebRoots } from './path-resolver.js'

@Module({})
export class AppModule {}

export function createAppModule(roots: WebRoots): DynamicModule {
  return {
    controllers: [ManageAlbumsController, ManageAudiobooksController, McpController],
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
