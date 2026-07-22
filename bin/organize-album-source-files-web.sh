#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)
REPO_ROOT=$(cd -- "$SCRIPT_DIR/.." && pwd)

HOST=${HARMONIA_AQUILA_WEB_HOST:-127.0.0.1}
PORT=${HARMONIA_AQUILA_WEB_PORT:-3000}
SOURCE_PARENT_DIR=${HARMONIA_AQUILA_SOURCE_PARENT_DIR:-etc/albums/1-source-files}
DEST_DIR=${HARMONIA_AQUILA_DEST_DIR:-etc/albums/3-organized-files}
REPORT_DIR=${HARMONIA_AQUILA_REPORT_DIR:-reports/album-organization-runs/2026-07-21-lufia-ost-web}
BASE_URL="http://$HOST:$PORT"
VALIDATE_ENDPOINT="$BASE_URL/manage-albums/validate"
SUMMARY_ENDPOINT="$BASE_URL/manage-albums/summarize-source-dir"
ORGANIZE_ENDPOINT="$BASE_URL/manage-albums/organize-files"
SERVER_LOG=$(mktemp "${TMPDIR:-/tmp}/harmonia-aquila-web-serve.XXXXXX.log")
SERVER_PID=
EXECUTE=false

usage() {
  echo "Usage: $0 <dir-name> [--execute]" >&2
}

if [[ "$#" -lt 1 || "$#" -gt 2 ]]; then
  usage
  exit 1
fi

DIR_NAME=$1

if [[ "$#" -eq 2 ]]; then
  if [[ "$2" != "--execute" ]]; then
    usage
    exit 1
  fi

  EXECUTE=true
fi

SOURCE_DIR="$SOURCE_PARENT_DIR/$DIR_NAME"

if [[ ! -d "$SOURCE_DIR" ]]; then
  echo "Source directory does not exist: $SOURCE_DIR" >&2
  exit 1
fi

cleanup() {
  local status=$?

  if [[ -n "$SERVER_PID" ]] && kill -0 "$SERVER_PID" 2>/dev/null; then
    kill "$SERVER_PID"
    wait "$SERVER_PID" 2>/dev/null || true
  fi

  printf '\n--- web serve log ---\n'
  cat "$SERVER_LOG"
  rm -f "$SERVER_LOG"
  exit "$status"
}

trap cleanup EXIT INT TERM

cd "$REPO_ROOT"
mkdir -p "$REPORT_DIR"

pretty_json() {
  node -e 'const fs = require("node:fs"); process.stdout.write(`${JSON.stringify(JSON.parse(fs.readFileSync(0, "utf8")), null, 2)}\n`)'
}

curl_get_album_dir() {
  local endpoint=$1

  shift
  curl --fail --show-error --silent --get "$endpoint" \
    --data-urlencode "dirName=." \
    --data-urlencode "ignoreNonAudioFiles=true" \
    "$@"
}

curl_get_album_dir_ready() {
  local endpoint=$1

  shift
  curl --fail --silent --get "$endpoint" \
    --data-urlencode "dirName=." \
    --data-urlencode "ignoreNonAudioFiles=true" \
    "$@"
}

organize_body() {
  node -e 'const execute = process.argv[1] === "true"; const body = { ignoreNonAudioFiles: true }; if (execute) body.execute = true; process.stdout.write(JSON.stringify(body));' "$1"
}

curl_organize() {
  local execute=$1

  curl --fail --show-error --silent \
    --request POST \
    --header 'Content-Type: application/json' \
    --data "$(organize_body "$execute")" \
    "$ORGANIZE_ENDPOINT"
}

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

  if curl_get_album_dir_ready "$VALIDATE_ENDPOINT" --data-urlencode "limit=0" --output /dev/null; then
    break
  fi

  if [[ "$attempt" -eq 50 ]]; then
    echo "Timed out waiting for web serve at $BASE_URL:" >&2
    cat "$SERVER_LOG" >&2
    exit 1
  fi

  sleep 0.2
done

VALIDATE_JSON=$(curl_get_album_dir "$VALIDATE_ENDPOINT")
printf '%s' "$VALIDATE_JSON" >"$REPORT_DIR/validate.json"
printf '%s\n' "$VALIDATE_JSON" | pretty_json
printf '%s\n' "$VALIDATE_JSON" | node -e 'const fs = require("node:fs"); const rows = JSON.parse(fs.readFileSync(0, "utf8")); if (!Array.isArray(rows)) throw new Error("validate response is not an array"); const invalid = rows.filter(row => row.status !== "valid" || !Array.isArray(row.issues) || row.issues.length !== 0); if (invalid.length > 0) { console.error(JSON.stringify(invalid, null, 2)); process.exit(1); }'

SUMMARY_JSON=$(curl_get_album_dir "$SUMMARY_ENDPOINT")
printf '%s' "$SUMMARY_JSON" >"$REPORT_DIR/summarize.json"
printf '%s\n' "$SUMMARY_JSON" | pretty_json

DRY_RUN_JSON=$(curl_organize false)
printf '%s' "$DRY_RUN_JSON" >"$REPORT_DIR/organize-dry-run.json"
printf '%s\n' "$DRY_RUN_JSON" | pretty_json
printf '%s\n' "$DRY_RUN_JSON" | node -e 'const fs = require("node:fs"); const rows = JSON.parse(fs.readFileSync(0, "utf8")); if (!Array.isArray(rows)) throw new Error("dry-run response is not an array");'

if [[ "$EXECUTE" == "true" ]]; then
  EXECUTE_JSON=$(curl_organize true)
  printf '%s' "$EXECUTE_JSON" >"$REPORT_DIR/organize-execute.json"
  printf '%s\n' "$EXECUTE_JSON" | pretty_json
fi
