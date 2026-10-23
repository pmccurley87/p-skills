#!/bin/sh
# Pull everything needed to quality-check one claim, read-only: the claim's fields, its timeline,
# its files (evidence and courier documents), its rejection reasons and the emails that mention it.
# Usage: spot-check.sh <claimId> [--dev]
set -eu
[ $# -ge 1 ] || { echo "usage: $0 <claimId> [--dev]" >&2; exit 2; }
ID=$(printf '%s' "$1" | tr '[:upper:]' '[:lower:]')
case "$ID" in
  *[!0-9a-f-]*) echo "refusing: claim ID must be a GUID" >&2; exit 3 ;;
esac
DEV="${2:-}"
HERE=$(cd "$(dirname "$0")" && pwd)
CLI_DIR="${CLAIMIT_CLI_DIR:-/Applications/Dev/Claimit/code/backend/Temporal/Claimit.Cli}"
sql() { "$HERE/claimit-sql.sh" "$1" $DEV; }

echo "== Claim"
sql "SELECT f.Field, LEFT(f.Value, 70) AS Value
FROM Claims c
JOIN ClientCourierLogins l ON l.ClientCourierLoginId = c.ClientCourierLoginId
JOIN Clients cl ON cl.ClientId = l.ClientId
JOIN Couriers co ON co.CourierId = l.CourierId
JOIN ClaimStatuses s ON s.Id = c.ClaimStatusId
LEFT JOIN ClaimReasons r ON r.Id = c.ClaimReasonId
CROSS APPLY (VALUES
  (1, 'Tracking', c.TrackingNumber),
  (2, 'Client / courier', CONCAT(cl.Name, ' / ', co.Name)),
  (3, 'Status', s.Name),
  (4, 'Claim type', r.Name),
  (5, 'Retail / wholesale / claim', CONCAT(c.ValueRetail, ' / ', c.ValueWholesaleCost, ' / ', c.ClaimAmount)),
  (6, 'Credit', CONVERT(nvarchar(30), c.CreditAmount)),
  (7, 'Order ref', c.ClientOrderReference),
  (8, 'Courier claim ref', c.CourierClaimReference),
  (9, 'Collection date', CONVERT(varchar(10), c.CollectionDate, 23)),
  (10, 'Delivery date', CONVERT(varchar(10), c.DeliveryDate, 23)),
  (11, 'Created', CONCAT(CONVERT(varchar(16), c.CreatedAt, 120), ' by ', c.CreatedBy)),
  (12, 'Raised', CONVERT(varchar(16), c.RaisedAt, 120)),
  (13, 'To postcode', c.ToPostcode),
  (14, 'Contents', c.ContentDescription),
  (15, 'Damage', c.DamageDescription),
  (16, 'Service', c.ServiceCode)
) f(N, Field, Value)
WHERE c.Id = '$ID'
ORDER BY f.N"

echo "== Timeline"
sql "SELECT CONVERT(varchar(16), e.LoggedAt, 120) AS At, LEFT(e.LoggedBy, 18) AS LoggedBy,
       e.PreviousClaimStatus AS Prev, e.CurrentClaimStatus AS Cur, LEFT(e.Content, 75) AS Content
FROM ClaimLogEntries e WHERE e.ClaimId = '$ID' ORDER BY e.LoggedAt"

echo "== Files (type: 0 invoice, 1 credit note, 2 PoP, 3 PoC, 4 other evidence, 5 DOR, 7 claims, 8 courier document)"
sql "SELECT LEFT(f.FileName, 55) AS FileName, f.FileDataType AS Type,
       CONVERT(varchar(16), f.UploadedAt, 120) AS Uploaded, LEFT(f.UploadedBy, 20) AS UploadedBy
FROM FileData f WHERE f.OwnerId = '$ID' ORDER BY f.UploadedAt"

echo "== Rejection reasons"
sql "SELECT LEFT(COALESCE(rc.ClaimitRejectionReason, cr.CourierRejectionReason, '-'), 50) AS Reason,
       LEFT(r.RejectionText, 70) AS Text
FROM Claim_RejectionReasons r
LEFT JOIN Claim_RejectionReasons_Claimit rc ON rc.Id = r.Claimit_RejectionReasonId
LEFT JOIN Claim_RejectionReasons_Courier cr ON cr.Id = r.Courier_RejectionReasonId
WHERE r.ClaimId = '$ID'"

echo "== Emails"
TRACKING=$(sql "SELECT c.TrackingNumber AS T FROM Claims c WHERE c.Id = '$ID'" | sed -n 's/^│ \([^ │]*\) *│$/\1/p' | grep -v '^T$' | head -1)
if [ -n "$TRACKING" ]; then
  export TRACKING
  cd "$CLI_DIR"
  script -q /dev/null sh -c 'stty cols 300; dotnet run --no-build -- email search "$TRACKING" --view compact' </dev/null 2>&1 \
    | tr -d '\r' | sed 's/\x1b\[[0-9;?]*[A-Za-z]//g' | sed -n '/Found [0-9]* email/,$p' | grep -v '^─' | head -40
else
  echo "tracking number not found"
fi
