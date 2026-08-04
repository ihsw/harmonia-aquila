import { BadRequestException } from '@nestjs/common'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { convertAudiobookFiles } from '../../src/lib/audiobooks/convert-file.js'
import { copyAndRenameAudiobook } from '../../src/lib/audiobooks/copy-and-rename.js'
import { crawlAudiobooks } from '../../src/lib/audiobooks/crawl.js'
import { mergeAudiobooks } from '../../src/lib/audiobooks/merge.js'
import { setAudiobookMetadata } from '../../src/lib/audiobooks/set-metadata.js'
import { validateAudiobook } from '../../src/lib/audiobooks/validate.js'
import { ManageAudiobooksController } from '../../src/web/controllers/manage-audiobooks.controller.js'
import { normalizeWebRoots, WebPathResolver, type WebRoots } from '../../src/web/providers/path-resolver.js'
import { createTempDir, removeTempDir } from '../test-helpers.js'

vi.mock('../../src/lib/audiobooks/validate.js', () => ({ validateAudiobook: vi.fn() }))
vi.mock('../../src/lib/audiobooks/crawl.js', () => ({ crawlAudiobooks: vi.fn() }))
vi.mock('../../src/lib/audiobooks/copy-and-rename.js', () => ({ copyAndRenameAudiobook: vi.fn() }))
vi.mock('../../src/lib/audiobooks/convert-file.js', () => ({ convertAudiobookFiles: vi.fn() }))
vi.mock('../../src/lib/audiobooks/merge.js', () => ({ mergeAudiobooks: vi.fn() }))
vi.mock('../../src/lib/audiobooks/set-metadata.js', () => ({ setAudiobookMetadata: vi.fn() }))

describe('audiobook web controller', () => {
  let controller: ManageAudiobooksController
  let roots: WebRoots

  beforeEach(async () => {
    roots = await normalizeWebRoots({
      destDir: await createTempDir('web-controller-dest-'),
      sourceDir: await createTempDir('web-controller-source-'),
    })
    controller = new ManageAudiobooksController(new WebPathResolver(roots))
    vi.clearAllMocks()
  })

  afterEach(async () => {
    await removeTempDir(roots.destDir)
    await removeTempDir(roots.sourceDir)
  })

  it('maps GET query parameters to audiobook operations', async () => {
    vi.mocked(validateAudiobook).mockResolvedValue([{ valid: true } as never])
    vi.mocked(crawlAudiobooks).mockResolvedValue([])

    await controller.validate({ fileName: 'books/book.m4b' })
    await controller.crawl({ dirName: 'books' })

    expect(validateAudiobook).toHaveBeenCalledWith({ fileName: path.join(roots.sourceDir, 'books/book.m4b') })
    expect(crawlAudiobooks).toHaveBeenCalledWith({ dirName: path.join(roots.sourceDir, 'books') })
  })

  it('maps POST bodies to write-capable operations', async () => {
    vi.mocked(copyAndRenameAudiobook).mockResolvedValue([])
    vi.mocked(convertAudiobookFiles).mockResolvedValue([])
    vi.mocked(mergeAudiobooks).mockResolvedValue([])
    vi.mocked(setAudiobookMetadata).mockResolvedValue([])

    await controller.copyAndRename({ execute: true, fileName: 'book.m4b' })
    await controller.convertFile({ fileName: ['book.mp3', 'disc2/book.mp3'] })
    await controller.merge({})
    await controller.setMetadata({ author: 'A', destFilepath: 'b.m4b', sourceFilepath: 'a.m4b', title: 'T' })

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

  it('rejects traversal and root override attempts', async () => {
    await expect(controller.validate({ fileName: '../escape.m4b' })).rejects.toBeInstanceOf(BadRequestException)
    await expect(controller.copyAndRename({ destDir: 'override', fileName: 'book.m4b' })).rejects.toBeInstanceOf(BadRequestException)
    await expect(controller.merge({ sourceDir: 'override' })).rejects.toBeInstanceOf(BadRequestException)
    await expect(controller.setMetadata({
      author: 'A', destFilepath: '../escape.m4b', sourceFilepath: 'a.m4b', title: 'T',
    })).rejects.toBeInstanceOf(BadRequestException)

    expect(validateAudiobook).not.toHaveBeenCalled()
    expect(copyAndRenameAudiobook).not.toHaveBeenCalled()
    expect(mergeAudiobooks).not.toHaveBeenCalled()
    expect(setAudiobookMetadata).not.toHaveBeenCalled()
  })

  it('validates conversion inputs and maps string filenames', async () => {
    await expect(controller.convertFile({ fileName: ['safe.m4b', '../escape.m4b'] })).rejects.toBeInstanceOf(BadRequestException)
    expect(convertAudiobookFiles).not.toHaveBeenCalled()

    vi.mocked(convertAudiobookFiles).mockResolvedValue([])
    await controller.convertFile({ fileName: 'book.mp3' })
    expect(convertAudiobookFiles).toHaveBeenCalledWith({
      concurrency: '4', destDir: roots.destDir, fileName: [path.join(roots.sourceDir, 'book.mp3')], jobs: '16',
    })

    vi.mocked(convertAudiobookFiles).mockReset()
    await expect(controller.convertFile({ fileName: [123] })).rejects.toBeInstanceOf(BadRequestException)
    expect(convertAudiobookFiles).not.toHaveBeenCalled()
  })

  it('maps request validation failures to 400 responses', async () => {
    await expect(controller.validate({})).rejects.toBeInstanceOf(BadRequestException)
  })
})
