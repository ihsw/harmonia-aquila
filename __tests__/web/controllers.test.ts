import { BadRequestException } from '@nestjs/common'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { fixAlbumTags } from '../../src/lib/albums/fix-tags.js'
import { organizeAlbumFiles } from '../../src/lib/albums/organize-files.js'
import { summarizeAlbumSourceDir } from '../../src/lib/albums/summarize-source-dir.js'
import { convertAudiobookFiles } from '../../src/lib/audiobooks/convert-file.js'
import { copyAndRenameAudiobook } from '../../src/lib/audiobooks/copy-and-rename.js'
import { crawlAudiobooks } from '../../src/lib/audiobooks/crawl.js'
import { mergeAudiobooks } from '../../src/lib/audiobooks/merge.js'
import { setAudiobookMetadata } from '../../src/lib/audiobooks/set-metadata.js'
import { validateAudiobook } from '../../src/lib/audiobooks/validate.js'
import { ManageAlbumsController } from '../../src/web/manage-albums.controller.js'
import { ManageAudiobooksController } from '../../src/web/manage-audiobooks.controller.js'

vi.mock('../../src/lib/albums/summarize-source-dir.js', () => ({
  summarizeAlbumSourceDir: vi.fn(),
}))
vi.mock('../../src/lib/albums/fix-tags.js', () => ({
  fixAlbumTags: vi.fn(),
}))
vi.mock('../../src/lib/albums/organize-files.js', () => ({
  organizeAlbumFiles: vi.fn(),
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
  const albumController = new ManageAlbumsController()
  const audiobookController = new ManageAudiobooksController()

  beforeEach(() => {
    vi.mocked(summarizeAlbumSourceDir).mockReset()
    vi.mocked(fixAlbumTags).mockReset()
    vi.mocked(organizeAlbumFiles).mockReset()
    vi.mocked(validateAudiobook).mockReset()
    vi.mocked(crawlAudiobooks).mockReset()
    vi.mocked(copyAndRenameAudiobook).mockReset()
    vi.mocked(convertAudiobookFiles).mockReset()
    vi.mocked(mergeAudiobooks).mockReset()
    vi.mocked(setAudiobookMetadata).mockReset()
  })

  it('maps album GET query parameters to summarize options', async () => {
    vi.mocked(summarizeAlbumSourceDir).mockResolvedValue([{ filename: 'a.flac' } as never])

    const rows = await albumController.summarizeSourceDir({ dirName: '/music', ignoreNonAudioFiles: 'true', limit: '2' })

    expect(rows).toEqual([{ filename: 'a.flac' }])
    expect(summarizeAlbumSourceDir).toHaveBeenCalledWith({
      dirName: '/music',
      ignoreNonAudioFiles: true,
      limit: '2',
    })
  })

  it('maps album POST bodies to organize options with dry-run default', async () => {
    vi.mocked(organizeAlbumFiles).mockResolvedValue([{ action: 'would copy' } as never])

    await albumController.organizeFiles({ destDir: '/dst', sourceDir: '/src' })

    expect(organizeAlbumFiles).toHaveBeenCalledWith({
      destDir: '/dst',
      sourceDir: '/src',
    })
  })

  it('maps album POST bodies to fix-tags options', async () => {
    vi.mocked(fixAlbumTags).mockResolvedValue([{ album: 'A', artist: 'B', title: 'C' }])

    await albumController.fixTags({ albumStrategy: 'grouping', destDir: '/dst', sourceDir: '/src' })

    expect(fixAlbumTags).toHaveBeenCalledWith({
      albumStrategy: 'grouping',
      destDir: '/dst',
      sourceDir: '/src',
    })
  })

  it('maps audiobook GET query parameters to validate options', async () => {
    vi.mocked(validateAudiobook).mockResolvedValue([{ valid: true } as never])

    await audiobookController.validate({ fileName: '/books/book.m4b' })

    expect(validateAudiobook).toHaveBeenCalledWith({ fileName: '/books/book.m4b' })
  })

  it('maps audiobook POST bodies to write-capable operations', async () => {
    vi.mocked(copyAndRenameAudiobook).mockResolvedValue([])
    vi.mocked(convertAudiobookFiles).mockResolvedValue([])
    vi.mocked(mergeAudiobooks).mockResolvedValue([])
    vi.mocked(setAudiobookMetadata).mockResolvedValue([])

    await audiobookController.copyAndRename({ destDir: '/dst', execute: true, fileName: '/book.m4b' })
    await audiobookController.convertFile({ destDir: '/dst', fileName: ['/book.mp3'] })
    await audiobookController.merge({ destDir: '/dst', sourceDir: '/src' })
    await audiobookController.setMetadata({ author: 'A', destFilepath: '/b.m4b', sourceFilepath: '/a.m4b', title: 'T' })

    expect(copyAndRenameAudiobook).toHaveBeenCalledWith({ destDir: '/dst', execute: true, fileName: '/book.m4b' })
    expect(convertAudiobookFiles).toHaveBeenCalledWith({ concurrency: '4', destDir: '/dst', fileName: ['/book.mp3'], jobs: '16' })
    expect(mergeAudiobooks).toHaveBeenCalledWith({ destDir: '/dst', jobs: '16', sourceDir: '/src' })
    expect(setAudiobookMetadata).toHaveBeenCalledWith({ author: 'A', destFilepath: '/b.m4b', sourceFilepath: '/a.m4b', title: 'T' })
  })

  it('maps request validation failures to 400 responses', async () => {
    await expect(audiobookController.validate({})).rejects.toBeInstanceOf(BadRequestException)
  })

  it('maps crawl query parameters to crawl options', async () => {
    vi.mocked(crawlAudiobooks).mockResolvedValue([])

    await audiobookController.crawl({ dirName: '/books' })

    expect(crawlAudiobooks).toHaveBeenCalledWith({ dirName: '/books' })
  })
})
