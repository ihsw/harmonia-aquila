# Design: Process Renaming Audiobooks

## Overview

This is a data-processing workflow, not a source-code change. The source tree
is read-only; `copy-and-rename` creates metadata-derived copies in the renamed
stage and `validate` confirms each resulting filename exactly matches its
embedded performer and title.

## Inputs and outputs

| Role | Path |
| --- | --- |
| Source | `etc/audiobooks/1-source-files/renaming/` |
| Destination | `etc/audiobooks/3-renamed-files/` |
| Candidate evidence | `candidate-summary.json` |
| Executable candidates | `executable-workflows.md` |

The candidate summary captures the crawl result and the 18 dry-run outputs
used to generate this spec. All recorded destinations are distinct.

## Workflow

1. Run the crawl command from `candidate-summary.json`. Stop if the results
   differ from its recorded categories or metadata.
2. For each executable row, repeat its dry-run command. Stop if it does not
   produce the recorded `would copy` destination.
3. Run that row's `copy-and-rename` command with `--execute`.
4. Run the corresponding `validate` command against the copied destination.
5. Stop immediately on any command failure. Do not process the blocked row.

## Failure handling

| Condition | Action |
| --- | --- |
| Crawl differs from the summary | Stop and regenerate the candidate audit. |
| Copy dry-run reports a collision or different destination | Stop; resolve the conflict without overwriting. |
| Copy fails | Preserve the source and inspect the failure. |
| Destination validation fails | Preserve both files and quarantine the destination for review. |
| Missing metadata | Do not copy; repair metadata deliberately, then rerun crawl. |
