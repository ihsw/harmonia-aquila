import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { convertAudiobookFiles } from '../../../src/lib/audiobooks/convert-file.js'
import { copyAndRenameAudiobook } from '../../../src/lib/audiobooks/copy-and-rename.js'
import { crawlAudiobooks } from '../../../src/lib/audiobooks/crawl.js'
import { mergeAudiobooks } from '../../../src/lib/audiobooks/merge.js'
import { setAudiobookMetadata } from '../../../src/lib/audiobooks/set-metadata.js'
import { validateAudiobook } from '../../../src/lib/audiobooks/validate.js'
import { AudiobookResolver } from '../../../src/web/modules/graphql/audiobook.resolver.js'
import { WebPathResolver, type WebRoots } from '../../../src/web/providers/path-resolver.js'
import { createTempDir, removeTempDir } from '../../test-helpers.js'

vi.mock('../../../src/lib/audiobooks/convert-file.js', () => ({ convertAudiobookFiles: vi.fn() }))
vi.mock('../../../src/lib/audiobooks/copy-and-rename.js', () => ({ copyAndRenameAudiobook: vi.fn() }))
vi.mock('../../../src/lib/audiobooks/crawl.js', () => ({ crawlAudiobooks: vi.fn() }))
vi.mock('../../../src/lib/audiobooks/merge.js', () => ({ mergeAudiobooks: vi.fn() }))
vi.mock('../../../src/lib/audiobooks/set-metadata.js', () => ({ setAudiobookMetadata: vi.fn() }))
vi.mock('../../../src/lib/audiobooks/validate.js', () => ({ validateAudiobook: vi.fn() }))

describe('AudiobookResolver', () => {
  let resolver: AudiobookResolver
  let roots: WebRoots

  beforeEach(async () => {
    roots = {
      destDir: await createTempDir('graphql-audiobook-dest-'),
      sourceDir: await createTempDir('graphql-audiobook-source-'),
    }
    resolver = new AudiobookResolver(new WebPathResolver(roots))
    vi.mocked(convertAudiobookFiles).mockReset()
    vi.mocked(copyAndRenameAudiobook).mockReset()
    vi.mocked(crawlAudiobooks).mockReset()
    vi.mocked(mergeAudiobooks).mockReset()
    vi.mocked(setAudiobookMetadata).mockReset()
    vi.mocked(validateAudiobook).mockReset()
  })

  afterEach(async () => {
    await removeTempDir(roots.destDir)
    await removeTempDir(roots.sourceDir)
  })

  it('maps query inputs through the source root', async () => {
    vi.mocked(crawlAudiobooks).mockResolvedValue([])
    vi.mocked(validateAudiobook).mockResolvedValue([])

    await resolver.audiobookValidate({ fileName: 'book.m4b' })
    await resolver.audiobookCrawl({ dirName: 'books' })

    expect(validateAudiobook).toHaveBeenCalledWith({ fileName: path.join(roots.sourceDir, 'book.m4b') })
    expect(crawlAudiobooks).toHaveBeenCalledWith({ dirName: path.join(roots.sourceDir, 'books') })
  })

  it('maps mutations, root-bound paths, and existing defaults', async () => {
    vi.mocked(convertAudiobookFiles).mockResolvedValue([])
    vi.mocked(copyAndRenameAudiobook).mockResolvedValue([])
    vi.mocked(mergeAudiobooks).mockResolvedValue([])
    vi.mocked(setAudiobookMetadata).mockResolvedValue([])

    await resolver.audiobookCopyAndRename({ fileName: 'book.m4b' })
    await resolver.audiobookConvertFiles({ fileNames: ['first.mp3', 'second.mp3'] })
    await resolver.audiobookMerge({})
    await resolver.audiobookSetMetadata({
      author: 'Author',
      destFilepath: 'dest.m4b',
      sourceFilepath: 'source.m4b',
      title: 'Title',
    })

    expect(copyAndRenameAudiobook).toHaveBeenCalledWith({
      destDir: roots.destDir,
      fileName: path.join(roots.sourceDir, 'book.m4b'),
    })
    expect(convertAudiobookFiles).toHaveBeenCalledWith({
      concurrency: '4',
      destDir: roots.destDir,
      fileName: [path.join(roots.sourceDir, 'first.mp3'), path.join(roots.sourceDir, 'second.mp3')],
      jobs: '16',
    })
    expect(mergeAudiobooks).toHaveBeenCalledWith({ destDir: roots.destDir, jobs: '16', sourceDir: roots.sourceDir })
    expect(setAudiobookMetadata).toHaveBeenCalledWith({
      author: 'Author',
      destFilepath: path.join(roots.destDir, 'dest.m4b'),
      sourceFilepath: path.join(roots.sourceDir, 'source.m4b'),
      title: 'Title',
    })
  })
})
