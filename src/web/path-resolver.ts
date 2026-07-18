import { promises as fs } from 'node:fs'
import path from 'node:path'

import { UserInputError } from '../lib/errors.js'

export interface WebRoots {
  sourceDir: string
  destDir: string
}

export class WebPathResolver {
  public constructor(private readonly roots: WebRoots) {}

  public get destDir(): string {
    return this.roots.destDir
  }

  public get sourceDir(): string {
    return this.roots.sourceDir
  }

  public async resolveSource(requestPath: string, fieldName: string): Promise<string> {
    return this.resolveWithinRoot(this.roots.sourceDir, requestPath, fieldName, '--source-dir')
  }

  public async resolveDest(requestPath: string, fieldName: string): Promise<string> {
    return this.resolveWithinRoot(this.roots.destDir, requestPath, fieldName, '--dest-dir')
  }

  private async resolveWithinRoot(root: string, requestPath: string, fieldName: string, optionName: string): Promise<string> {
    if (requestPath.trim() === '') {
      throw new UserInputError(`${fieldName} is required`)
    }

    if (requestPath.includes('\0')) {
      throw new UserInputError(`${fieldName} must stay within ${optionName}`)
    }

    const candidate = path.isAbsolute(requestPath)
      ? path.resolve(requestPath)
      : path.resolve(root, requestPath)

    if (!isWithinRoot(root, candidate)) {
      throw new UserInputError(`${fieldName} must stay within ${optionName}`)
    }

    const realCandidate = await realpathIfReachable(candidate)
    if (realCandidate !== undefined && !isWithinRoot(root, realCandidate)) {
      throw new UserInputError(`${fieldName} must stay within ${optionName}`)
    }

    return candidate
  }
}

export async function normalizeWebRoots(roots: WebRoots): Promise<WebRoots> {
  return {
    destDir: await normalizeRoot(roots.destDir, '--dest-dir'),
    sourceDir: await normalizeRoot(roots.sourceDir, '--source-dir'),
  }
}

async function normalizeRoot(root: string, optionName: string): Promise<string> {
  if (root.trim() === '') {
    throw new UserInputError(`${optionName} is required`)
  }

  const resolvedRoot = path.resolve(root)

  try {
    const realRoot = await fs.realpath(resolvedRoot)
    const stats = await fs.stat(realRoot)

    if (!stats.isDirectory()) {
      throw new UserInputError(`${optionName} must be an existing directory`)
    }

    return realRoot
  }
  catch {
    throw new UserInputError(`${optionName} must be an existing directory`)
  }
}

async function realpathIfReachable(candidate: string): Promise<string | undefined> {
  let current = candidate
  let parent = path.dirname(current)

  while (current !== parent) {
    try {
      return await fs.realpath(current)
    }
    catch {
      current = parent
      parent = path.dirname(current)
    }
  }

  try {
    return await fs.realpath(current)
  }
  catch {
    return undefined
  }
}

function isWithinRoot(root: string, candidate: string): boolean {
  const relativePath = path.relative(root, candidate)

  return relativePath === '' || (!relativePath.startsWith('..') && !path.isAbsolute(relativePath))
}
