export function createSetMetadataError(message: string, cause?: unknown): Error {
  return cause === undefined ? new Error(message) : new Error(message, { cause })
}

function asRawRecord(rawValue: unknown, context: string): Record<string, unknown> {
  if (typeof rawValue !== 'object' || rawValue === null || Array.isArray(rawValue)) {
    throw createSetMetadataError(`Metadata record ${context} must be an object`)
  }

  return rawValue as Record<string, unknown>
}

export function parseJsonRecords(fileContents: string, filePath: string): Array<Record<string, unknown>> {
  let parsed: unknown

  try {
    parsed = JSON.parse(fileContents)
  }
  catch (error) {
    throw createSetMetadataError(`Failed to parse metadata JSON file "${filePath}"`, error)
  }

  if (!Array.isArray(parsed)) {
    throw createSetMetadataError(`Metadata JSON file "${filePath}" must contain an array of records`)
  }

  return parsed.map((rawValue, index) => asRawRecord(rawValue, `at index ${index.toString()}`))
}

function parseCsvRows(fileContents: string): string[][] {
  const rows: string[][] = []
  let currentRow: string[] = []
  let field = ''
  let inQuotes = false
  let quotedFieldClosed = false
  let index = 0

  while (index < fileContents.length) {
    const character = fileContents[index]

    if (character === undefined) {
      break
    }

    if (inQuotes) {
      if (character === '"') {
        if (fileContents[index + 1] === '"') {
          field += '"'
          index += 2
          continue
        }

        inQuotes = false
        quotedFieldClosed = true
        index += 1
        continue
      }

      field += character
      index += 1
      continue
    }

    if (quotedFieldClosed && character !== ',' && character !== '\r' && character !== '\n') {
      throw createSetMetadataError('Metadata CSV file has unquoted content after a quoted field')
    }

    if (character === '"') {
      if (field !== '') {
        throw createSetMetadataError('Metadata CSV file has a quote within an unquoted field')
      }

      inQuotes = true
      index += 1
      continue
    }

    if (character === ',') {
      currentRow.push(field)
      field = ''
      quotedFieldClosed = false
      index += 1
      continue
    }

    if (character === '\r' || character === '\n') {
      currentRow.push(field)
      field = ''
      rows.push(currentRow)
      currentRow = []
      quotedFieldClosed = false
      index += character === '\r' && fileContents[index + 1] === '\n' ? 2 : 1
      continue
    }

    field += character
    index += 1
  }

  if (inQuotes) {
    throw createSetMetadataError('Metadata CSV file has an unterminated quoted field')
  }

  if (field !== '' || currentRow.length > 0) {
    currentRow.push(field)
    rows.push(currentRow)
  }

  return rows.filter(row => !(row.length === 1 && row[0] === ''))
}

export function parseCsvRecords(
  fileContents: string,
  filePath: string,
  requiredFields: readonly string[],
): Array<Record<string, unknown>> {
  const rows = parseCsvRows(fileContents)
  const header = rows[0]

  if (header === undefined) {
    throw createSetMetadataError(`Metadata CSV file "${filePath}" must contain a header row and at least one record`)
  }

  const seenColumns = new Set<string>()

  for (const column of header) {
    if (seenColumns.has(column)) {
      throw createSetMetadataError(`Metadata CSV file "${filePath}" has a duplicate column "${column}"`)
    }

    seenColumns.add(column)
  }

  for (const field of requiredFields) {
    if (!seenColumns.has(field)) {
      throw createSetMetadataError(`Metadata CSV file "${filePath}" is missing the required column "${field}"`)
    }
  }

  const dataRows = rows.slice(1)

  if (dataRows.length === 0) {
    throw createSetMetadataError(`Metadata CSV file "${filePath}" must contain at least one record row`)
  }

  return dataRows.map((row, rowIndex) => {
    if (row.length !== header.length) {
      throw createSetMetadataError(
        `Metadata CSV file "${filePath}" record on line ${(rowIndex + 2).toString()} has ${row.length.toString()} fields but the header has ${header.length.toString()}`,
      )
    }

    return Object.fromEntries(header.map((column, columnIndex) => [column, row[columnIndex]]))
  })
}
