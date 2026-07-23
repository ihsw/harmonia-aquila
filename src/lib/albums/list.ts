import { readdir, realpath, stat } from 'node:fs/promises'
import { isAbsolute, join, relative, sep } from 'node:path'

import { UserInputError } from '../errors.js'

export interface ListAlbumSourceDirOptions {
  prefix?: string
  sourceDir: string
}

export type ListAlbumSourceDirJsonOutput = string[]

export async function listAlbumSourceDir(
  options: ListAlbumSourceDirOptions,
): Promise<ListAlbumSourceDirJsonOutput> {
  const { prefix = '', sourceDir } = options

  let rootReal: string
  try {
    rootReal = await realpath(sourceDir)
  }
  catch {
    throw new UserInputError(`source directory does not exist: ${sourceDir}`)
  }

  const rootStat = await stat(rootReal)
  if (!rootStat.isDirectory()) {
    throw new UserInputError(`source directory is not a directory: ${sourceDir}`)
  }

  if (prefix === '') {
    return readAndSort(rootReal, '')
  }

  if (isAbsolute(prefix)) {
    throw new UserInputError(`prefix must not be absolute: ${prefix}`)
  }
  if (prefix.includes('\0')) {
    throw new UserInputError(`prefix must not contain NUL: ${prefix}`)
  }
  if (!prefix.endsWith('/')) {
    throw new UserInputError(`prefix must end with /: ${prefix}`)
  }

  const resolved = join(rootReal, prefix)
  const rel = relative(rootReal, resolved)

  if (rel === '' || rel === '..' || rel.startsWith(`..${sep}`) || isAbsolute(rel)) {
    throw new UserInputError(`prefix escapes source root: ${prefix}`)
  }

  let targetReal: string
  try {
    targetReal = await realpath(resolved)
  }
  catch {
    throw new UserInputError(`prefix directory does not exist: ${prefix}`)
  }

  const rootWithSep = rootReal.endsWith(sep) ? rootReal : `${rootReal}${sep}`
  if (targetReal !== rootReal && !targetReal.startsWith(rootWithSep)) {
    throw new UserInputError(`prefix escapes source root: ${prefix}`)
  }

  const targetStat = await stat(targetReal)
  if (!targetStat.isDirectory()) {
    throw new UserInputError(`prefix is not a directory: ${prefix}`)
  }

  return readAndSort(targetReal, prefix)
}

async function readAndSort(dir: string, prefix: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true })
  return entries
    .map(entry => `${prefix}${entry.name}${entry.isDirectory() ? '/' : ''}`)
    .sort()
}
