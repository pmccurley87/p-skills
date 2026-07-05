---
name: superset-codex-workspace
description: Create Superset desktop workspaces backed by Codex agents and automatically open them so they appear in the active Superset UI. Use when a user asks to create, start, hand off, or test a Superset/Codex workspace or thread, especially when they want it to show up automatically rather than only in the workspace list.
---

# Superset Codex Workspace

## Purpose

Create a Superset workspace with a Codex agent, then immediately open it in Superset desktop. Superset's `workspaces create` command can create a workspace that is only visible in the workspace list; `workspaces open <workspace-id>` is the activation step that makes it appear in the active UI.

## Workflow

1. Confirm the Superset CLI exists. Prefer `/Users/patrick/.superset/bin/superset`; otherwise use `superset` from `PATH`.
2. Ensure authentication is available. Prefer `SUPERSET_API_KEY` in the environment. Do not print or persist API keys.
3. Identify the Superset project id or slug. For Go Insights, the known project id is `a18a290e-b82c-4ab8-9200-20e594a82ac6`.
4. Create the workspace with `workspaces create --json`, selecting `--agent codex`.
5. Parse the returned workspace `id`.
6. Run `workspaces open <workspace-id>` immediately after creation.
7. Report the workspace id, name, branch, and whether the open step completed.

## Helper Script

Use `scripts/create_and_open_workspace.py` for the normal flow:

```bash
SUPERSET_API_KEY="$SUPERSET_API_KEY" \
python3 /path/to/superset-codex-workspace/scripts/create_and_open_workspace.py \
  --project a18a290e-b82c-4ab8-9200-20e594a82ac6 \
  --name "Google Ads Fix" \
  --branch codex/google-ads-fix \
  --base-branch main \
  --prompt "Investigate and fix the Google Ads issue. Commit and push when complete."
```

The script runs:

- `superset workspaces create --json --local --project ... --agent codex --prompt ...`
- `superset workspaces open <created-workspace-id>`

Use `--no-open` only when the user explicitly wants the workspace created without activating it.

## Notes

- Do not write raw Superset API keys to files, command output, git commits, or final responses.
- If the CLI says `Not logged in`, rerun with `SUPERSET_API_KEY` set in the command environment.
- If `--print` is used with `workspaces open`, Superset only prints the deep link; it does not activate the desktop UI.
- The branch name should be explicit and task-specific. Avoid spaces.
