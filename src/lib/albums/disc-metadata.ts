import { UserInputError } from '../errors.js'
export interface DiscMetadata {
  discNumber: number | null
  discTotal: number | null
}

export interface DiscTrackMetadata extends DiscMetadata {
  filename: string
  trackNumber: number | null
}

export interface DiscSetIssue {
  filenames: string[]
  message: string
}

export interface InferredDiscMetadata {
  discNumber: number
  discTotal: number
}

function isPositiveInteger(value: number | null): value is number {
  return value !== null && Number.isInteger(value) && value > 0
}

function addIssue(issues: DiscSetIssue[], filenames: string[], message: string): void {
  issues.push({ filenames: [...filenames].sort(), message })
}

function validateValues(records: DiscTrackMetadata[], issues: DiscSetIssue[]): void {
  for (const record of records) {
    if (record.discNumber !== null && !isPositiveInteger(record.discNumber)) {
      addIssue(issues, [record.filename], 'invalid disc number')
    }

    if (record.discTotal !== null && !isPositiveInteger(record.discTotal)) {
      addIssue(issues, [record.filename], 'invalid disc total')
    }

    if (
      isPositiveInteger(record.discNumber)
      && isPositiveInteger(record.discTotal)
      && record.discNumber > record.discTotal
    ) {
      addIssue(
        issues,
        [record.filename],
        `disc number exceeds disc total: ${record.discNumber.toString()}/${record.discTotal.toString()}`,
      )
    }
  }
}

function validateCompleteness(records: DiscTrackMetadata[], issues: DiscSetIssue[]): void {
  const counts = new Map<number, number>()

  for (const { trackNumber } of records) {
    if (trackNumber !== null) {
      counts.set(trackNumber, (counts.get(trackNumber) ?? 0) + 1)
    }
  }

  const hasRepeatedTrack = [...counts.values()].some(count => count > 1)
  const hasDiscNumber = records.some(record => record.discNumber !== null)
  const hasDiscTotal = records.some(record => record.discTotal !== null)

  if (hasRepeatedTrack || hasDiscNumber || hasDiscTotal) {
    for (const record of records.filter(item => item.discNumber === null)) {
      addIssue(issues, [record.filename], 'missing disc number')
    }
  }

  if (hasDiscTotal) {
    for (const record of records.filter(item => item.discTotal === null)) {
      addIssue(issues, [record.filename], 'missing disc total')
    }
  }
}

function validateTotals(records: DiscTrackMetadata[], issues: DiscSetIssue[]): void {
  const totals = [...new Set(records
    .map(record => record.discTotal)
    .filter(isPositiveInteger))]
    .sort((left, right) => left - right)

  if (totals.length > 1) {
    addIssue(issues, records.map(record => record.filename), `inconsistent disc totals: ${totals.join(', ')}`)
  }

  const numbers = [...new Set(records
    .map(record => record.discNumber)
    .filter(isPositiveInteger))]
    .sort((left, right) => left - right)
  const expected = numbers.length === 0
    ? []
    : Array.from({ length: numbers.at(-1) ?? 0 }, (_value, index) => index + 1)

  if (numbers.some((number, index) => number !== expected[index])) {
    addIssue(issues, records.map(record => record.filename), `non-contiguous disc numbers: ${numbers.join(', ')}`)
  }
}

function validateTrackIdentity(records: DiscTrackMetadata[], issues: DiscSetIssue[]): void {
  const recordsByIdentity = new Map<string, DiscTrackMetadata[]>()

  for (const record of records) {
    if (!isPositiveInteger(record.discNumber) || record.trackNumber === null) {
      continue
    }

    const identity = `${record.discNumber.toString()}/${record.trackNumber.toString()}`
    recordsByIdentity.set(identity, [...(recordsByIdentity.get(identity) ?? []), record])
  }

  for (const [identity, matchingRecords] of recordsByIdentity) {
    if (matchingRecords.length > 1) {
      addIssue(
        issues,
        matchingRecords.map(record => record.filename),
        `duplicate disc and track number: ${identity}`,
      )
    }
  }
}

export function formatDiscNumber(value: number | null): string {
  return value === null ? '' : value.toString().padStart(2, '0')
}

export function isMultiDiscSet(records: DiscMetadata[]): boolean {
  return records.some(record => (record.discNumber ?? 0) > 1 || (record.discTotal ?? 0) > 1)
}

export function validateDiscSet(records: DiscTrackMetadata[]): DiscSetIssue[] {
  const issues: DiscSetIssue[] = []

  validateValues(records, issues)
  validateCompleteness(records, issues)
  validateTotals(records, issues)
  validateTrackIdentity(records, issues)
  return issues.sort((left, right) =>
    left.message.localeCompare(right.message)
    || left.filenames.join('\0').localeCompare(right.filenames.join('\0')))
}

export function inferDiscSet(records: DiscTrackMetadata[]): Map<string, InferredDiscMetadata> {
  const sortedRecords = [...records].sort((left, right) => left.filename.localeCompare(right.filename))
  let discNumber = 1
  let previousTrack: number | undefined
  const discNumberByFilename = new Map<string, number>()

  for (const record of sortedRecords) {
    if (!isPositiveInteger(record.trackNumber)) {
      throw new UserInputError(`Cannot infer disc metadata: ${record.filename} is missing a positive track number`)
    }

    if (previousTrack !== undefined && record.trackNumber <= previousTrack) {
      discNumber += 1
    }

    discNumberByFilename.set(record.filename, discNumber)
    previousTrack = record.trackNumber
  }

  if (discNumber < 2) {
    throw new UserInputError('Cannot infer disc metadata: track numbers do not contain a repeated or decreasing boundary')
  }

  const inferred = new Map<string, InferredDiscMetadata>()

  for (const record of sortedRecords) {
    const inferredDiscNumber = discNumberByFilename.get(record.filename)

    if (inferredDiscNumber === undefined) {
      throw new Error(`Missing inferred disc number for ${record.filename}`)
    }

    if (
      (record.discNumber !== null && record.discNumber !== inferredDiscNumber)
      || (record.discTotal !== null && record.discTotal !== discNumber)
    ) {
      throw new UserInputError(`Cannot infer disc metadata: ${record.filename} has contradictory existing disc metadata`)
    }

    inferred.set(record.filename, { discNumber: inferredDiscNumber, discTotal: discNumber })
  }

  return inferred
}
