import { File } from 'node-taglib-sharp'

export interface AudioTagFix {
  album: string
  title: string
}

export function writeAudioTagFix(filePath: string, tagFix: AudioTagFix): void {
  const audioFile = File.createFromPath(filePath)

  try {
    audioFile.tag.album = tagFix.album
    audioFile.tag.title = tagFix.title
    audioFile.save()
  }
  finally {
    audioFile.dispose()
  }
}
