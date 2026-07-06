#!/bin/bash

SOURCE_DIR=$1
DEST_DIR=$2

node . organize-files \
  --source-dir "$SOURCE_DIR" \
  --dest-dir "$DEST_DIR" \
  --artist-filename-strategy label \
  --title-filename-strategy subtitle \
  --execute
