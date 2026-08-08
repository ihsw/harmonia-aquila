# Design (testing): Container-aware tag verification in `organize-files`

> Companion to [design.md](./design.md). Covers the test-helper change and the test plan only.
> Section numbers here are referenced from `tasks.md` as `design-testing.md §<n>`.

## 1. Test-helper change

`__tests__/test-helpers.ts:50` currently hardcodes `native: {}`. FR-8 adds a third parameter:

```ts
export function makeAudioMetadata(
  common: CommonTagsOverrides = {},
  format: FormatOverrides = {},
  native: INativeTags = {},
): IAudioMetadata {
  …
  return { common: commonResult, format: formatResult, native, quality: { warnings: [] } }
}
```

Defaulting to `{}` keeps all existing two-argument call sites compiling. `format` already defaults
`tagTypes: []`, which is what makes FR-9's "joined form rejected when the container is not
ID3v2.3" case expressible without extra plumbing.

## 2. What stays the same

- Every suite that mocks `music-metadata` and `audio-tags.js` keeps its mocks. Those suites never
  reached the real comparison and still do not.
- The `Failed to repair and organize` wrapper assertions in
  `organize-files-metadata.test.ts:150` and `:164` — FR-6 changes only the inner message, and both
  assertions match the outer one.
- `__tests__/lib/albums/audio-tags.test.ts` — the write path is out of scope.

## 3. What changes

New suite `__tests__/lib/albums/audio-tag-verification.test.ts` drives `findUnpersistedTagFields`
directly. Representative cases:

```ts
it('accepts a slash-joined album-artist list on ID3v2.3', () => {
  const metadata = makeAudioMetadata(
    { albumartists: ['AmIEviL/Mazedude/The Fat Man'] },
    { tagTypes: ['ID3v2.3'] },
  )

  expect(findUnpersistedTagFields(metadata, {
    albumArtists: ['AmIEviL', 'Mazedude', 'The Fat Man'],
  })).toEqual([])
})

it('rejects the joined form when the container is not ID3v2.3', () => {
  const metadata = makeAudioMetadata({ albumartists: ['A/B'] }, { tagTypes: ['vorbis'] })

  expect(findUnpersistedTagFields(metadata, { albumArtists: ['A', 'B'] })).toEqual(['albumArtists'])
})

it('reads producers from the ID3v2.3 involved-people frame', () => {
  const metadata = makeAudioMetadata({}, { tagTypes: ['ID3v2.3'] }, {
    'ID3v2.3': [{ id: 'IPLS', value: { producer: ['P1', 'P2'] } }],
  })

  expect(findUnpersistedTagFields(metadata, { producers: ['P1', 'P2'] })).toEqual([])
})
```

The FR-9 matrix, one `it` each:

| Case | Expected |
| --- | --- |
| exact match on every field | `[]` |
| ID3v2.3, joined `albumArtists` | `[]` |
| ID3v2.3, `albumArtists` genuinely wrong | `['albumArtists']` |
| non-ID3v2.3, joined form | `['albumArtists']` |
| FR-3a: requested `['A']`, read `['A/B']` | `['albumArtists']` |
| FR-3b: ID3v2.3, joined `artists` | `[]` |
| producers via `common.producer` | `[]` |
| producers via `IPLS` fallback | `[]` |
| producers via `TIPL` fallback | `[]` |
| producers genuinely wrong | `['producers']` |
| `native` value malformed (`null`, string, non-string array) | `['producers']`, no throw |
| `discNumber: { kind: 'clear' }` against `null` and against `0` | `[]` both |
| two fields wrong at once | both names, in FR-6 order |
| empty fix through `verifyTagFix` | resolves without calling `parseFile` |
| FR-6 message shape through `verifyTagFix` | matches `/^Metadata was not persisted: albumArtists \(requested /` |

End-to-end (FR-9 last row) goes in `organize-files-metadata.test.ts` **if** it fits under NFR-5's
200-line cap — that file is at 187. It needs `writeAudioTagFix` left mocked as a no-op while
`parseFile` returns the joined read-back, proving `organizeAlbumFiles` publishes:

```ts
vi.mocked(parseFile)
  .mockResolvedValueOnce(makeAudioMetadata({ album: 'ocremix.org', artist: 'A', title: 'T', track: { no: 1, of: null } }))
  .mockResolvedValueOnce(makeAudioMetadata({ albumartists: ['A/B'], … }, { tagTypes: ['ID3v2.3'] }))
```

If it does not fit, create `__tests__/lib/albums/organize-files-tag-verification.test.ts` instead.
Decide by measuring, not by guessing (task 4.3).

## 4. Coverage parity table

| Original behaviour | Disposition |
| --- | --- |
| `verifyTagFix` private, exercised only incidentally | kept, now also covered directly (FR-1a) |
| `metadataValues` in `organize-files-execution.ts` | moved verbatim; the duplicate in `metadata-fix-sources.ts:7` is left alone (out of scope) |
| `matchesNumericTagFix` clear/set semantics | moved verbatim, now explicitly tested |
| `Metadata was not persisted: <json>` | superseded by FR-6; prefix preserved |
