import { mkdir, symlink } from 'node:fs/promises'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import {
  getAudioFiles,
  getSupportedAlbumArtExtensions,
} from '../../../src/lib/albums/audio-files.js'
import { createTempDir, createTempFile, removeTempDir } from '../../test-helpers.js'

describe('album-art audio file discovery', () => {
  let sourceDir: string

  beforeEach(async () => {
    sourceDir = await createTempDir('album-art-discovery-')
    await createTempFile(sourceDir, 'track.flac')
  })

  afterEach(async () => {
    await removeTempDir(sourceDir)
  })

  it('classifies every supported extension case-insensitively for organization', async () => {
    const expected = getSupportedAlbumArtExtensions().map(extension => `cover${extension.toUpperCase()}`)

    await Promise.all(expected.map(filename => createTempFile(sourceDir, filename)))
    const result = await getAudioFiles(sourceDir, { acceptAlbumArt: true })

    expect(result.albumArtFiles.map(file => file.name).sort()).toEqual(expected.sort())
    expect(result.files.map(file => file.name)).toEqual(['track.flac'])
  })

  it('keeps album art invalid outside organization mode', async () => {
    await createTempFile(sourceDir, 'cover.jpg')

    await expect(getAudioFiles(sourceDir)).rejects.toThrow('Invalid entries: cover.jpg')
  })

  it('keeps unsupported sidecars strict unless ignore is enabled', async () => {
    await createTempFile(sourceDir, 'cover.jpg')
    await createTempFile(sourceDir, 'notes.txt')

    await expect(getAudioFiles(sourceDir, { acceptAlbumArt: true }))
      .rejects.toThrow('Invalid entries: notes.txt')
    await expect(getAudioFiles(sourceDir, { acceptAlbumArt: true, ignoreNonAudioFiles: true }))
      .resolves.toMatchObject({ albumArtFiles: [{ name: 'cover.jpg' }] })
  })

  it('does not classify image-named directories or symlinks as album art', async () => {
    const target = await createTempFile(sourceDir, 'actual.jpg')

    await mkdir(join(sourceDir, 'folder.png'))
    await symlink(target, join(sourceDir, 'linked.webp'))
    await expect(getAudioFiles(sourceDir, { acceptAlbumArt: true })).rejects.toThrow('folder.png, linked.webp')

    const result = await getAudioFiles(sourceDir, { acceptAlbumArt: true, ignoreNonAudioFiles: true })
    expect(result.albumArtFiles.map(file => file.name)).toEqual(['actual.jpg'])
  })
})
