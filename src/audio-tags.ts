import { File } from 'node-taglib-sharp'

export interface AudioTagFix {
  album: string
  albumArtists?: string[]
}

export function writeAudioTagFix(filePath: string, tagFix: AudioTagFix): void {
  const audioFile = File.createFromPath(filePath)

  try {
    audioFile.tag.album = tagFix.album

    if (tagFix.albumArtists !== undefined) {
      audioFile.tag.albumArtists = tagFix.albumArtists
    }

    audioFile.save()
  }
  finally {
    audioFile.dispose()
  }
}
