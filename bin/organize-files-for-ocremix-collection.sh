#!/bin/bash

SOURCE_DIR=$1
DEST_DIR=$2

node . manage-albums organize-files \
  --source-dir "$SOURCE_DIR" \
  --dest-dir "$DEST_DIR" \
  --allow-multiple-albums \
  --ignore-non-audio-files \
  --title-filename-strategy subtitle \
  --album-artists-strategy aggregate \
  --set-artist "OverClocked ReMix" \
  --album-strategy grouping \
  --destination-strategy ignore \
  --limit 5 \
  --execute
