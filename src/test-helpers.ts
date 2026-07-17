import type { IAudioMetadata, ICommonTagsResult, IFormat } from 'music-metadata'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

export async function createTempDir(prefix = 'test-'): Promise<string> {
  const scratchBase = join(tmpdir(), 'harmonia-aquila-tests')

  await mkdir(scratchBase, { recursive: true })
  return mkdtemp(join(scratchBase, prefix))
}

export async function removeTempDir(dir: string): Promise<void> {
  await rm(dir, { force: true, recursive: true })
}

export async function createTempFile(dir: string, name: string, content = ''): Promise<string> {
  const filePath = join(dir, name)
  await writeFile(filePath, content)
  return filePath
}

export interface CommonTagsOverrides {
  album?: string
  albumartist?: string
  albumartists?: string[]
  artist?: string
  artists?: string[]
  composer?: string[]
  disk?: { no: number | null, of: number | null }
  grouping?: string
  label?: string[]
  movementIndex?: { no: number | null, of: number | null }
  originalalbum?: string
  producer?: string[]
  publisher?: string[]
  subtitle?: string[]
  title?: string
  track?: { no: number | null, of: number | null }
  year?: number
}

export interface FormatOverrides {
  bitrate?: number
  duration?: number
  sampleRate?: number
}

export function makeAudioMetadata(
  common: CommonTagsOverrides = {},
  format: FormatOverrides = {},
): IAudioMetadata {
  const commonResult: ICommonTagsResult = {
    disk: { no: null, of: null },
    movementIndex: { no: null, of: null },
    track: { no: null, of: null },
    ...common,
  }

  const formatResult: IFormat = {
    tagTypes: [],
    trackInfo: [],
    ...format,
  }

  return {
    common: commonResult,
    format: formatResult,
    native: {},
    quality: { warnings: [] },
  }
}
