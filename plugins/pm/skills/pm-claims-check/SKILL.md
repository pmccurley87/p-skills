---
name: pm-claims-check
description: Read-only production view of the live Claimit claims for one or more couriers and/or clients. Lists every open claim with its status, how long it has sat there and when anything last happened, plus what was credited, rejected, found or otherwise closed in a recent window, with every tracking number linked to its portal claim. It spot-checks at least five recent claims in full for quality, and for clients that email claim files it lists the latest files and whether they imported cleanly. Use when Patrick asks how a courier or client is doing, wants a claims check, backlog or "what's stuck" view, or schedules a recurring claims report.
---

# Claimit claims check

Give Patrick clear sight of the **live claims** for a scope of couriers and/or clients, using production data, read-only. Two things matter:

1. **Open claims.** Every non-terminal claim, whatever its age: what status it is in, how long it has been there, and whether anything is still happening on it.
2. **Recent outcomes.** What closed in the last **N days** (default 7): credited, rejected, found, old claim, plus claims accepted but not yet paid.

**Do not report all-time totals of closed claims.** How many claims were ever credited or rejected is noise here. Closed claims appear only when they closed inside the window.

## Inputs

Parse them from the arguments or the request. Free text is fine.

| Input | Meaning | Default |
| --- | --- | --- |
| `courier=` | One or more courier names, comma-separated | all couriers |
| `client=` | One or more client names, comma-separated | all clients |
| `days=` | Look-back window for closed outcomes | 7 |

At least one of courier or client is required. Examples: `/pm-claims-check courier=EVRi`, `/pm-claims-check client=Back Market courier=DPD days=14`.

## Rules

- **Read-only.** Run SELECT statements only. This skill never writes, even if a result looks wrong.
- **Production by default.** Pass `--db-prod`. Use dev only if the request says dev.
- **Copy identifiers from query output.** Never retype a GUID, tracking number or name from memory or from a wrapped table cell.
- **Link every tracking number** to `https://my.claimit.ai/claim/{claimId}/detail`, using the lowercase `Claims.Id`.
- **Flag test records, do not drop them.** A claim whose tracking number or client name is plainly a test (for example a tracking number starting with "test") stays in the counts and is named under "Worth a look".
- **Scheduled runs cannot ask questions.** When a name is ambiguous, follow the resolution rule below and state what was included at the top of the report.
- **Say it in words, not IDs.** The reader does not know what a status ID or reason ID means. Name every status and outcome, and give the rejection reason for every rejection. Show an ID only next to its name, when two statuses share one.

## Running SQL

Run every query through the bundled helper. It calls the Claimit CLI from the main checkout inside a wide pseudo-terminal, because the CLI wraps tables at 80 columns when piped. It also refuses anything that is not a SELECT or WITH query.

```bash
<skill-dir>/scripts/claimit-sql.sh "<query>"          # production
<skill-dir>/scripts/claimit-sql.sh "<query>" --dev    # dev, only when asked
```

`<skill-dir>` is the base directory shown when this skill loads, which is the folder holding this SKILL.md.

The CLI cuts any single cell at 80 characters. Keep each column short, and put only the tracking number and claim ID together in one `Link` column. If the CLI binary is missing, run `dotnet build` in `backend/Temporal/Claimit.Cli` once, then retry. Set `CLAIMIT_CLI_DIR` to use a different checkout. Run independent queries in parallel.

## Step 1: resolve the scope

Look up each name with a LIKE match.

```sql
SELECT CourierId, Name, RegionCode FROM Couriers WHERE Name LIKE '%<courier>%' ORDER BY Name
SELECT ClientId, Name FROM Clients WHERE Name LIKE '%<client>%' ORDER BY Name
```

- If exactly one row matches, use it.
- If an exact case-insensitive name match exists among several rows, use only the exact rows (a courier name can exist once per region, so several exact rows are normal).
- Otherwise, in an interactive run, show the candidates and ask. In a scheduled run, include every candidate and list them in the report.
- If nothing matches, stop and say so.

Build one scope predicate from the resolved IDs and reuse it in every query below as `{SCOPE}`. Example: `l.CourierId IN ('<id1>') AND l.ClientId IN ('<id2>')`. Omit the clause for an input that was not given.

### Batch couriers: skip New claims under 24 hours old

Some couriers are submitted in batches that run several times a day, so a New claim there is normal until the next batch picks it up. For these couriers, leave out any New claim created in the last 24 hours.

| Courier name | Why |
| --- | --- |
| EVRi | Claims are submitted in batches throughout the day |

Add a courier to this table only when its claims are known to be batch-submitted. If any courier in this table is in scope (an unscoped courier input counts), resolve its `CourierId`s by exact name and build `{BATCH_GRACE}` for the open-claim queries in Steps 2 and 3:

```sql
AND NOT (c.ClaimStatusId = 1
         AND c.CreatedAt >= DATEADD(hour, -24, GETUTCDATE())
         AND l.CourierId IN ('<batch courier id>'))
```

When no batch courier is in scope, `{BATCH_GRACE}` is empty. Count the claims it leaves out (the same three conditions plus `{SCOPE}`) and state that count in the report's Scope section, so nothing disappears silently. A New claim older than 24 hours is reported as usual, because it has missed at least one batch.

## Status groups

Source of truth is `ClaimStatusExtensions.TerminalStatusIds` in the Claimit backend; check it if a new status appears.

| Group | Status IDs |
| --- | --- |
| New | 1 |
| Open | every non-terminal status, **including New**, and including 5 Accepted, which is not yet paid |
| Terminal (closed) | 6 Credited, 8 Rejected (assumed), 9 Rejected, 12 Found, 14 Old claim, 22 Rejected (invalid) |

Several IDs share a display name: 8, 9 and 22 are all "Rejected", 3 and 4 are both "Submitted", 10 and 13 are both "Searching". Report the terminal Rejected IDs as one Rejected total, broken down by rejection reason (Step 4), not by ID. Show the other duplicates as separate rows with the ID next to the name.

## Step 2: open claims by status

One summary row per open status. "In status" runs from the latest move into the current status and falls back to `CreatedAt`. "Quiet" means no log entry of any kind for over 90 days.

```sql
SELECT c.ClaimStatusId AS Id, s.Name AS Status, COUNT(*) AS N,
       SUM(CASE WHEN a.D <= 7 THEN 1 ELSE 0 END) AS D0_7,
       SUM(CASE WHEN a.D BETWEEN 8 AND 30 THEN 1 ELSE 0 END) AS D8_30,
       SUM(CASE WHEN a.D BETWEEN 31 AND 90 THEN 1 ELSE 0 END) AS D31_90,
       SUM(CASE WHEN a.D > 90 THEN 1 ELSE 0 END) AS D90plus,
       SUM(CASE WHEN la.LastAt < DATEADD(day, -90, GETUTCDATE()) THEN 1 ELSE 0 END) AS Quiet90,
       SUM(c.ValueRetail) AS Retail
FROM Claims c
JOIN ClientCourierLogins l ON l.ClientCourierLoginId = c.ClientCourierLoginId
JOIN ClaimStatuses s ON s.Id = c.ClaimStatusId
CROSS APPLY (SELECT COALESCE(
    (SELECT MAX(e.LoggedAt) FROM ClaimLogEntries e
     WHERE e.ClaimId = c.Id AND e.CurrentClaimStatus = c.ClaimStatusId
       AND (e.PreviousClaimStatus IS NULL OR e.PreviousClaimStatus <> c.ClaimStatusId)),
    c.CreatedAt) AS Since) ss
CROSS APPLY (SELECT DATEDIFF(day, ss.Since, GETUTCDATE()) AS D) a
CROSS APPLY (SELECT COALESCE((SELECT MAX(e.LoggedAt) FROM ClaimLogEntries e WHERE e.ClaimId = c.Id), c.CreatedAt) AS LastAt) la
WHERE {SCOPE} AND c.ClaimStatusId NOT IN (6, 8, 9, 12, 14, 22) {BATCH_GRACE}
GROUP BY c.ClaimStatusId, s.Name
ORDER BY c.ClaimStatusId
```

When the scope covers several clients, add open claims per client:

```sql
SELECT cl.Name AS Client, COUNT(*) AS [Open], SUM(CASE WHEN c.ClaimStatusId = 1 THEN 1 ELSE 0 END) AS New
FROM Claims c
JOIN ClientCourierLogins l ON l.ClientCourierLoginId = c.ClientCourierLoginId
JOIN Clients cl ON cl.ClientId = l.ClientId
WHERE {SCOPE} AND c.ClaimStatusId NOT IN (6, 8, 9, 12, 14, 22) {BATCH_GRACE}
GROUP BY cl.Name
ORDER BY [Open] DESC
```

## Step 3: the open claims themselves

```sql
SELECT CONCAT(c.TrackingNumber, '|', LOWER(CONVERT(varchar(36), c.Id))) AS Link,
       cl.Name AS Client, c.ClaimStatusId AS Id, s.Name AS Status,
       DATEDIFF(day, ss.Since, GETUTCDATE()) AS DaysInStatus,
       CONVERT(varchar(10), la.LastAt, 23) AS LastActivity, c.ValueRetail
FROM Claims c
JOIN ClientCourierLogins l ON l.ClientCourierLoginId = c.ClientCourierLoginId
JOIN Clients cl ON cl.ClientId = l.ClientId
JOIN ClaimStatuses s ON s.Id = c.ClaimStatusId
CROSS APPLY (SELECT COALESCE(
    (SELECT MAX(e.LoggedAt) FROM ClaimLogEntries e
     WHERE e.ClaimId = c.Id AND e.CurrentClaimStatus = c.ClaimStatusId
       AND (e.PreviousClaimStatus IS NULL OR e.PreviousClaimStatus <> c.ClaimStatusId)),
    c.CreatedAt) AS Since) ss
CROSS APPLY (SELECT COALESCE((SELECT MAX(e.LoggedAt) FROM ClaimLogEntries e WHERE e.ClaimId = c.Id), c.CreatedAt) AS LastAt) la
WHERE {SCOPE} AND c.ClaimStatusId NOT IN (6, 8, 9, 12, 14, 22) {BATCH_GRACE}
ORDER BY c.ClaimStatusId, ss.Since
```

Split `Link` at the `|` into the tracking number and claim ID.

- **50 or fewer open claims:** list them all, grouped by status, oldest first.
- **More than 50:** add `TOP 25` and a `c.ClaimStatusId = <id>` filter, and run it once per status that has claims, so each status shows its 25 longest-waiting claims. Say how many were left out per status.

## Step 4: recent outcomes

Status changes into a closed status, or into Accepted, inside the window. Rejection reasons live in `Claim_RejectionReasons` (one or more rows per claim). The name comes from `Claim_RejectionReasons_Claimit`, then `Claim_RejectionReasons_Courier`, then the free `RejectionText`.

```sql
SELECT CONCAT(c.TrackingNumber, '|', LOWER(CONVERT(varchar(36), c.Id))) AS Link,
       cl.Name AS Client, e.CurrentClaimStatus AS Id, s.Name AS Outcome,
       LEFT(rr.Reason, 40) AS Reason,
       CONVERT(varchar(10), e.LoggedAt, 23) AS Changed, c.CreditAmount, c.ValueRetail
FROM ClaimLogEntries e
JOIN Claims c ON c.Id = e.ClaimId
JOIN ClientCourierLogins l ON l.ClientCourierLoginId = c.ClientCourierLoginId
JOIN Clients cl ON cl.ClientId = l.ClientId
JOIN ClaimStatuses s ON s.Id = e.CurrentClaimStatus
OUTER APPLY (SELECT STRING_AGG(x.R, '; ') AS Reason FROM (
    SELECT DISTINCT COALESCE(rc.ClaimitRejectionReason, cr.CourierRejectionReason, r.RejectionText) AS R
    FROM Claim_RejectionReasons r
    LEFT JOIN Claim_RejectionReasons_Claimit rc ON rc.Id = r.Claimit_RejectionReasonId
    LEFT JOIN Claim_RejectionReasons_Courier cr ON cr.Id = r.Courier_RejectionReasonId
    WHERE r.ClaimId = c.Id AND e.CurrentClaimStatus IN (8, 9, 22)) x) rr
WHERE {SCOPE}
  AND e.LoggedAt >= DATEADD(day, -<days>, GETUTCDATE())
  AND e.CurrentClaimStatus IN (5, 6, 8, 9, 12, 14, 22)
  AND (e.PreviousClaimStatus IS NULL OR e.PreviousClaimStatus <> e.CurrentClaimStatus)
ORDER BY e.LoggedAt DESC
```

- Count claims per outcome: Credited (6), Rejected (8, 9 and 22 together), Found (12), Old claim (14), Accepted (5).
- Always break rejections down by reason, whatever the volume:

```sql
WITH rej AS (
  SELECT DISTINCT c.Id FROM ClaimLogEntries e
  JOIN Claims c ON c.Id = e.ClaimId
  JOIN ClientCourierLogins l ON l.ClientCourierLoginId = c.ClientCourierLoginId
  WHERE {SCOPE} AND e.LoggedAt >= DATEADD(day, -<days>, GETUTCDATE())
    AND e.CurrentClaimStatus IN (8, 9, 22)
    AND (e.PreviousClaimStatus IS NULL OR e.PreviousClaimStatus <> e.CurrentClaimStatus))
SELECT LEFT(COALESCE(rc.ClaimitRejectionReason, cr.CourierRejectionReason, r.RejectionText,
                     '(no reason recorded)'), 60) AS Reason,
       COUNT(DISTINCT rej.Id) AS Claims
FROM rej
LEFT JOIN Claim_RejectionReasons r ON r.ClaimId = rej.Id
LEFT JOIN Claim_RejectionReasons_Claimit rc ON rc.Id = r.Claimit_RejectionReasonId
LEFT JOIN Claim_RejectionReasons_Courier cr ON cr.Id = r.Courier_RejectionReasonId
GROUP BY COALESCE(rc.ClaimitRejectionReason, cr.CourierRejectionReason, r.RejectionText, '(no reason recorded)')
ORDER BY Claims DESC
```

  A claim with several reasons counts under each, so the reason counts can add up to more than the rejected total; say so when they do. Report "(no reason recorded)" as its own row rather than dropping it.
- Accepted is not closed. Keep it out of the closed total. A claim accepted and then credited inside the window appears under both.
- List every outcome when there are 25 or fewer. Above that, give counts per outcome and client, plus the 25 most recent.
- When the window is empty, find the latest credit and the latest rejection for the scope so the report can say how long it has been quiet:

```sql
SELECT s.Name AS Outcome, CONVERT(varchar(10), MAX(e.LoggedAt), 23) AS LastChange
FROM ClaimLogEntries e
JOIN Claims c ON c.Id = e.ClaimId
JOIN ClientCourierLogins l ON l.ClientCourierLoginId = c.ClientCourierLoginId
JOIN ClaimStatuses s ON s.Id = e.CurrentClaimStatus
WHERE {SCOPE} AND e.CurrentClaimStatus IN (6, 8, 9, 22)
GROUP BY s.Name
```

The log is the source of truth for the window. A bulk write can close claims without a log entry. If the counts look implausibly low for a busy scope, also count claims whose `ClaimClosedDate` or `CreditApprovedDate` falls in the window, and report both.

## Step 5: claim-file feeds

Some clients send their claims as files by email. Each email runs a `ProcessEmailWorkflow` on self-hosted Temporal (`claimit-prod`). That workflow stages the attachment and hands it to the claims-agent `ProcessBulkImport` activity, which returns how many rows it read, created, skipped and escalated. Run this step only when a scope in this table is in scope:

| Scope (courier × client) | Mailbox prefix (`CourierName`) | Expected file | Slack channel | Notes |
| --- | --- | --- | --- | --- |
| EVRi × eBay UK | `_carrier_claims@ebay` | `Claims_Report_New_MS_Principal_EVRi - <date>.xlsx`, one a day around 17:00 UTC | `#ebay-claims` (`C0B0RE7DM0D`) | `*_claim_outcome.csv` files are EVRi challenge outcomes. The EVRi response job applies them, so a claims-agent run that escalates them is a harmless duplicate, not a failure. |

The mailbox also carries other files, such as other couriers' reports. **Always list every file for the scope's courier in the window**, newest first, even when every run went well; this list is the first thing Patrick reads for a feed scope. Mention other couriers' files only when they failed or were escalated. Use the Notes column before calling a run a failure.

### Temporal: what arrived and how the import went

```bash
<skill-dir>/scripts/ingest-runs.sh "<mailbox prefix>" <days>
```

It prints one line per staged file, newest first: start time, workflow ID, file name, then `rows`, `created`, `dupes`, `invalid`, `escalated` and `brace`. `brace` means the agent stopped and asked for a human. Up to three escalation reasons follow. It needs `kubectl` access to `claimit-temporal-aks`; if that fails, say so in the report and carry on.

Judge each run:

- **Went well:** the import completed, `created + dupes + invalid` equals `rows`, and `invalid`, `escalated` and `brace` are all zero.
- **Needs a look:** the import failed or has no result, any rows are invalid or escalated, or `brace` is true. Quote the reason in plain words.
- **Missing:** an expected day has no file. A weekend gap counts too unless the feed is known to skip weekends.
- **Stale resend:** the same row count with every row a duplicate, several days running, usually means the client is resending an old file. Report it as a note, not a failure.

### Database: did the claims land

Compare each import's `created` count with the claims created for the scope that day:

```sql
SELECT CONVERT(varchar(10), c.CreatedAt, 23) AS Created, s.Name AS Status, COUNT(*) AS N
FROM Claims c
JOIN ClientCourierLogins l ON l.ClientCourierLoginId = c.ClientCourierLoginId
JOIN ClaimStatuses s ON s.Id = c.ClaimStatusId
WHERE {SCOPE} AND c.CreatedAt >= DATEADD(day, -<days>, GETUTCDATE())
GROUP BY CONVERT(varchar(10), c.CreatedAt, 23), s.Name
ORDER BY 1, 2
```

The imported claims' current statuses also show how that file is doing, for example how many have already been rejected and for what reason.

### Slack: what was posted

After each import the claims-agent posts a summary to the scope's Slack channel, and people often reply there. Read the channel for the window if a Slack tool, or a browser already signed in to Slack, is available. Look for failure posts, posts for files Temporal did not show, and human replies that flag a problem. Do not sign in on Patrick's behalf. If Slack cannot be read, write "Slack not checked" in the report; Temporal remains the source of truth for the counts.

## Step 6: spot checks

Quality-check at least **5 claims** from the last 5 days by reading each one in full. The aim is a general check that what Claimit holds and did is right, not a count.

### Pick the claims

Two claims submitted in the last 2 days, at random:

```sql
SELECT TOP 2 CONCAT(c.TrackingNumber, '|', LOWER(CONVERT(varchar(36), c.Id))) AS Link,
       CONVERT(varchar(16), e.LoggedAt, 120) AS SubmittedAt, s.Name AS NowStatus
FROM ClaimLogEntries e
JOIN Claims c ON c.Id = e.ClaimId
JOIN ClientCourierLogins l ON l.ClientCourierLoginId = c.ClientCourierLoginId
JOIN ClaimStatuses s ON s.Id = c.ClaimStatusId
WHERE {SCOPE} AND e.LoggedAt >= DATEADD(day, -2, GETUTCDATE())
  AND e.CurrentClaimStatus IN (3, 4)
  AND (e.PreviousClaimStatus IS NULL OR e.PreviousClaimStatus NOT IN (3, 4))
ORDER BY NEWID()
```

At least three more spread across the 5 days. This returns one random claim for each day and each status a claim moved into:

```sql
WITH ev AS (
  SELECT c.Id, c.TrackingNumber, e.CurrentClaimStatus AS ToStatus,
         DATEDIFF(day, e.LoggedAt, GETUTCDATE()) AS DaysAgo,
         ROW_NUMBER() OVER (PARTITION BY DATEDIFF(day, e.LoggedAt, GETUTCDATE()), e.CurrentClaimStatus
                            ORDER BY NEWID()) AS rn
  FROM ClaimLogEntries e
  JOIN Claims c ON c.Id = e.ClaimId
  JOIN ClientCourierLogins l ON l.ClientCourierLoginId = c.ClientCourierLoginId
  WHERE {SCOPE} AND e.LoggedAt >= DATEADD(day, -5, GETUTCDATE())
    AND e.CurrentClaimStatus IS NOT NULL
    AND (e.PreviousClaimStatus IS NULL OR e.PreviousClaimStatus <> e.CurrentClaimStatus))
SELECT CONCAT(ev.TrackingNumber, '|', LOWER(CONVERT(varchar(36), ev.Id))) AS Link, ev.DaysAgo, s.Name AS MovedTo
FROM ev JOIN ClaimStatuses s ON s.Id = ev.ToStatus
WHERE ev.rn = 1
ORDER BY ev.DaysAgo, s.Name
```

From that list, pick claims that cover as many different days and statuses as possible, for example one credited, one rejected and one still open. Skip any claim already picked. If the scope has fewer than 5 claims with activity in the window, check all of them and say so.

### Read each claim

```bash
<skill-dir>/scripts/spot-check.sh <claimId>
```

It prints the claim's fields, timeline, files, rejection reasons and the emails that mention its tracking number. Before judging, read the client's playbook in the Claimit checkout, `docs/couriers/courier-submissions/<courier>/<client>.md`, plus the courier's base playbook, for the evidence it requires, its value model and its claim window. Check:

- **Claim type.** It fits the contents and damage text: a Damaged claim has a damage description, and a Lost claim does not read like a damage report.
- **Values.** They are above zero, plausible for the contents, and filled in the way the playbook's value model says.
- **Dates.** A collection date is present, and the claim's age at submission fits the courier's claim window. Created, raised and the status moves come in a sensible order.
- **Evidence.** The files match what the playbook requires; flag a required file that is missing, or evidence where none is expected.
- **Timeline.** There are no repeated or contradictory moves, no automation errors and no long stalls.
- **Emails.** Look for the source email, the submission and any courier replies. Claims that arrive inside a file often have no email that names their tracking number, so zero emails is only a concern when the timeline says an email was sent or received.
- **Outcome.** A rejection reason or credit fits the data, for example an outside-window rejection on a claim that really was filed late.

Give each claim a verdict: **looks right**, or **concern** with one sentence saying what is wrong.

## Report

Lead with one sentence: how many claims are open, how many of those are New, how many have been quiet for 90 days, and how many closed in the window. Then:

1. **Scope.** The resolved courier and client names, and the window. If the batch-courier rule left out any New claims, say how many and why.
2. **Open claims.** The status summary from Step 2, with columns for 0–7, 8–30, 31–90 and over 90 days in status, and the quiet count. Add the per-client table when there are several clients.
3. **Claims.** The Step 3 list under a sub-heading per status: linked tracking number, client, days in status, last activity and retail value.
4. **Last N days.** Outcome counts, then the rejections by reason, then the list of claims with linked tracking number, client, outcome, rejection reason where there is one, date and credit amount where there is one.
5. **Claim files** (always, when the scope has a feed in Step 5). A table of every file for the scope's courier in the window, newest first: date, file name, rows, created, duplicates, invalid, escalated, and a verdict of went well, needs a look, missing or stale resend. Then the database cross-check in one line and anything from Slack, or "Slack not checked". If Temporal could not be reached, say so here instead of dropping the section.
6. **Spot checks.** A table of the checked claims: linked tracking number, why it was picked, status, claim type, evidence, emails found, and the verdict. Follow it with one or two sentences on any pattern across the claims.
7. **Worth a look.** Two or three sentences at most: claims stuck in one status far longer than the rest, statuses that are entirely quiet, a long gap since the last credit, a rejection reason that dominates or is new, a claim file that failed, was escalated or went missing, test records. Omit when nothing stands out.

Use tables for numbers. Keep prose short. Do not explain the SQL.

## Scheduling

This skill needs the local Claimit checkout and Patrick's Azure sign-in to reach the production database, and `kubectl` access to `claimit-temporal-aks` for Step 5. Schedule it as a local desktop task, not a cloud routine, because a cloud agent has neither. Put the full arguments in the scheduled prompt, for example `/pm-claims-check courier=Royal Mail days=7`, so each run is self-contained.
