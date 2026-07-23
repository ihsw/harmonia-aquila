import { BadRequestException } from '@nestjs/common'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { fixAlbumTags } from '../../src/lib/albums/fix-tags.js'
import { listAlbumSourceDir } from '../../src/lib/albums/list.js'
import { organizeAlbumFiles } from '../../src/lib/albums/organize-files.js'
import { summarizeAlbumSourceDir } from '../../src/lib/albums/summarize-source-dir.js'
import { validateAlbumSourceDir } from '../../src/lib/albums/validate.js'
import { convertAudiobookFiles } from '../../src/lib/audiobooks/convert-file.js'
import { copyAndRenameAudiobook } from '../../src/lib/audiobooks/copy-and-rename.js'
import { crawlAudiobooks } from '../../src/lib/audiobooks/crawl.js'
import { mergeAudiobooks } from '../../src/lib/audiobooks/merge.js'
import { setAudiobookMetadata } from '../../src/lib/audiobooks/set-metadata.js'
import { validateAudiobook } from '../../src/lib/audiobooks/validate.js'
import { UserInputError } from '../../src/lib/errors.js'
import { ManageAlbumsController } from '../../src/web/controllers/manage-albums.controller.js'
import { ManageAudiobooksController } from '../../src/web/controllers/manage-audiobooks.controller.js'
import { normalizeWebRoots, WebPathResolver, type WebRoots } from '../../src/web/providers/path-resolver.js'
import { createTempDir, removeTempDir } from '../test-helpers.js'

vi.mock('../../src/lib/albums/list.js', () => ({
  listAlbumSourceDir: vi.fn(),
}))
vi.mock('../../src/lib/albums/summarize-source-dir.js', () => ({
  summarizeAlbumSourceDir: vi.fn(),
}))
vi.mock('../../src/lib/albums/fix-tags.js', () => ({
  fixAlbumTags: vi.fn(),
}))
vi.mock('../../src/lib/albums/organize-files.js', () => ({
  organizeAlbumFiles: vi.fn(),
}))
vi.mock('../../src/lib/albums/validate.js', () => ({
  validateAlbumSourceDir: vi.fn(),
}))
vi.mock('../../src/lib/audiobooks/validate.js', () => ({
  validateAudiobook: vi.fn(),
}))
vi.mock('../../src/lib/audiobooks/crawl.js', () => ({
  crawlAudiobooks: vi.fn(),
}))
vi.mock('../../src/lib/audiobooks/copy-and-rename.js', () => ({
  copyAndRenameAudiobook: vi.fn(),
}))
vi.mock('../../src/lib/audiobooks/convert-file.js', () => ({
  convertAudiobookFiles: vi.fn(),
}))
vi.mock('../../src/lib/audiobooks/merge.js', () => ({
  mergeAudiobooks: vi.fn(),
}))
vi.mock('../../src/lib/audiobooks/set-metadata.js', () => ({
  setAudiobookMetadata: vi.fn(),
}))

describe('web controllers', () => {
  let albumController: ManageAlbumsController
  let audiobookController: ManageAudiobooksController
  let roots: WebRoots

  beforeEach(async () => {
    roots = await normalizeWebRoots({
      destDir: await createTempDir('web-controller-dest-'),
      sourceDir: await createTempDir('web-controller-source-'),
    })
    const pathResolver = new WebPathResolver(roots)
    albumController = new ManageAlbumsController(pathResolver)
    audiobookController = new ManageAudiobooksController(pathResolver)
    vi.mocked(listAlbumSourceDir).mockReset()
    vi.mocked(summarizeAlbumSourceDir).mockReset()
    vi.mocked(validateAlbumSourceDir).mockReset()
    vi.mocked(fixAlbumTags).mockReset()
    vi.mocked(organizeAlbumFiles).mockReset()
    vi.mocked(validateAudiobook).mockReset()
    vi.mocked(crawlAudiobooks).mockReset()
    vi.mocked(copyAndRenameAudiobook).mockReset()
    vi.mocked(convertAudiobookFiles).mockReset()
    vi.mocked(mergeAudiobooks).mockReset()
    vi.mocked(setAudiobookMetadata).mockReset()
  })

  afterEach(async () => {
    await removeTempDir(roots.destDir)
    await removeTempDir(roots.sourceDir)
  })

  it('maps album GET list query to configured source root', async () => {
    vi.mocked(listAlbumSourceDir).mockResolvedValue(['a.flac', 'sub/'])

    const result = await albumController.list({})

    expect(result).toEqual(['a.flac', 'sub/'])
    expect(listAlbumSourceDir).toHaveBeenCalledWith({ sourceDir: roots.sourceDir })
  })

  it('passes optional prefix to list', async () => {
    vi.mocked(listAlbumSourceDir).mockResolvedValue(['sub/track.flac'])

    await albumController.list({ prefix: 'sub/' })

    expect(listAlbumSourceDir).toHaveBeenCalledWith({ prefix: 'sub/', sourceDir: roots.sourceDir })
  })

  it('rejects non-string prefix before calling list', async () => {
    await expect(albumController.list({ prefix: ['a', 'b'] })).rejects.toBeInstanceOf(BadRequestException)

    expect(listAlbumSourceDir).not.toHaveBeenCalled()
  })

  it('maps list UserInputError to 400', async () => {
    vi.mocked(listAlbumSourceDir).mockRejectedValue(new UserInputError('prefix must end with /'))

    await expect(albumController.list({ prefix: 'bad' })).rejects.toBeInstanceOf(BadRequestException)
  })

  it('maps album GET query parameters to summarize options', async () => {
    vi.mocked(summarizeAlbumSourceDir).mockResolvedValue([{ filename: 'a.flac' } as never])

    const rows = await albumController.summarizeSourceDir({ dirName: 'music', ignoreNonAudioFiles: 'true', limit: '2' })

    expect(rows).toEqual([{ filename: 'a.flac' }])
    expect(summarizeAlbumSourceDir).toHaveBeenCalledWith({
      dirName: path.join(roots.sourceDir, 'music'),
      ignoreNonAudioFiles: true,
      limit: '2',
    })
  })

  it('maps album GET query parameters to validate options', async () => {
    vi.mocked(validateAlbumSourceDir).mockResolvedValue([{ status: 'valid' } as never])

    const rows = await albumController.validate({
      artistFilenameStrategy: 'albumartist',
      dirName: 'music',
      ignoreNonAudioFiles: 'true',
      limit: '2',
      titleFilenameStrategy: 'subtitle',
    })

    expect(rows).toEqual([{ status: 'valid' }])
    expect(validateAlbumSourceDir).toHaveBeenCalledWith({
      artistFilenameStrategy: 'albumartist',
      dirName: path.join(roots.sourceDir, 'music'),
      ignoreNonAudioFiles: true,
      limit: '2',
      titleFilenameStrategy: 'subtitle',
    })
  })

  it('maps album POST bodies to organize options with dry-run default', async () => {
    vi.mocked(organizeAlbumFiles).mockResolvedValue([{ action: 'would copy' } as never])

    await albumController.organizeFiles({})

    expect(organizeAlbumFiles).toHaveBeenCalledWith({
      destDir: roots.destDir,
      sourceDir: roots.sourceDir,
    })
  })

  it('maps album POST bodies to fix-tags options', async () => {
    vi.mocked(fixAlbumTags).mockResolvedValue([{ album: 'A', artist: 'B', title: 'C' }])

    await albumController.fixTags({ albumStrategy: 'grouping' })

    expect(fixAlbumTags).toHaveBeenCalledWith({
      albumStrategy: 'grouping',
      destDir: roots.destDir,
      sourceDir: roots.sourceDir,
    })
  })

  it('rejects album traversal and root override attempts', async () => {
    await expect(albumController.summarizeSourceDir({ dirName: '../escape' })).rejects.toBeInstanceOf(BadRequestException)
    await expect(albumController.validate({ dirName: '../escape' })).rejects.toBeInstanceOf(BadRequestException)
    await expect(albumController.organizeFiles({ destDir: 'override' })).rejects.toBeInstanceOf(BadRequestException)
    await expect(albumController.fixTags({ sourceDir: 'override' })).rejects.toBeInstanceOf(BadRequestException)

    expect(summarizeAlbumSourceDir).not.toHaveBeenCalled()
    expect(validateAlbumSourceDir).not.toHaveBeenCalled()
    expect(organizeAlbumFiles).not.toHaveBeenCalled()
    expect(fixAlbumTags).not.toHaveBeenCalled()
  })

  it('rejects album request contract violations before invoking operations', async () => {
    await expect(albumController.summarizeSourceDir({
      dirName: 'music',
      ignoreNonAudioFiles: 'maybe',
    })).rejects.toBeInstanceOf(BadRequestException)
    await expect(albumController.organizeFiles({ execute: 'maybe' })).rejects.toBeInstanceOf(BadRequestException)
    await expect(albumController.validate({
      dirName: 'music',
      ignoreNonAudioFiles: 'maybe',
    })).rejects.toBeInstanceOf(BadRequestException)

    expect(summarizeAlbumSourceDir).not.toHaveBeenCalled()
    expect(validateAlbumSourceDir).not.toHaveBeenCalled()
    expect(organizeAlbumFiles).not.toHaveBeenCalled()
  })

  it('maps audiobook GET query parameters to validate options', async () => {
    vi.mocked(validateAudiobook).mockResolvedValue([{ valid: true } as never])

    await audiobookController.validate({ fileName: 'books/book.m4b' })

    expect(validateAudiobook).toHaveBeenCalledWith({ fileName: path.join(roots.sourceDir, 'books/book.m4b') })
  })

  it('maps audiobook POST bodies to write-capable operations', async () => {
    vi.mocked(copyAndRenameAudiobook).mockResolvedValue([])
    vi.mocked(convertAudiobookFiles).mockResolvedValue([])
    vi.mocked(mergeAudiobooks).mockResolvedValue([])
    vi.mocked(setAudiobookMetadata).mockResolvedValue([])

    await audiobookController.copyAndRename({ execute: true, fileName: 'book.m4b' })
    await audiobookController.convertFile({ fileName: ['book.mp3', 'disc2/book.mp3'] })
    await audiobookController.merge({})
    await audiobookController.setMetadata({ author: 'A', destFilepath: 'b.m4b', sourceFilepath: 'a.m4b', title: 'T' })

    expect(copyAndRenameAudiobook).toHaveBeenCalledWith({
      destDir: roots.destDir,
      execute: true,
      fileName: path.join(roots.sourceDir, 'book.m4b'),
    })
    expect(convertAudiobookFiles).toHaveBeenCalledWith({
      concurrency: '4',
      destDir: roots.destDir,
      fileName: [path.join(roots.sourceDir, 'book.mp3'), path.join(roots.sourceDir, 'disc2/book.mp3')],
      jobs: '16',
    })
    expect(mergeAudiobooks).toHaveBeenCalledWith({ destDir: roots.destDir, jobs: '16', sourceDir: roots.sourceDir })
    expect(setAudiobookMetadata).toHaveBeenCalledWith({
      author: 'A',
      destFilepath: path.join(roots.destDir, 'b.m4b'),
      sourceFilepath: path.join(roots.sourceDir, 'a.m4b'),
      title: 'T',
    })
  })

  it('rejects audiobook traversal and root override attempts', async () => {
    await expect(audiobookController.validate({ fileName: '../escape.m4b' })).rejects.toBeInstanceOf(BadRequestException)
    await expect(audiobookController.copyAndRename({ destDir: 'override', fileName: 'book.m4b' })).rejects.toBeInstanceOf(BadRequestException)
    await expect(audiobookController.merge({ sourceDir: 'override' })).rejects.toBeInstanceOf(BadRequestException)
    await expect(audiobookController.setMetadata({
      author: 'A',
      destFilepath: '../escape.m4b',
      sourceFilepath: 'a.m4b',
      title: 'T',
    })).rejects.toBeInstanceOf(BadRequestException)

    expect(validateAudiobook).not.toHaveBeenCalled()
    expect(copyAndRenameAudiobook).not.toHaveBeenCalled()
    expect(mergeAudiobooks).not.toHaveBeenCalled()
    expect(setAudiobookMetadata).not.toHaveBeenCalled()
  })

  it('validates every convert-file input before invoking conversion', async () => {
    await expect(audiobookController.convertFile({
      fileName: ['safe.m4b', '../escape.m4b'],
    })).rejects.toBeInstanceOf(BadRequestException)

    expect(convertAudiobookFiles).not.toHaveBeenCalled()
  })

  it('maps convert-file string filename and rejects invalid filename types', async () => {
    vi.mocked(convertAudiobookFiles).mockResolvedValue([])

    await audiobookController.convertFile({ fileName: 'book.mp3' })

    expect(convertAudiobookFiles).toHaveBeenCalledWith({
      concurrency: '4',
      destDir: roots.destDir,
      fileName: [path.join(roots.sourceDir, 'book.mp3')],
      jobs: '16',
    })

    vi.mocked(convertAudiobookFiles).mockReset()

    await expect(audiobookController.convertFile({
      fileName: [123],
    })).rejects.toBeInstanceOf(BadRequestException)
    expect(convertAudiobookFiles).not.toHaveBeenCalled()
  })

  it('maps request validation failures to 400 responses', async () => {
    await expect(audiobookController.validate({})).rejects.toBeInstanceOf(BadRequestException)
  })

  it('maps crawl query parameters to crawl options', async () => {
    vi.mocked(crawlAudiobooks).mockResolvedValue([])

    await audiobookController.crawl({ dirName: 'books' })

    expect(crawlAudiobooks).toHaveBeenCalledWith({ dirName: path.join(roots.sourceDir, 'books') })
  })
})
