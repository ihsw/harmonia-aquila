import { spawn } from 'node:child_process'
import { EventEmitter } from 'node:events'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { mergeWithM4bTool, parseM4bToolJobs, setM4bToolMetadata } from '../../../src/lib/audiobooks/m4b-tool.js'

vi.mock('node:child_process', () => ({
  spawn: vi.fn(),
}))

interface MockChildProcess extends EventEmitter {
  stderr: EventEmitter
  stdout: EventEmitter
}

const mockSpawn = vi.mocked(spawn)

function makeChildProcess(): MockChildProcess {
  const childProcess = new EventEmitter() as MockChildProcess
  childProcess.stderr = new EventEmitter()
  childProcess.stdout = new EventEmitter()

  return childProcess
}

describe('m4b-tool library wrapper', () => {
  beforeEach(() => {
    mockSpawn.mockReset()
    vi.spyOn(process.stderr, 'write').mockReturnValue(true)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('parses positive integer job counts', () => {
    expect(parseM4bToolJobs('3')).toBe(3)
    expect(() => parseM4bToolJobs('0')).toThrow('--jobs must be a positive integer')
    expect(() => parseM4bToolJobs('1.5')).toThrow('--jobs must be a positive integer')
  })

  it('runs docker merge with mounted source and destination paths', async () => {
    const childProcess = makeChildProcess()
    mockSpawn.mockReturnValue(childProcess as ReturnType<typeof spawn>)

    const mergePromise = mergeWithM4bTool({
      destinationDirectory: '/dest',
      destinationFilename: 'Author - Book.m4b',
      jobs: 2,
      performer: 'Author',
      sourceDirectory: '/source',
      sourcePaths: ['/source/disc1.m4b', '/source/sub/disc2.m4b'],
      title: 'Book',
    })
    childProcess.emit('exit', 0, null)
    await mergePromise

    expect(mockSpawn).toHaveBeenCalledWith(
      'docker',
      expect.arrayContaining([
        'run',
        '--jobs',
        '2',
        '--output-file',
        '/dest/Author - Book.m4b',
        '--artist',
        'Author',
        '--name',
        'Book',
        '/source/disc1.m4b',
        '/source/sub/disc2.m4b',
      ]),
      { stdio: ['ignore', 'pipe', 'pipe'] },
    )
  })

  it('runs docker metadata updates with author, narrator, and title', async () => {
    const childProcess = makeChildProcess()
    mockSpawn.mockReturnValue(childProcess as ReturnType<typeof spawn>)

    const metadataPromise = setM4bToolMetadata({
      author: 'Author',
      narrator: 'Narrator',
      sourceDirectory: '/books',
      sourcePath: '/books/Author - Book.m4b',
      title: 'Book',
    })
    childProcess.emit('exit', 0, null)
    await metadataPromise

    expect(mockSpawn).toHaveBeenCalledWith(
      'docker',
      expect.arrayContaining([
        'meta',
        '/source/Author - Book.m4b',
        '--album',
        'Book',
        '--artist',
        'Author',
        '--writer',
        'Narrator',
      ]),
      { stdio: ['ignore', 'pipe', 'pipe'] },
    )
  })

  it('rejects with process output when docker exits unsuccessfully', async () => {
    const childProcess = makeChildProcess()
    mockSpawn.mockReturnValue(childProcess as ReturnType<typeof spawn>)

    const mergePromise = mergeWithM4bTool({
      destinationDirectory: '/dest',
      destinationFilename: 'Book.m4b',
      jobs: 1,
      sourceDirectory: '/source',
      sourcePaths: ['/source/file.m4b'],
    })
    childProcess.stdout.emit('data', Buffer.from('stdout detail'))
    childProcess.stderr.emit('data', Buffer.from('stderr detail'))
    childProcess.emit('exit', 2, null)

    await expect(mergePromise).rejects.toThrow('m4b-tool operation failed with exit code 2: stdout detailstderr detail')
  })
})
