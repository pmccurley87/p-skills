"""Summarise one ProcessEmailWorkflow history (JSON on stdin) as a claim-file import line.

Usage: temporal workflow show -w <id> -o json | python3 ingest-run-summary.py <workflowId> [subject filter]
Prints nothing when the workflow staged no file or the subject does not match the filter.
"""
import base64
import json
import sys


def decode(payloads):
    try:
        return json.loads(base64.b64decode(payloads["payloads"][0]["data"]))
    except Exception:
        return {}


def main():
    workflow_id = sys.argv[1]
    subject_filter = (sys.argv[2] if len(sys.argv) > 2 else "").lower()
    events = json.load(sys.stdin)["events"]

    scheduled, start, subject = {}, "", ""
    staged, result, failed = None, None, None
    for e in events:
        attrs = e.get("activityTaskScheduledEventAttributes")
        if attrs:
            scheduled[e["eventId"]] = attrs["activityType"]["name"]
        attrs = e.get("workflowExecutionStartedEventAttributes")
        if attrs:
            start = e.get("eventTime", "")[:16].replace("T", " ")
            inp = decode(attrs.get("input", {}))
            subject = inp.get("Subject") or inp.get("subject") or ""
        attrs = e.get("activityTaskCompletedEventAttributes")
        if attrs:
            name = scheduled.get(attrs["scheduledEventId"])
            if name == "StageBulkImportAttachment":
                staged = decode(attrs.get("result", {}))
            elif name == "ProcessBulkImport":
                result = decode(attrs.get("result", {}))
        attrs = e.get("activityTaskFailedEventAttributes")
        if attrs and scheduled.get(attrs["scheduledEventId"]) == "ProcessBulkImport":
            failed = attrs["failure"].get("message", "")[:200]

    if not staged or not staged.get("Found") or subject_filter not in subject.lower():
        return

    line = f"{start} | {workflow_id} | {staged.get('FileName', '')}"
    if result:
        line += (
            f" | rows={result.get('totalRows')} created={result.get('createdCount')}"
            f" dupes={result.get('skippedDuplicateCount')} invalid={result.get('skippedValidationCount')}"
            f" escalated={result.get('escalatedCount')} brace={result.get('braceFired')}"
        )
        if result.get("submissionError"):
            line += f" | submissionError={result['submissionError'][:120]}"
        reasons = result.get("escalationReasons") or []
        for reason in reasons[:3]:
            line += f"\n    reason: {reason[:200]}"
        if len(reasons) > 3:
            line += f"\n    (+{len(reasons) - 3} more reasons)"
    elif failed:
        line += f" | FAILED: {failed}"
    else:
        line += " | no import result (still running, or import skipped)"
    print(line)


if __name__ == "__main__":
    main()
