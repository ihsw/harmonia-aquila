import { Module } from '@nestjs/common'

import { ManageAlbumsController } from './manage-albums.controller.js'
import { ManageAudiobooksController } from './manage-audiobooks.controller.js'

@Module({
  controllers: [ManageAlbumsController, ManageAudiobooksController],
})
export class AppModule {}
