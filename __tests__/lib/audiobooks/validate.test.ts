import { parseFile } from 'music-metadata'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { validateAudiobook } from '../../../src/lib/audiobooks/validate.js'
import { createTempDir, createTempFile, makeAudioMetadata, removeTempDir } from '../../test-helpers.js'

vi.mock('music-metadata', () => ({
  parseFile: vi.fn(),
}))

describe('validateAudiobook', () => {
  let tempDir: string

  beforeEach(async () => {
    tempDir = await createTempDir('lib-validate-')
    vi.mocked(parseFile).mockReset()
  })

  afterEach(async () => {
    await removeTempDir(tempDir)
    vi.restoreAllMocks()
  })

  it('returns a valid row when filename matches metadata', async () => {
    const fileName = await createTempFile(tempDir, 'Author - Title.m4b')
    vi.mocked(parseFile).mockResolvedValue(makeAudioMetadata({ album: 'Title', artist: 'Author' }))

    const rows = await validateAudiobook({ fileName })

    expect(rows).toEqual([{ filename: 'Author - Title.m4b', performer: 'Author', title: 'Title', valid: true }])
  })
})
