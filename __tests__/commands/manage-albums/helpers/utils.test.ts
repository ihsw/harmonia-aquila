import { Command } from 'commander'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import {
  formatAudioBitrate,
  formatAudioDuration,
  formatAudioSampleRate,
  getAudioFiles,
  getSupportedAudioExtensions,
  isSupportedAudioExtension,
  parseLimit,
} from '../../../../src/commands/manage-albums/helpers/utils.js'
import { createTempDir, createTempFile, removeTempDir } from '../../../test-helpers.js'

function makeCmd(): Command {
  const cmd = new Command()
  cmd.exitOverride()
  return cmd
}

describe('getSupportedAudioExtensions', () => {
  it('returns flac and mp3', () => {
    expect(getSupportedAudioExtensions()).toEqual(['.flac', '.mp3'])
  })
})

describe('isSupportedAudioExtension', () => {
  it('returns true for .flac', () => {
    expect(isSupportedAudioExtension('.flac')).toBe(true)
  })

  it('returns true for .FLAC (case insensitive)', () => {
    expect(isSupportedAudioExtension('.FLAC')).toBe(true)
  })

  it('returns true for .mp3', () => {
    expect(isSupportedAudioExtension('.mp3')).toBe(true)
  })

  it('returns false for .txt', () => {
    expect(isSupportedAudioExtension('.txt')).toBe(false)
  })

  it('returns false for .m4b', () => {
    expect(isSupportedAudioExtension('.m4b')).toBe(false)
  })
})

describe('getAudioFiles', () => {
  let tempDir: string

  beforeEach(async () => {
    tempDir = await createTempDir('audio-files-')
  })

  afterEach(async () => {
    await removeTempDir(tempDir)
  })

  it('returns flac and mp3 files in a directory', async () => {
    await createTempFile(tempDir, 'track01.flac')
    await createTempFile(tempDir, 'track02.mp3')

    const result = await getAudioFiles(makeCmd(), tempDir)
    const names = result.files.map(f => f.name).sort()
    expect(names).toEqual(['track01.flac', 'track02.mp3'])
  })

  it('returns empty file list for empty directory', async () => {
    const result = await getAudioFiles(makeCmd(), tempDir)
    expect(result.files).toHaveLength(0)
  })

  it('throws CommanderError for a non-existing path', async () => {
    await expect(getAudioFiles(makeCmd(), `${tempDir}/nope`)).rejects.toThrow()
  })

  it('throws CommanderError when non-audio file present without ignoreNonAudioFiles', async () => {
    await createTempFile(tempDir, 'track01.flac')
    await createTempFile(tempDir, 'cover.jpg')

    await expect(getAudioFiles(makeCmd(), tempDir)).rejects.toThrow()
  })

  it('ignores non-audio files with ignoreNonAudioFiles option', async () => {
    await createTempFile(tempDir, 'track01.flac')
    await createTempFile(tempDir, 'cover.jpg')

    const result = await getAudioFiles(makeCmd(), tempDir, { ignoreNonAudioFiles: true })
    expect(result.files).toHaveLength(1)
    expect(result.files[0]?.name).toBe('track01.flac')
  })
})

describe('parseLimit', () => {
  it('returns undefined when option is undefined', () => {
    expect(parseLimit(makeCmd(), undefined)).toBeUndefined()
  })

  it('returns the integer value for a valid string', () => {
    expect(parseLimit(makeCmd(), '5')).toBe(5)
  })

  it('returns 0 for "0"', () => {
    expect(parseLimit(makeCmd(), '0')).toBe(0)
  })

  it('throws CommanderError for a non-integer string', () => {
    expect(() => parseLimit(makeCmd(), '1.5')).toThrow()
  })

  it('throws CommanderError for a negative integer', () => {
    expect(() => parseLimit(makeCmd(), '-1')).toThrow()
  })
})

describe('formatAudioDuration', () => {
  it('returns empty string for undefined', () => {
    expect(formatAudioDuration(undefined)).toBe('')
  })

  it('formats seconds only', () => {
    expect(formatAudioDuration(45)).toBe('0:45')
  })

  it('formats minutes and seconds', () => {
    expect(formatAudioDuration(185)).toBe('3:05')
  })

  it('formats hours, minutes, and seconds', () => {
    expect(formatAudioDuration(3723)).toBe('1:02:03')
  })
})

describe('formatAudioBitrate', () => {
  it('returns empty string for undefined', () => {
    expect(formatAudioBitrate(undefined)).toBe('')
  })

  it('formats kbps from bits per second', () => {
    expect(formatAudioBitrate(320000)).toBe('320 kbps')
  })
})

describe('formatAudioSampleRate', () => {
  it('returns empty string for undefined', () => {
    expect(formatAudioSampleRate(undefined)).toBe('')
  })

  it('formats kHz from Hz', () => {
    expect(formatAudioSampleRate(44100)).toBe('44.1 kHz')
  })
})
