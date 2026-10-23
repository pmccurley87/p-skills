#!/bin/sh
# List recent emailed claim-file imports on self-hosted Temporal (claimit-prod), read-only.
# Usage: ingest-runs.sh "<CourierName prefix>" [days] [subject filter]
# Prints one line per ProcessEmailWorkflow that staged a file, newest first: start time, workflow ID,
# file, and the ProcessBulkImport counts, or the failure. Needs kubectl access to claimit-temporal-aks.
set -eu
[ $# -ge 1 ] || { echo "usage: $0 \"<CourierName prefix>\" [days] [subject filter]" >&2; exit 2; }
PREFIX="$1"; DAYS="${2:-7}"; FILTER="${3:-}"
PORT="${INGEST_RUNS_PORT:-17233}"
HERE=$(cd "$(dirname "$0")" && pwd)
SINCE=$(date -u -v-"${DAYS}"d +%Y-%m-%dT%H:%M:%SZ 2>/dev/null || date -u -d "-${DAYS} days" +%Y-%m-%dT%H:%M:%SZ)

kubectl --context claimit-temporal-aks -n temporal-system port-forward svc/temporal-frontend "$PORT:7233" >/dev/null 2>&1 &
PF=$!
trap 'kill $PF 2>/dev/null' EXIT INT TERM
sleep 4

t() { temporal "$@" --address "localhost:$PORT" --tls --tls-server-name temporal-grpc.claimit.ai --namespace claimit-prod; }

IDS=$(t workflow list --limit 200 -o json \
  --query "WorkflowType='ProcessEmailWorkflow' AND CourierName STARTS_WITH '$PREFIX' AND StartTime > '$SINCE'" \
  | python3 -c 'import json,sys; [print(w["execution"]["workflowId"]) for w in json.load(sys.stdin)]')

for id in $IDS; do
  t workflow show -w "$id" -o json 2>/dev/null | python3 "$HERE/ingest-run-summary.py" "$id" "$FILTER"
done
