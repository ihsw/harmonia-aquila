import { Command } from 'commander'
import { afterEach, beforeEach, describe, expect, it, type Mock, vi } from 'vitest'

import { parseOutputFormat, pathExists, writeRows } from './command-utils.js'
import { createTempDir, createTempFile, removeTempDir } from './test-helpers.js'

describe('writeRows', () => {
  let infoSpy: Mock
  let tableSpy: Mock

  beforeEach(() => {
    infoSpy = vi.spyOn(console, 'info').mockImplementation(() => undefined)
    tableSpy = vi.spyOn(console, 'table').mockImplementation(() => undefined)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('writes JSON array to console.info when format is json', () => {
    const rows = [{ name: 'track01.flac', title: 'Opener' }]
    writeRows('json', rows)

    expect(infoSpy).toHaveBeenCalledOnce()
    const rawArg: unknown = infoSpy.mock.calls[0]?.[0]
    const output = JSON.parse(String(rawArg)) as unknown[]
    expect(output).toEqual(rows)
  })

  it('writes formatted JSON with indentation', () => {
    writeRows('json', [{ a: 1 }])
    const raw = String(infoSpy.mock.calls[0]?.[0])
    expect(raw).toContain('\n')
  })

  it('calls console.table and prints message for plaintext format', () => {
    const rows = [{ title: 'Song' }]
    writeRows('plaintext', rows, 'Dry run message')

    expect(infoSpy).toHaveBeenCalledWith('Dry run message')
    expect(tableSpy).toHaveBeenCalledWith(rows)
  })

  it('calls console.table without message when plaintextMessage is omitted', () => {
    writeRows('plaintext', [{ x: 1 }])

    expect(infoSpy).not.toHaveBeenCalled()
    expect(tableSpy).toHaveBeenCalledOnce()
  })
})

describe('parseOutputFormat', () => {
  it('returns json for the json option value', () => {
    const cmd = new Command()
    cmd.exitOverride()
    expect(parseOutputFormat(cmd, 'json')).toBe('json')
  })

  it('returns plaintext for the plaintext option value', () => {
    const cmd = new Command()
    cmd.exitOverride()
    expect(parseOutputFormat(cmd, 'plaintext')).toBe('plaintext')
  })

  it('defaults to plaintext when option is undefined', () => {
    const cmd = new Command()
    cmd.exitOverride()
    expect(parseOutputFormat(cmd, undefined)).toBe('plaintext')
  })

  it('throws CommanderError for an invalid format', () => {
    const cmd = new Command()
    cmd.exitOverride()
    expect(() => parseOutputFormat(cmd, 'xml')).toThrow()
  })
})

describe('pathExists', () => {
  let tempDir: string

  beforeEach(async () => {
    tempDir = await createTempDir('cmd-utils-')
  })

  afterEach(async () => {
    await removeTempDir(tempDir)
  })

  it('returns true for an existing file', async () => {
    const filePath = await createTempFile(tempDir, 'exist.txt', 'data')
    expect(await pathExists(filePath)).toBe(true)
  })

  it('returns true for an existing directory', async () => {
    expect(await pathExists(tempDir)).toBe(true)
  })

  it('returns false for a path that does not exist', async () => {
    const missing = `${tempDir}/definitely-not-here.txt`
    expect(await pathExists(missing)).toBe(false)
  })
})
