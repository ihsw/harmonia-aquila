#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)
REPO_ROOT=$(cd -- "$SCRIPT_DIR/.." && pwd)

HOST=${HARMONIA_AQUILA_WEB_HOST:-127.0.0.1}
PORT=${HARMONIA_AQUILA_WEB_PORT:-3000}
SOURCE_DIR=${HARMONIA_AQUILA_SOURCE_DIR:-etc/albums/1-source-files}
DEST_DIR=${HARMONIA_AQUILA_DEST_DIR:-etc/albums/3-organized-files}
BASE_URL="http://$HOST:$PORT"
SUMMARY_ENDPOINT="$BASE_URL/manage-albums/summarize-source-dir"
SERVER_LOG=$(mktemp "${TMPDIR:-/tmp}/harmonia-aquila-web-serve.XXXXXX.log")
SERVER_PID=

if [[ "$#" -ne 1 ]]; then
  echo "Usage: $0 <dir-name>" >&2
  exit 1
fi

DIR_NAME=$1

curl_summary() {
  curl --fail --silent --get "$SUMMARY_ENDPOINT" \
    --data-urlencode "dirName=$DIR_NAME" \
    --data-urlencode "ignoreNonAudioFiles=true" \
    "$@"
}

cleanup() {
  local status=$?

  if [[ -n "$SERVER_PID" ]] && kill -0 "$SERVER_PID" 2>/dev/null; then
    kill "$SERVER_PID"
    wait "$SERVER_PID" 2>/dev/null || true
  fi

  rm -f "$SERVER_LOG"
  exit "$status"
}

trap cleanup EXIT INT TERM

cd "$REPO_ROOT"

node . web serve \
  --source-dir "$SOURCE_DIR" \
  --dest-dir "$DEST_DIR" \
  --host "$HOST" \
  --port "$PORT" \
  >"$SERVER_LOG" 2>&1 &
SERVER_PID=$!

for attempt in {1..50}; do
  if ! kill -0 "$SERVER_PID" 2>/dev/null; then
    echo "web serve exited before it was ready:" >&2
    cat "$SERVER_LOG" >&2
    exit 1
  fi

  if curl_summary --data-urlencode "limit=0" --output /dev/null; then
    break
  fi

  if [[ "$attempt" -eq 50 ]]; then
    echo "Timed out waiting for web serve at $BASE_URL:" >&2
    cat "$SERVER_LOG" >&2
    exit 1
  fi

  sleep 0.2
done

curl_summary --show-error \
  | node -e 'const fs = require("node:fs"); process.stdout.write(`${JSON.stringify(JSON.parse(fs.readFileSync(0, "utf8")), null, 2)}\n`)'
cat "$SERVER_LOG"
