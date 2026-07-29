#!/usr/bin/env python3
"""Run a validated work packet through an explicit Cursor worker profile."""

from __future__ import annotations

import argparse
import os
import shutil
import subprocess
import sys
import time
from pathlib import Path


WORKER_MODELS = {
    "composer": "composer-2.5-fast",
    "grok": "cursor-grok-4.5-high-fast",
}
MACOS_CURSOR = Path("/Applications/Cursor.app/Contents/Resources/app/bin/cursor")
REQUIRED_HEADINGS = (
    "Objective",
    "Files to inspect",
    "Files expected to change",
    "Required behavior",
    "Implementation steps",
    "Interfaces and signatures",
    "Tests to add",
    "Commands to run",
    "Acceptance criteria",
    "Things not to change",
)

WORKER_CONTRACT = """

## Worker contract

You are the bounded implementation worker for this packet.

- Inspect the listed context, implement the requested change, run the listed tests, and fix straightforward failures within scope.
- Do not change public interfaces or architecture unless the packet gives the exact new interface.
- Do not modify files outside "Files expected to change". If an unexpected file is required, stop and explain why.
- Preserve pre-existing changes. Do not commit, merge, push, install global software, access production, or perform destructive operations.
- If requirements conflict or expected behavior is ambiguous, stop and report the conflict instead of guessing.

Finish with: summary, files changed, commands and results, acceptance-criteria checklist, and remaining risks.
""".strip()


def resolve_cursor(explicit: str | None) -> Path:
    candidates = [
        explicit,
        os.environ.get("PM_CURSOR_BIN"),
        shutil.which("cursor-agent"),
        shutil.which("cursor"),
        str(MACOS_CURSOR) if MACOS_CURSOR.exists() else None,
    ]
    for candidate in candidates:
        if not candidate:
            continue
        path = Path(candidate).expanduser().resolve()
        if path.is_file() and os.access(path, os.X_OK):
            return path
    raise SystemExit(
        "Cursor CLI not found. Install `cursor agent`, add `cursor` or "
        "`cursor-agent` to PATH, or pass --cursor-bin."
    )


def agent_command(cursor: Path) -> list[str]:
    if cursor.name == "cursor-agent":
        return [str(cursor)]
    return [str(cursor), "agent"]


def read_and_validate_packet(packet_path: Path) -> str:
    if not packet_path.is_file():
        raise SystemExit(f"Work packet does not exist: {packet_path}")
    packet = packet_path.read_text(encoding="utf-8").strip()
    missing = [heading for heading in REQUIRED_HEADINGS if f"## {heading}" not in packet]
    if missing:
        raise SystemExit("Work packet is missing headings: " + ", ".join(missing))
    return packet


def format_elapsed(seconds: float) -> str:
    seconds = max(0.0, seconds)
    if seconds < 1:
        return f"{seconds:.3f}s"
    if seconds < 60:
        return f"{seconds:.1f}s"
    total = int(round(seconds))
    if total < 3600:
        minutes, remainder = divmod(total, 60)
        return f"{minutes}m{remainder:02d}s"
    hours, remainder = divmod(total, 3600)
    minutes, secs = divmod(remainder, 60)
    return f"{hours}h{minutes:02d}m{secs:02d}s"


def emit_receipt(worker: str, model: str, elapsed_seconds: float, exit_code: int) -> None:
    elapsed = format_elapsed(elapsed_seconds)
    line = (
        f"PM_CURSOR_AGENT_RECEIPT worker={worker} model={model} "
        f"elapsed_seconds={elapsed_seconds:.3f} elapsed={elapsed} exit_code={exit_code}"
    )
    sys.stderr.write(line + "\n")


def check_cursor(cursor: Path, model: str) -> int:
    result = subprocess.run(
        [*agent_command(cursor), "--version"],
        text=True,
        capture_output=True,
        check=False,
    )
    output = (result.stdout or result.stderr).strip()
    if output:
        print(f"Cursor CLI: {cursor}\n{output}")
    if result.returncode != 0:
        return result.returncode

    models = subprocess.run(
        [*agent_command(cursor), "models"],
        text=True,
        capture_output=True,
        check=False,
    )
    model_output = (models.stdout or models.stderr).strip()
    if models.returncode != 0:
        sys.stderr.write(model_output + "\n")
        return models.returncode
    model_lines = [line.strip() for line in model_output.splitlines() if line.strip()]
    available = any(line.split(maxsplit=1)[0] == model for line in model_lines)
    if not available:
        sys.stderr.write(f"Required model is unavailable: {model}\n")
        return 1
    print(f"Model available: {model}")
    return 0


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Validate and run a bounded work packet with an explicit Cursor worker."
    )
    parser.add_argument("--workspace", type=Path, help="Repository checkout for the worker.")
    parser.add_argument("--packet", type=Path, help="Markdown work packet to execute.")
    parser.add_argument("--cursor-bin", help="Explicit Cursor or cursor-agent executable.")
    parser.add_argument(
        "--worker",
        choices=tuple(WORKER_MODELS),
        default="composer",
        help="Worker profile: Composer for mechanical work; Grok for bounded logic-heavy work.",
    )
    parser.add_argument(
        "--mode",
        choices=("agent", "ask", "plan"),
        default="agent",
        help="Use agent for edits; ask and plan are read-only.",
    )
    parser.add_argument(
        "--output-format",
        choices=("text", "json", "stream-json"),
        default="text",
    )
    parser.add_argument("--check", action="store_true", help="Check CLI and model availability only.")
    parser.add_argument("--dry-run", action="store_true", help="Validate without launching Cursor.")
    args = parser.parse_args()

    cursor = resolve_cursor(args.cursor_bin)
    model = WORKER_MODELS[args.worker]
    if args.check:
        return check_cursor(cursor, model)

    if args.workspace is None or args.packet is None:
        parser.error("--workspace and --packet are required unless --check is used")

    workspace = args.workspace.expanduser().resolve()
    if not workspace.is_dir():
        raise SystemExit(f"Workspace does not exist: {workspace}")
    packet = read_and_validate_packet(args.packet.expanduser().resolve())

    if args.dry_run:
        print(f"Validated packet for {model} in {workspace}")
        return 0

    command = [
        *agent_command(cursor),
        "--print",
        "--model",
        model,
        "--output-format",
        args.output_format,
        "--sandbox",
        "enabled",
        "--trust",
        "--workspace",
        str(workspace),
    ]
    if args.mode != "agent":
        command.extend(["--mode", args.mode])
    command.append(f"{packet}\n\n{WORKER_CONTRACT}")

    started = time.monotonic()
    completed = subprocess.run(command, check=False)
    elapsed_seconds = time.monotonic() - started
    emit_receipt(args.worker, model, elapsed_seconds, completed.returncode)
    return completed.returncode


if __name__ == "__main__":
    raise SystemExit(main())
