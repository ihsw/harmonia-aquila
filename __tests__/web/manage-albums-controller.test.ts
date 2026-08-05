import { BadRequestException } from '@nestjs/common'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { listAlbumSourceDir } from '../../src/lib/albums/list.js'
import { organizeAlbumFiles } from '../../src/lib/albums/organize-files.js'
import { summarizeAlbumSourceDir } from '../../src/lib/albums/summarize-source-dir.js'
import { validateAlbumSourceDir } from '../../src/lib/albums/validate.js'
import { UserInputError } from '../../src/lib/errors.js'
import { ManageAlbumsController } from '../../src/web/controllers/manage-albums.controller.js'
import { normalizeWebRoots, WebPathResolver, type WebRoots } from '../../src/web/providers/path-resolver.js'
import { createTempDir, removeTempDir } from '../test-helpers.js'

vi.mock('../../src/lib/albums/list.js', () => ({ listAlbumSourceDir: vi.fn() }))
vi.mock('../../src/lib/albums/summarize-source-dir.js', () => ({ summarizeAlbumSourceDir: vi.fn() }))
vi.mock('../../src/lib/albums/organize-files.js', () => ({ organizeAlbumFiles: vi.fn() }))
vi.mock('../../src/lib/albums/validate.js', () => ({ validateAlbumSourceDir: vi.fn() }))

describe('album web controller', () => {
  let controller: ManageAlbumsController
  let roots: WebRoots

  beforeEach(async () => {
    roots = await normalizeWebRoots({
      destDir: await createTempDir('web-controller-dest-'),
      sourceDir: await createTempDir('web-controller-source-'),
    })
    controller = new ManageAlbumsController(new WebPathResolver(roots))
    vi.clearAllMocks()
  })

  afterEach(async () => {
    await removeTempDir(roots.destDir)
    await removeTempDir(roots.sourceDir)
  })

  it('selects the album list root and preserves prefixes', async () => {
    vi.mocked(listAlbumSourceDir).mockResolvedValue(['sub/track.flac'])

    await controller.list({})
    await controller.list({ prefix: 'sub/' })

    expect(listAlbumSourceDir).toHaveBeenNthCalledWith(1, { sourceDir: roots.sourceDir })
    expect(listAlbumSourceDir).toHaveBeenNthCalledWith(2, { prefix: 'sub/', sourceDir: roots.sourceDir })
  })

  it('rejects invalid list query values and maps domain errors', async () => {
    await expect(controller.list({ prefix: ['a', 'b'] })).rejects.toBeInstanceOf(BadRequestException)
    vi.mocked(listAlbumSourceDir).mockRejectedValue(new UserInputError('prefix must end with /'))
    await expect(controller.list({ prefix: 'bad' })).rejects.toBeInstanceOf(BadRequestException)
  })

  it('maps summarize and validate query parameters', async () => {
    vi.mocked(summarizeAlbumSourceDir).mockResolvedValue([])
    vi.mocked(validateAlbumSourceDir).mockResolvedValue([])

    await controller.summarizeSourceDir({ dirName: 'music', ignoreNonAudioFiles: 'true', limit: '2' })
    await controller.validate({
      artistFilenameStrategy: 'albumartist', dirName: 'music', ignoreNonAudioFiles: 'true', limit: '2',
      titleFilenameStrategy: 'subtitle',
    })

    expect(summarizeAlbumSourceDir).toHaveBeenCalledWith({
      dirName: path.join(roots.sourceDir, 'music'), ignoreNonAudioFiles: true, limit: '2',
    })
    expect(validateAlbumSourceDir).toHaveBeenCalledWith({
      artistFilenameStrategy: 'albumartist', dirName: path.join(roots.sourceDir, 'music'),
      ignoreNonAudioFiles: true, limit: '2', titleFilenameStrategy: 'subtitle',
    })
  })

  it('maps organize options with dry-run and destination defaults', async () => {
    const artRows = [{
      action: 'would copy', destination: 'Artist/Album/cover.jpg', fileType: 'albumArt', filename: 'cover.jpg',
    }] as const
    vi.mocked(organizeAlbumFiles).mockResolvedValue([...artRows])

    const result = await controller.organizeFiles({})

    expect(organizeAlbumFiles).toHaveBeenCalledWith({
      destDir: roots.destDir, sourceDir: roots.sourceDir,
    })
    expect(result).toEqual(artRows)
  })

  it('maps albumDirs and albumArtStrategy through the source root', async () => {
    const row = {
      action: 'would copy', album: 'Album', artistFilename: 'Artist', artistFilenameStrategy: 'artist',
      destination: 'Artist/Album/01 - Second.flac', discNumber: '02', discTotal: '02', fileType: 'audio',
      filename: '01.flac', sourceDirectory: '/music/disc-2', tagChanges: {
        album: 'Album', artist: 'Artist', newDiscNumber: 2, newDiscTotal: 2, title: 'Second',
      },
      titleFilename: 'Second', titleFilenameStrategy: 'title', trackNumber: '01',
    } as const
    vi.mocked(organizeAlbumFiles).mockResolvedValue([row])

    const result = await controller.organizeFiles({
      albumArtStrategy: 'last',
      albumDirs: ['disc-1', 'disc-2'],
      discStrategy: 'concatenate',
    })

    expect(organizeAlbumFiles).toHaveBeenCalledWith({
      albumArtStrategy: 'last',
      destDir: roots.destDir,
      discStrategy: 'concatenate',
      sourceDirs: [path.join(roots.sourceDir, 'disc-1'), path.join(roots.sourceDir, 'disc-2')],
    })
    expect(result).toEqual([row])
  })

  it('maps albumDirs together with setMetadata through organize-files', async () => {
    vi.mocked(organizeAlbumFiles).mockResolvedValue([])
    const setMetadata = [
      { album: 'Album', artist: 'Artist', filename: 'one.flac', title: 'One', trackNumber: 1 },
      { album: 'Album', artist: 'Artist', filename: 'two.flac', title: 'Two', trackNumber: 1 },
    ]

    await controller.organizeFiles({
      albumDirs: ['disc-1', 'disc-2'],
      discStrategy: 'concatenate',
      setMetadata,
    })

    expect(organizeAlbumFiles).toHaveBeenCalledWith({
      destDir: roots.destDir,
      discStrategy: 'concatenate',
      setMetadataRecords: setMetadata,
      sourceDirs: [path.join(roots.sourceDir, 'disc-1'), path.join(roots.sourceDir, 'disc-2')],
    })
  })

  it('passes setMetadata sourceIndex through to the core and surfaces its errors as 400', async () => {
    vi.mocked(organizeAlbumFiles).mockResolvedValue([])
    const setMetadata = [
      { album: 'Album', artist: 'Artist', filename: 'track.flac', sourceIndex: 1, title: 'One', trackNumber: 1 },
      { album: 'Album', artist: 'Artist', filename: 'track.flac', sourceIndex: 2, title: 'Two', trackNumber: 1 },
    ]

    await controller.organizeFiles({ albumDirs: ['disc-1', 'disc-2'], discStrategy: 'concatenate', setMetadata })

    expect(organizeAlbumFiles).toHaveBeenCalledWith(expect.objectContaining({ setMetadataRecords: setMetadata }))
    vi.mocked(organizeAlbumFiles).mockRejectedValue(
      new UserInputError('--set-metadata sourceIndex is out of range (expected 1..2): "track.flac" (3)'),
    )
    await expect(controller.organizeFiles({ albumDirs: ['disc-1', 'disc-2'], setMetadata })).rejects.toMatchObject({
      response: { error: 'Bad Request', statusCode: 400 },
    })
  })

  it('rejects a malformed setMetadata sourceIndex at the schema boundary', async () => {
    await expect(controller.organizeFiles({ setMetadata: [{
      album: 'Album', artist: 'Artist', filename: 'track.flac', sourceIndex: 0, title: 'Title', trackNumber: 1,
    }] })).rejects.toBeInstanceOf(BadRequestException)
    await expect(controller.organizeFiles({ setMetadata: [{
      album: 'Album', artist: 'Artist', filename: 'track.flac', sourceIndex: 1.5, title: 'Title', trackNumber: 1,
    }] })).rejects.toBeInstanceOf(BadRequestException)
    expect(organizeAlbumFiles).not.toHaveBeenCalled()
  })

  it('maps metadata repair fields through organize-files', async () => {
    vi.mocked(organizeAlbumFiles).mockResolvedValue([])
    const setMetadata = [{
      album: 'Album', artist: 'Artist', filename: 'track.flac', title: 'Title', trackNumber: 1,
    }]
    await controller.organizeFiles({ execute: true, setMetadata })
    expect(organizeAlbumFiles).toHaveBeenCalledWith({
      destDir: roots.destDir, execute: true, setMetadataRecords: setMetadata, sourceDir: roots.sourceDir,
    })
  })

  it('maps organize domain conflicts to 400', async () => {
    vi.mocked(organizeAlbumFiles).mockRejectedValue(new UserInputError('Multiple albums found: A, B'))
    await expect(controller.organizeFiles({})).rejects.toMatchObject({
      response: { error: 'Bad Request', message: 'Multiple albums found: A, B', statusCode: 400 },
    })
  })

  it('rejects traversal, root overrides, and contract violations', async () => {
    await expect(controller.summarizeSourceDir({ dirName: '../escape' })).rejects.toBeInstanceOf(BadRequestException)
    await expect(controller.validate({ dirName: '../escape' })).rejects.toBeInstanceOf(BadRequestException)
    await expect(controller.organizeFiles({ destDir: 'override' })).rejects.toBeInstanceOf(BadRequestException)
    await expect(controller.organizeFiles({ sourceDir: 'override' })).rejects.toBeInstanceOf(BadRequestException)
    await expect(controller.organizeFiles({ albumDirs: ['../escape', 'safe'] })).rejects.toBeInstanceOf(BadRequestException)
    await expect(controller.organizeFiles({ execute: 'maybe' })).rejects.toBeInstanceOf(BadRequestException)
    await expect(controller.organizeFiles({ setMetadata: 'metadata.json' })).rejects.toBeInstanceOf(BadRequestException)
    await expect(controller.organizeFiles({ setMetadata: [] })).rejects.toBeInstanceOf(BadRequestException)
    await expect(controller.organizeFiles({ setMetadata: [{
      album: 'Album', artist: 'Artist', filename: '../track.flac', title: 'Title', trackNumber: 1,
    }] })).rejects.toBeInstanceOf(BadRequestException)
    expect(summarizeAlbumSourceDir).not.toHaveBeenCalled()
    expect(validateAlbumSourceDir).not.toHaveBeenCalled()
    expect(organizeAlbumFiles).not.toHaveBeenCalled()
  })
})
