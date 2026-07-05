#!/usr/bin/env python3
"""Create a Superset workspace and open it in Superset desktop."""

from __future__ import annotations

import argparse
import json
import os
import shutil
import subprocess
import sys
from pathlib import Path


DEFAULT_SUPERSET = Path.home() / ".superset" / "bin" / "superset"


def resolve_superset(explicit: str | None) -> str:
    if explicit:
        return explicit
    if DEFAULT_SUPERSET.exists():
        return str(DEFAULT_SUPERSET)
    found = shutil.which("superset")
    if found:
        return found
    raise SystemExit("Could not find Superset CLI. Expected ~/.superset/bin/superset or superset on PATH.")


def run(args: list[str], env: dict[str, str]) -> subprocess.CompletedProcess[str]:
    return subprocess.run(args, env=env, text=True, capture_output=True, check=False)


def first_agent_session_id(payload: dict) -> str | None:
    agent_session = payload.get("agentSession")
    if isinstance(agent_session, dict):
        return agent_session.get("id")

    agents = payload.get("agents")
    if isinstance(agents, list):
        for agent in agents:
            if isinstance(agent, dict) and agent.get("sessionId"):
                return agent["sessionId"]

    return None


def main() -> int:
    parser = argparse.ArgumentParser(description="Create and open a Superset Codex workspace.")
    parser.add_argument("--project", required=True, help="Superset project id or slug.")
    parser.add_argument("--name", required=True, help="Workspace display name.")
    parser.add_argument("--branch", required=True, help="Workspace git branch.")
    parser.add_argument("--base-branch", default="main", help="Base branch for the workspace.")
    parser.add_argument("--prompt", required=True, help="Initial prompt for the Codex agent.")
    parser.add_argument("--agent", default="codex", help="Superset agent preset.")
    parser.add_argument("--superset-bin", help="Path to the Superset CLI.")
    parser.add_argument("--host", help="Use a specific Superset host id instead of --local.")
    parser.add_argument("--no-open", action="store_true", help="Create the workspace but do not open it.")
    args = parser.parse_args()

    superset = resolve_superset(args.superset_bin)
    env = os.environ.copy()

    create_cmd = [
        superset,
        "workspaces",
        "create",
        "--json",
        "--project",
        args.project,
        "--name",
        args.name,
        "--branch",
        args.branch,
        "--base-branch",
        args.base_branch,
        "--agent",
        args.agent,
        "--prompt",
        args.prompt,
    ]
    if args.host:
        create_cmd.extend(["--host", args.host])
    else:
        create_cmd.append("--local")

    created = run(create_cmd, env)
    if created.returncode != 0:
        sys.stderr.write(created.stderr or created.stdout)
        return created.returncode

    try:
        payload = json.loads(created.stdout)
    except json.JSONDecodeError:
        sys.stderr.write("Superset did not return JSON for workspace creation.\n")
        return 1

    workspace = payload.get("workspace") if isinstance(payload.get("workspace"), dict) else payload
    workspace_id = workspace.get("id")
    if not workspace_id:
        sys.stderr.write("Superset creation response did not include a workspace id.\n")
        return 1

    opened = False
    open_output = ""
    if not args.no_open:
        opened_result = run([superset, "workspaces", "open", workspace_id], env)
        opened = opened_result.returncode == 0
        open_output = (opened_result.stdout or opened_result.stderr).strip()
        if opened_result.returncode != 0:
            sys.stderr.write(opened_result.stderr or opened_result.stdout)
            return opened_result.returncode

    result = {
        "id": workspace_id,
        "name": workspace.get("name"),
        "branch": workspace.get("branch"),
        "projectId": workspace.get("projectId"),
        "agentSessionId": first_agent_session_id(payload),
        "opened": opened,
        "openOutput": open_output,
    }
    print(json.dumps(result, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
