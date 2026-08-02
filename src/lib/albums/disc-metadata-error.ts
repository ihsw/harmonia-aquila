import { UserInputError } from '../errors.js'

import {
  type DiscSetIssue,
  type DiscTrackMetadata,
  validateDiscSet,
} from './disc-metadata.js'

function getRepeatedTracks(records: DiscTrackMetadata[]): Map<number, string[]> {
  const filenamesByTrack = new Map<number, string[]>()

  for (const record of records) {
    if (record.trackNumber !== null) {
      filenamesByTrack.set(record.trackNumber, [
        ...(filenamesByTrack.get(record.trackNumber) ?? []),
        record.filename,
      ])
    }
  }
  return new Map([...filenamesByTrack]
    .filter(([, filenames]) => filenames.length > 1)
    .sort(([left], [right]) => left - right))
}

function formatIssues(issues: DiscSetIssue[]): string {
  return issues
    .map(issue => `${issue.message} (${issue.filenames.join(', ')})`)
    .join('; ')
}

function formatRepeatedTrackError(
  repeatedTracks: Map<number, string[]>,
  remainingIssues: DiscSetIssue[],
): string {
  const groups = [...repeatedTracks]
    .map(([track, filenames]) => `  Track ${track.toString()}: ${[...filenames].sort().join(', ')}`)
    .join('\n')
  const additional = remainingIssues.length === 0
    ? ''
    : `\nAdditional disc metadata issues: ${formatIssues(remainingIssues)}`

  return [
    'Duplicate track numbers were detected:',
    groups,
    'Repeated track numbers require complete disc metadata (missing disc number).',
    'If the track numbers are incorrect, fix them with setMetadata '
    + '(CLI: --set-metadata <json-or-csv-path>), providing one record for every selected audio file.',
    'If the repeats represent real disc boundaries, use discStrategy "infer" '
    + '(CLI: --disc-strategy infer) after every selected file has a positive track number.',
    `No files were written.${additional}`,
  ].join('\n')
}

export function throwForDiscSetIssues(records: DiscTrackMetadata[]): void {
  const issues = validateDiscSet(records)

  if (issues.length === 0) {
    return
  }

  const missingDiscNumber = issues.some(issue => issue.message === 'missing disc number')
  const repeatedTracks = getRepeatedTracks(records)

  if (missingDiscNumber && repeatedTracks.size > 0) {
    throw new UserInputError(formatRepeatedTrackError(
      repeatedTracks,
      issues.filter(issue => issue.message !== 'missing disc number'),
    ))
  }
  throw new UserInputError(formatIssues(issues))
}
