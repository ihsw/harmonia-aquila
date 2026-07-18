import pLimit from 'p-limit'

export interface ProcessFilesOptions {
  concurrency?: number
}

export async function processFiles(
  fileNames: readonly string[],
  processFile: (fileName: string) => Promise<string>,
  options: ProcessFilesOptions = {},
): Promise<string[]> {
  const concurrency = parseConcurrency(options.concurrency)
  const limit = pLimit(concurrency)

  return Promise.all(
    fileNames.map((fileName) => limit(() => processFile(fileName))),
  )
}

function parseConcurrency(value: number | undefined): number {
  if (value === undefined) {
    return 4
  }

  if (!Number.isInteger(value) || value < 1) {
    throw new Error('concurrency must be a positive integer')
  }

  return value
}
