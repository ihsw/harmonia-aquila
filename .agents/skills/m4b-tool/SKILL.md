---
name: m4b-tool
description: Discover and safely use the installed m4b-tool CLI for M4B audiobook inspection, metadata, chapter, and file operations.
---

# M4B Tool

Use this skill for any task involving the `m4b-tool` command. Treat the
installed command's help text as the source of truth: its available
subcommands and flags can vary by version.

## Docker invocation

`m4b-tool` runs through the Docker image with the current directory mounted at
`/mnt`:

```sh
alias m4b-tool='docker run -it --rm -u $(id -u):$(id -g) -v "$(pwd)":/mnt sandreas/m4b-tool:latest'
```

Run commands from the directory containing the input files, and pass paths
relative to `/mnt` (or use the working directory the command documents).

## Available commands

`m4b-tool list` from image version `0.5.2` reports:

- `chapters` - add chapters to an M4B file.
- `completion` - emit a shell completion script.
- `help` - display help for a command.
- `list` - list commands.
- `merge` - merge files into one output file.
- `meta` - view or change metadata for a single file.
- `split` - split an M4B file into parts.

## `--help` reference

Captured from `sandreas/m4b-tool:latest` version `0.5.2`. All commands accept
`-h, --help`, `-q, --quiet`, `-V, --version`, `--ansi|--no-ansi`,
`-n, --no-interaction`, and `-v|vv|vvv, --verbose`.

### `chapters --help`

```text
Description:
  Adds chapters to m4b file

Usage:
  chapters [options] [--] <input>

Arguments:
  input  Input file or folder
```

Options:

- `--logfile[=LOGFILE]`, `--debug`, `-f, --force`, `--tmp-dir[=TMP-DIR]`,
  `--no-cleanup`, `--no-cache`, `--ffmpeg-threads[=FFMPEG-THREADS]`,
  `--platform-charset[=PLATFORM-CHARSET]`, and
  `--ffmpeg-param[=FFMPEG-PARAM]`.
- `-a, --silence-min-length[=SILENCE-MIN-LENGTH]` (default `1750`),
  `-b, --silence-max-length[=SILENCE-MAX-LENGTH]` (default `0`),
  `--min-chapter-length[=MIN-CHAPTER-LENGTH]` (default `1`), and
  `--max-chapter-length[=MAX-CHAPTER-LENGTH]` (default `0`).
- `--enable-improvers[=ENABLE-IMPROVERS]`,
  `--disable-improvers[=DISABLE-IMPROVERS]`, and
  `-p, --filename-template[=FILENAME-TEMPLATE]`.
- `--epub[=EPUB]`, `--epub-restore`, `--epub-dump`,
  `--epub-ignore-chapters[=EPUB-IGNORE-CHAPTERS]`,
  `--epub-append-introduction`, `-m, --musicbrainz-id=MUSICBRAINZ-ID`,
  `-s, --merge-similar`, and `-o, --output-file[=OUTPUT-FILE]`.
- `--adjust-by-silence`, `--normalize`, `--shift[=SHIFT]`,
  `--find-misplaced-chapters[=FIND-MISPLACED-CHAPTERS]`,
  `--find-misplaced-offset[=FIND-MISPLACED-OFFSET]` (default `120`),
  `--find-misplaced-tolerance[=FIND-MISPLACED-TOLERANCE]` (default `-4000`),
  `--no-chapter-numbering`, and `--no-chapter-import`.
- `--chapter-pattern[=CHAPTER-PATTERN]`,
  `--chapter-replacement[=CHAPTER-REPLACEMENT]`,
  `--chapter-remove-chars[=CHAPTER-REMOVE-CHARS]`,
  `--first-chapter-offset[=FIRST-CHAPTER-OFFSET]`, and
  `--last-chapter-offset[=LAST-CHAPTER-OFFSET]`.

Help: Can add chapters to M4B files via different types of inputs.

### `completion --help`

```text
Description:
  Dump the shell completion script

Usage:
  completion [options] [--] [<shell>]

Arguments:
  shell  The shell type (for example "bash"); defaults to "$SHELL".
```

Option: `--debug` tails the completion debug log.

### `help --help`

```text
Description:
  Display help for a command

Usage:
  help [options] [--] [<command_name>]

Arguments:
  command_name  The command name (default: "help")
```

Options: `--format=FORMAT` (`txt`, `xml`, `json`, or `md`; default `txt`) and
`--raw` for raw command help.

### `list --help`

```text
Description:
  List commands

Usage:
  list [options] [--] [<namespace>]

Arguments:
  namespace  The namespace name
```

Options: `--raw`, `--format=FORMAT` (`txt`, `xml`, `json`, or `md`; default
`txt`), and `--short` to skip command-argument descriptions.

### `merge --help`

```text
Description:
  Merges a set of files to one single file

Usage:
  merge [options] [--] <input> [<more-input-files>...]

Arguments:
  input             Input file or folder
  more-input-files  Other input files or folders
```

Options:

- The shared processing options are `--logfile`, `--debug`, `--force`,
  `--tmp-dir`, `--no-cleanup`, `--no-cache`, `--ffmpeg-threads`,
  `--platform-charset`, `--ffmpeg-param`, `--silence-min-length`,
  `--silence-max-length`, `--min-chapter-length`, `--max-chapter-length`,
  `--enable-improvers`, `--disable-improvers`, and `--filename-template`.
- Metadata options are `--name`, `--sortname`, `--album`, `--sortalbum`,
  `--artist`, `--sortartist`, `--genre`, `--writer`, `--albumartist`,
  `--year`, `--description`, `--longdesc`, `--comment`, `--copyright`,
  `--encoded-by`, `--grouping`, `--purchase-date`, `--encoder`, `--cover`,
  `--skip-cover-if-exists`, `--skip-cover`, `--series`, `--series-part`,
  `--remove`, `--ignore-source-tags`, and `--prefer-metadata-tags`.
- Audio options are `--audio-format` (default `m4b`), `--audio-extension`,
  `--audio-channels`, `--audio-bitrate`, `--audio-samplerate`,
  `--audio-codec`, `--audio-quality`, `--audio-profile`,
  `--adjust-for-ipod`, `--use-nero-chapter-format`, `--fix-mime-type`,
  `--no-conversion`, `--trim-silence`, and `--add-silence`.
- Output and batch options are `-o, --output-file=OUTPUT-FILE`,
  `--include-extensions` (default
  `aac,aax,aif,aiff,alac,ape,au,caf,flac,m4a,m4b,m4p,m4r,mka,mp2,mp3,mp4,mpa,rif,oga,ogg,opus,wav,wma`),
  `-m, --musicbrainz-id=MUSICBRAINZ-ID`, `--batch-pattern`,
  `--batch-pattern-path`, `--batch-filter`, `--batch-resume-file`,
  `--dry-run`, `--jobs` (default `1`), `--use-filenames-as-chapters`,
  `--chapter-algo` (`none`, `legacy`, or `grouping`; default `legacy`),
  `--tag-debug-path`, `--no-chapter-reindexing`,
  `--prepend-series-to-longdesc`, and `--equate`.

### `meta --help`

```text
Description:
  View and change metadata for a single file

Usage:
  meta [options] [--] <input>

Arguments:
  input  Input file or folder
```

It supports the shared processing and metadata options listed under `merge`,
plus `--import-all`, `--import-cover[=IMPORT-COVER]`,
`--import-description[=IMPORT-DESCRIPTION]`,
`--import-ffmetadata[=IMPORT-FFMETADATA]`, `--import-opf[=IMPORT-OPF]`,
`--import-chapters[=IMPORT-CHAPTERS]`, `--import-cue-sheet[=IMPORT-CUE-SHEET]`,
`--export-all`, `--export-cover[=EXPORT-COVER]`,
`--export-description[=EXPORT-DESCRIPTION]`,
`--export-ffmetadata[=EXPORT-FFMETADATA]`,
`--export-chapters[=EXPORT-CHAPTERS]`, and
`--export-cue-sheet[=EXPORT-CUE-SHEET]`.

### `split --help`

```text
Description:
  Splits an m4b file into parts

Usage:
  split [options] [--] <input>

Arguments:
  input  Input file or folder
```

It supports the shared processing, metadata, and audio options listed under
`merge`, plus `-o, --output-dir[=OUTPUT-DIR]`,
`--use-existing-chapters-file`, `--reindex-chapters`,
`--fixed-length[=FIXED-LENGTH]`, `--chapters-filename[=CHAPTERS-FILENAME]`,
and `--by-silence`.

Help: Split an M4B into multiple M4B or MP3 files by chapter.

## Discover the installed interface

Start every task by listing the available subcommands:

```sh
m4b-tool list
```

Before invoking a subcommand, inspect its exact arguments and behavior:

```sh
m4b-tool <subcommand> --help
```

If a task could be handled by more than one subcommand, inspect the help for
each candidate before choosing one. Do not guess flag names, positional
arguments, output formats, overwrite behavior, or whether an operation
modifies the input file.

`chapters`, `merge`, `meta`, and `split` support `--force`; never include it
unless the user explicitly requests replacement of existing output.

## Safe workflow

1. Run `m4b-tool list` to discover the installed command set.
2. Run `m4b-tool <subcommand> --help` for the subcommand that matches the
   requested operation.
3. Prefer inspection, validation, listing, or dry-run modes first when the
   selected command provides them.
4. Review the reported M4B metadata, chapters, output paths, and warnings
   before choosing an operation that writes, replaces, moves, or deletes
   files.
5. Write output to a separate staging directory when the command supports an
   output destination. Preserve the original M4B until the result has been
   reviewed.
6. Use destructive or overwrite flags only when the user explicitly requests
   them and the command's help documents their effect.

## Command invocation conventions

- Quote every file and directory path, especially names containing spaces,
  apostrophes, or shell metacharacters.
- Use absolute paths or establish the working directory explicitly before
  operating on files.
- Capture machine-readable output when `--json`, `--format json`, or an
  equivalent documented option is available.
- Check the exit status. A non-zero result means the requested operation did
  not complete successfully; do not treat partial output as success.
- For batch work, first run the selected inspection or dry-run mode on one
  representative file, then process the remaining files only after its output
  is correct.

## M4B integrity safeguards

- Work only on `.m4b` inputs unless the selected subcommand's help explicitly
  documents another required input type.
- Do not invent metadata, chapter boundaries, titles, authors, performers, or
  cover-art details that are absent from the source or the user's request.
- Never overwrite the source or an existing destination by default.
- Keep the source and any audit output until a human has reviewed the staged
  result.
- When a command reports malformed metadata, unreadable media, or conflicting
  chapter information, stop that file's workflow and preserve it for review.
