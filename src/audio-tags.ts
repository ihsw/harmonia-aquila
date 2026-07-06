import {
  File,
  Id3v2FrameClassType,
  Id3v2FrameIdentifiers,
  Id3v2Tag,
  type Id3v2TextInformationFrame,
  TagTypes,
  XiphComment,
} from 'node-taglib-sharp'
import { extname } from 'node:path'

export interface AudioTagFix {
  album?: string
  albumArtists?: string[]
  producers?: string[]
}

function writeProducers(audioFile: File, filePath: string, producers: string[]): void {
  const extension = extname(filePath).toLowerCase()

  if (extension === '.mp3') {
    writeId3v2Producers(audioFile, producers)
    return
  }

  if (extension === '.flac') {
    writeXiphProducers(audioFile, producers)
  }
}

function writeId3v2Producers(audioFile: File, producers: string[]): void {
  const id3v2Tag = audioFile.getTag(TagTypes.Id3v2, true)

  if (id3v2Tag instanceof Id3v2Tag) {
    const involvedPeopleFrame = Id3v2FrameIdentifiers.TIPL

    if (involvedPeopleFrame === undefined) {
      throw new Error('node-taglib-sharp does not expose the ID3v2 TIPL frame identifier')
    }

    const existingInvolvedPeople = id3v2Tag
      .getFramesByIdentifier<Id3v2TextInformationFrame>(Id3v2FrameClassType.TextInformationFrame, involvedPeopleFrame)
      .flatMap(frame => frame.text)
    const involvedPeople = replaceRoleInInvolvedPeople(existingInvolvedPeople, 'producer', producers)

    id3v2Tag.setTextFrame(involvedPeopleFrame, ...involvedPeople)
  }
}

function replaceRoleInInvolvedPeople(involvedPeople: string[], roleToReplace: string, values: string[]): string[] {
  const roleToReplaceLowercase = roleToReplace.toLowerCase()
  const updatedInvolvedPeople: string[] = []

  for (let index = 0; index < involvedPeople.length; index += 2) {
    const role = involvedPeople[index]
    const value = involvedPeople[index + 1]

    if (role === undefined || role.toLowerCase() === roleToReplaceLowercase) {
      continue
    }

    updatedInvolvedPeople.push(role)

    if (value !== undefined) {
      updatedInvolvedPeople.push(value)
    }
  }

  updatedInvolvedPeople.push(...values.flatMap(value => [roleToReplace, value]))

  return updatedInvolvedPeople
}

function writeXiphProducers(audioFile: File, producers: string[]): void {
  const xiphComment = audioFile.getTag(TagTypes.Xiph, true)

  if (xiphComment instanceof XiphComment) {
    xiphComment.setFieldAsStrings('PRODUCER', ...producers)
  }
}

export function writeAudioTagFix(filePath: string, tagFix: AudioTagFix): void {
  const audioFile = File.createFromPath(filePath)

  try {
    if (tagFix.album !== undefined) {
      audioFile.tag.album = tagFix.album
    }

    if (tagFix.albumArtists !== undefined) {
      audioFile.tag.albumArtists = tagFix.albumArtists
    }

    if (tagFix.producers !== undefined) {
      writeProducers(audioFile, filePath, tagFix.producers)
    }

    audioFile.save()
  }
  finally {
    audioFile.dispose()
  }
}
