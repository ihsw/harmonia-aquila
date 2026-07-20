import { getManageAlbumsMcpTools } from './manage-albums/index.js'
import { getManageAudiobooksMcpTools } from './manage-audiobooks/index.js'
import type { WebMcpToolContext, WebMcpToolRegistration } from './types.js'

export function getWebMcpToolRegistrations(context: WebMcpToolContext): readonly WebMcpToolRegistration[] {
  return [
    ...getManageAlbumsMcpTools(context),
    ...getManageAudiobooksMcpTools(context),
  ]
}
