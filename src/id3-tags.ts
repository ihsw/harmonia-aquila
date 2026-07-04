import NodeID3 from 'node-id3'

export interface Mp3TagFix {
  album: string
  albumartist: string
  title: string
}

export function writeMp3TagFix(filePath: string, tagFix: Mp3TagFix): void {
  const result = NodeID3.update({
    album: tagFix.album,
    performerInfo: tagFix.albumartist,
    title: tagFix.title,
  }, filePath)

  if (result instanceof Error) {
    throw result
  }
}
