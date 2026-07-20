import { getManageAlbumsMcpTools } from './manage-albums/index.js'
import { getManageAudiobooksMcpTools } from './manage-audiobooks/index.js'
import type { WebMcpToolContext } from './types.js'

export function getWebMcpToolRegistrations(context: WebMcpToolContext) {
  return [
    ...getManageAlbumsMcpTools(context),
    ...getManageAudiobooksMcpTools(context),
  ] as const
}
