#!/bin/bash
set -eu

DIR="$HOME/bb-brain"
OUT="$DIR/codex-ingest-last.json"
LOCK="${TMPDIR:-/tmp}/bb-codex-intake-${UID}.lock"
SELF="$(cd "$(dirname "$0")" && pwd)/$(basename "$0")"

# This watcher creates metadata only. codex-ingest.js is the safety boundary and
# never returns message text, attachment content, paths, credentials or tool output.
if [ "${BB_CODEX_WATCH_LOCKED:-0}" != "1" ]; then
  BB_CODEX_WATCH_LOCKED=1 /usr/bin/lockf -t 0 "$LOCK" "$SELF" "$@"
  RC=$?
  [ "$RC" -eq 75 ] && exit 0
  exit "$RC"
fi

TMP="$(mktemp "$DIR/.codex-ingest-last.tmp.XXXXXX")"
trap 'rm -f "$TMP"' EXIT HUP INT TERM
chmod 600 "$TMP"
"$HOME/.local/node/bin/node" "$DIR/codex-ingest.js" > "$TMP"
"$HOME/.local/node/bin/node" -e 'const fs=require("fs");const p=process.argv[1];const d=JSON.parse(fs.readFileSync(p,"utf8"));if(d.version!==1||!d.messages||!Number.isInteger(d.messages.accepted))process.exit(1)' "$TMP"
mv -f "$TMP" "$OUT"
trap - EXIT HUP INT TERM
