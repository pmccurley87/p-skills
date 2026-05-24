---
name: pm-ensure-closed-loop
description: |
  Establish and verify that an agent can fully run and observe a task before it
  starts iterating on it. Use when about to work a task iteratively (build, fix,
  or debug) that the agent must run and observe itself — especially involving a
  local app, UI, auth, or logs. Sets up execution, browser, auth, and logging
  observability, anchors a goal, then drives a run-observe-investigate-iterate
  loop until the goal is met. Use when you're tempted to start editing before
  confirming you can see what the code does.
allowed-tools:
  - Read
  - Glob
  - Grep
  - Bash
  - Edit
  - Write
  - Agent
  - AskUserQuestion
  - Skill
  - mcp__plugin_chrome-devtools-mcp_chrome-devtools__*
  - mcp__plugin_playwright_playwright__*
---

# Ensure Closed Loop

## Overview

Never start iterating blind. Before changing a thing, confirm you can both **run
it** and **see what it does** — then keep a tight loop until the goal is met.

**Core principle:** observability set up *first* gives the agent the best chance
of closing the loop on its own. An agent that cannot observe results is guessing.

## Adapt, don't obey

The phases and channels below are a **smart default, not a rigid script.** Be
clever and dynamic:

- Reason about what *this specific task* needs. Drop channels that don't apply
  (no UI → no browser or auth). Add channels not listed here when the task
  demands them — a queue, a webhook receiver, a third-party sandbox, metrics, a
  database you must inspect.
- Ask sharp, specific clarifying questions when the task or its success criteria
  are ambiguous, rather than guessing.
- Revisit and update an earlier phase mid-loop if iteration reveals a gap (e.g.
  you discover you need a log source you didn't set up). Looping back to
  preflight is expected, not a failure.

This is judgment, not a checklist to run mechanically.

## Phase 0 — Anchor the goal

Read the task. Invoke the `/goal` skill to define explicit, **observable**
success criteria. These are the loop's exit condition — without them the loop
cannot know when it is done. If the task's success criteria are vague, pin them
down (ask the user) before looping.

## Phase 1 — Preflight: establish, then presence-check each channel

For each relevant channel: auto-establish what is safe to set up; **pause and ask
the user** for anything risky or ambiguous (credentials, installing infra,
destructive setup). Verify with a **presence check** — confirm the channel exists
and responds. (Not a full generate-and-trace round-trip.)

| Channel | Ready means | Applies when |
|---|---|---|
| **Execution env** | Local env built & running; health/process check passes | always |
| **Browser tooling** | chrome-devtools-mcp / playwright connects | task includes UI |
| **Auth access** | Can get past login — automated flow *or* attach to a browser with existing cookies (remote debugging enabled) | task needs auth |
| **Logging** | Project's log system detected & queryable — prefer **victorialogs**, fall back to whatever the project uses | always |
| **Goal** | Set from Phase 0 | always |

This table is the default — add or remove channels per "Adapt, don't obey."

### Readiness gate

Emit a readiness summary (channel · status · how verified). **If a required
channel cannot be made ready, STOP** — report what is missing and how to resolve
it. Do not start the loop blind.

### On missing prerequisites

- Fix what is safe automatically (start the env, wire an existing log query,
  connect the browser).
- Ask the user before: handling credentials, installing logging/observability
  infrastructure, or any destructive/ambiguous setup.

## Phase 2 — Drive the closed loop

Repeat until the Phase 0 goal criteria are met:

1. **Run** — execute the task / trigger the behavior.
2. **Observe** — capture results: browser snapshot/screenshot, command output,
   API responses.
3. **Investigate** — query logs to understand the *mechanics*, not just the
   surface symptom. Understand *why*, not only *what*.
4. **Iterate** — form a hypothesis, make one change, re-run.

Record progress against the goal each iteration. Exit when the goal is met.

**Escalate to the user** if stuck or looping without progress (same change
repeated, no movement toward criteria) rather than spinning indefinitely.

## Red flags — STOP

- "I'll just read the code and fix it" — without confirming you can run+observe it
- Starting to edit before the readiness gate passes
- Looping without defined, observable success criteria
- Guessing at causes instead of querying the logs
- Applying every channel mechanically to a task that doesn't need them

All of these mean: stop, return to the right phase, and establish what's missing.
