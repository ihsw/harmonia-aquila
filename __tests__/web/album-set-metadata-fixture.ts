import type { AlbumSetMetadataRecord } from '../../src/web/schemas/album-set-metadata.js'

export function makeWholeAlbumMetadataRecords(): AlbumSetMetadataRecord[] {
  return Array.from({ length: 35 }, (_, index) => {
    const trackNumber = index + 1
    const filename = trackNumber <= 33
      ? `${trackNumber.toString().padStart(2, '0')}.track.mp3`
      : `Extra - Remix ${String(trackNumber - 33)}.mp3`

    return {
      album: 'Requiem For A Dream',
      artist: 'Clint Mansell',
      filename,
      title: trackNumber <= 33 ? `Track ${String(trackNumber)}` : `Remix ${String(trackNumber - 33)}`,
      trackNumber,
    }
  })
}
