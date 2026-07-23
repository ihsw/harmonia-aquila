import { mkdir, symlink } from 'node:fs/promises'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { listAlbumSourceDir } from '../../../src/lib/albums/list.js'
import { UserInputError } from '../../../src/lib/errors.js'
import { createTempDir, createTempFile, removeTempDir } from '../../test-helpers.js'

describe('listAlbumSourceDir', () => {
  let tempDir: string

  beforeEach(async () => {
    tempDir = await createTempDir('lib-list-albums-')
  })

  afterEach(async () => {
    await removeTempDir(tempDir)
  })

  it('returns sorted root entries with directory suffixes', async () => {
    await createTempFile(tempDir, 'b.flac')
    await createTempFile(tempDir, 'a.mp3')
    await mkdir(join(tempDir, 'subdir'))

    const result = await listAlbumSourceDir({ sourceDir: tempDir })

    expect(result).toEqual(['a.mp3', 'b.flac', 'subdir/'])
  })

  it('returns only immediate entries without recursing', async () => {
    await mkdir(join(tempDir, 'subdir'))
    await createTempFile(tempDir, 'root.flac')
    await createTempFile(join(tempDir, 'subdir'), 'nested.flac')

    const result = await listAlbumSourceDir({ sourceDir: tempDir })

    expect(result).toEqual(['root.flac', 'subdir/'])
  })

  it('returns source-root-relative entries for a nested prefix', async () => {
    await mkdir(join(tempDir, 'subdir'))
    await createTempFile(join(tempDir, 'subdir'), 'track.flac')
    await createTempFile(join(tempDir, 'subdir'), 'cover.jpg')

    const result = await listAlbumSourceDir({ prefix: 'subdir/', sourceDir: tempDir })

    expect(result).toEqual(['subdir/cover.jpg', 'subdir/track.flac'])
  })

  it('allows an in-root directory whose name begins with two periods', async () => {
    await mkdir(join(tempDir, '..albums'))
    await createTempFile(join(tempDir, '..albums'), 'track.flac')

    const result = await listAlbumSourceDir({ prefix: '..albums/', sourceDir: tempDir })

    expect(result).toEqual(['..albums/track.flac'])
  })

  it('returns entries in lexical sort order', async () => {
    await createTempFile(tempDir, 'z.mp3')
    await createTempFile(tempDir, 'a.flac')
    await createTempFile(tempDir, 'm.txt')

    const result = await listAlbumSourceDir({ sourceDir: tempDir })

    expect(result).toEqual(['a.flac', 'm.txt', 'z.mp3'])
  })

  it('includes files of arbitrary extensions without filtering', async () => {
    await createTempFile(tempDir, 'image.jpg')
    await createTempFile(tempDir, 'notes.txt')
    await createTempFile(tempDir, 'track.flac')

    const result = await listAlbumSourceDir({ sourceDir: tempDir })

    expect(result).toEqual(['image.jpg', 'notes.txt', 'track.flac'])
  })

  it('returns an empty array for an empty directory', async () => {
    const result = await listAlbumSourceDir({ sourceDir: tempDir })

    expect(result).toEqual([])
  })

  it('throws UserInputError for an absolute prefix', async () => {
    await expect(
      listAlbumSourceDir({ prefix: '/etc/', sourceDir: tempDir }),
    ).rejects.toThrow(UserInputError)
  })

  it('throws UserInputError for a prefix containing NUL', async () => {
    await expect(
      listAlbumSourceDir({ prefix: 'sub\0dir/', sourceDir: tempDir }),
    ).rejects.toThrow(UserInputError)
  })

  it('throws UserInputError for a prefix missing a trailing slash', async () => {
    await expect(
      listAlbumSourceDir({ prefix: 'subdir', sourceDir: tempDir }),
    ).rejects.toThrow(UserInputError)
  })

  it('throws UserInputError for a traversal prefix', async () => {
    await expect(
      listAlbumSourceDir({ prefix: '../outside/', sourceDir: tempDir }),
    ).rejects.toThrow(UserInputError)
  })

  it('throws UserInputError for a non-empty prefix that resolves to the root', async () => {
    await expect(
      listAlbumSourceDir({ prefix: './', sourceDir: tempDir }),
    ).rejects.toThrow(UserInputError)
  })

  it('throws UserInputError for a missing source directory', async () => {
    await expect(
      listAlbumSourceDir({ sourceDir: join(tempDir, 'nonexistent') }),
    ).rejects.toThrow(UserInputError)
  })

  it('throws UserInputError when source directory is a file', async () => {
    const filePath = await createTempFile(tempDir, 'file.flac')

    await expect(
      listAlbumSourceDir({ sourceDir: filePath }),
    ).rejects.toThrow(UserInputError)
  })

  it('throws UserInputError for a missing prefix directory', async () => {
    await expect(
      listAlbumSourceDir({ prefix: 'nonexistent/', sourceDir: tempDir }),
    ).rejects.toThrow(UserInputError)
  })

  it('throws UserInputError for a symlink escape', async () => {
    const outsideDir = await createTempDir('outside-')
    try {
      await symlink(outsideDir, join(tempDir, 'escape'))

      await expect(
        listAlbumSourceDir({ prefix: 'escape/', sourceDir: tempDir }),
      ).rejects.toThrow(UserInputError)
    }
    finally {
      await removeTempDir(outsideDir)
    }
  })
})
