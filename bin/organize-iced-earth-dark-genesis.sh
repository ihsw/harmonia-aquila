#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)
REPO_ROOT=$(cd -- "$SCRIPT_DIR/.." && pwd)
SOURCE_ROOT=${HARMONIA_AQUILA_SOURCE_DIR:-"$REPO_ROOT/etc/albums/1-source-files/Iced.Earth.-.The.Whole.Discography.(1991-2008).(22CDs).[EAC-FLAC-APE].by.Calimeero"}
DEST_DIR=${HARMONIA_AQUILA_DEST_DIR:-"$REPO_ROOT/etc/albums/3-organized-files"}
CLI="$REPO_ROOT/build/dist/index.js"

if [[ ! -f "$CLI" ]]; then
  echo "Missing built CLI: $CLI. Run npm run build first." >&2
  exit 1
fi

SOURCE_DIR="$SOURCE_ROOT/Iced Earth - 2001 - Dark Genesis [EAC-FLAC]"

node "$CLI" manage-albums organize-files \
  --source-dirs \
  "$SOURCE_DIR/01 - enter the realm" \
  "$SOURCE_DIR/02 - iced earth" \
  "$SOURCE_DIR/03 - night of the stormrider" \
  "$SOURCE_DIR/04 - burnt offerings" \
  "$SOURCE_DIR/05 - tribute to the gods" \
  --dest-dir "$DEST_DIR" \
  --disc-strategy concatenate \
  --destination-strategy error \
  --format json
