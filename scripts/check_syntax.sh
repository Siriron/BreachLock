#!/bin/bash
# Quick syntax-level check for a TSX/TS file using the globally-available
# esbuild binary. Does NOT verify against real package type definitions
# (no network access to npm install them) — only confirms the file
# parses as syntactically valid TypeScript/JSX. Run after writing or
# editing any component.
ESBUILD=/home/claude/.npm-global/lib/node_modules/tsx/node_modules/@esbuild/linux-x64/bin/esbuild
FILE="$1"
if [ -z "$FILE" ]; then
  echo "usage: check_syntax.sh <file.tsx>"
  exit 1
fi
"$ESBUILD" "$FILE" --format=esm --outfile=/tmp/syntax_check_out.js 2>&1
