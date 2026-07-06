#!/bin/bash

SOURCE_DIR=$1
DEST_DIR=$2

node . fix-tags \
  --source-dir "$SOURCE_DIR" \
  --dest-dir "$DEST_DIR" \
  --execute
