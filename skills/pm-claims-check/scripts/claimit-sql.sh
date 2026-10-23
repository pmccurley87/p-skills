#!/bin/sh
# Run one read-only SQL query through the Claimit CLI with an unwrapped table.
# Usage: claimit-sql.sh "<SELECT ...>" [--dev]
# The CLI wraps tables at 80 columns when piped, so run it in a wide pseudo-terminal.
set -eu
CLI_DIR="${CLAIMIT_CLI_DIR:-/Applications/Dev/Claimit/code/backend/Temporal/Claimit.Cli}"
[ $# -ge 1 ] || { echo "usage: $0 \"<query>\" [--dev]" >&2; exit 2; }
CLAIMS_CHECK_SQL="$1"
DB_FLAG="--db-prod"
[ "${2:-}" = "--dev" ] && DB_FLAG=""
case "$(printf '%s' "$CLAIMS_CHECK_SQL" | tr '[:lower:]' '[:upper:]' | sed 's/^[[:space:]]*//')" in
  SELECT*|WITH*) ;;
  *) echo "refusing: only SELECT/WITH queries are allowed" >&2; exit 3 ;;
esac
export CLAIMS_CHECK_SQL DB_FLAG
cd "$CLI_DIR"
script -q /dev/null sh -c 'stty cols 400; dotnet run --no-build -- sql "$CLAIMS_CHECK_SQL" $DB_FLAG --no-limit' </dev/null 2>&1 \
  | tr -d '\r' | sed 's/\x1b\[[0-9;?]*[A-Za-z]//g' | sed -n '/╭/,$p'
