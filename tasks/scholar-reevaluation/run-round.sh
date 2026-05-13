#!/usr/bin/env bash
# run-round.sh — fire one Permaculture Scholar prompt against NotebookLM.
#
# Usage:
#   run-round.sh <round>  fresh         # cold-thread (no conversation ID)
#   run-round.sh <round>  continued     # continue 48a34396-… (original 2026-04-28 thread)
#   run-round.sh <round>  <conv-id>     # continue an arbitrary conversation
#
# <round> is one of: 1A, 1B, 1C.
#
# The wrapper concatenates 2026-05-13-round1-description.md + the
# round's prompt file into a temp file, then invokes
# `python C:/Temp/ask.py <temp> <out-json> <conv-id-or-->`.
# Output JSON lands at ./output/r{round}-{thread}.json.

set -euo pipefail

if [[ $# -ne 2 ]]; then
  echo "usage: $0 <1A|1B|1C> <fresh|continued|<conv-id>>" >&2
  exit 2
fi

ROUND="$1"
THREAD="$2"

DIR="$(cd "$(dirname "$0")" && pwd)"
DESC="$DIR/2026-05-13-round1-description.md"

case "$ROUND" in
  1A) PROMPT="$DIR/2026-05-13-round1A-reaudit.md" ;;
  1B) PROMPT="$DIR/2026-05-13-round1B-gap-verification.md" ;;
  1C) PROMPT="$DIR/2026-05-13-round1C-fresh-recs.md" ;;
  *) echo "unknown round: $ROUND" >&2; exit 2 ;;
esac

case "$THREAD" in
  fresh)     CONV="-"; SUFFIX="fresh" ;;
  continued) CONV="48a34396-5525-4a57-9884-108d93b1872f"; SUFFIX="continued" ;;
  *)         CONV="$THREAD"; SUFFIX="custom" ;;
esac

mkdir -p "$DIR/output"
OUT="$DIR/output/r${ROUND}-${SUFFIX}.json"
TMP="$(mktemp -t scholar-r${ROUND}-XXXXXX.md)"

{
  echo "# ATLAS (updated 2026-05-13) — context for this turn"
  echo
  cat "$DESC"
  echo
  echo "---"
  echo
  cat "$PROMPT"
} > "$TMP"

echo "→ firing R${ROUND} (${SUFFIX}) — temp prompt: $TMP"
echo "→ words: $(wc -w < "$TMP")"

python "C:/Temp/ask.py" "$TMP" "$OUT" "$CONV"

echo "→ wrote: $OUT"
