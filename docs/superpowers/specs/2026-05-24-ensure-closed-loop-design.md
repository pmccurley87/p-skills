# pm:ensure-closed-loop — Design

## Purpose

Before an agent starts an iterative build/debug loop on a task it must run and
observe *itself*, this skill establishes and presence-checks the execution and
observability prerequisites, anchors a goal, then drives the loop until the goal
is met.

**Thesis:** never start iterating blind. Confirm you can run the thing *and see
what it does* before you begin changing it. Observability set up first gives the
agent the best chance of closing the loop on its own.

## Skill type

Hybrid:
- **Discipline gate** — do not start the loop until observability is ready.
- **Technique** — the run → observe → investigate → iterate loop.

## Guiding principle: adapt, don't obey

The phases and channels below are a **smart default, not a rigid script**. The
agent is expected to be clever and dynamic:

- Reason about what *this specific task* actually needs. Drop channels that don't
  apply (no UI → no browser/auth). Add channels not listed here if the task
  demands them (a queue, a webhook receiver, a third-party sandbox, metrics, a
  database the agent must inspect).
- Ask sharp, specific clarifying questions when the task or its success criteria
  are ambiguous — rather than guessing.
- Revisit and update an earlier phase mid-loop if iteration reveals a gap (e.g.
  discovers it needs a log source it didn't set up). Looping back to preflight is
  expected, not a failure.

This is guidance to apply with judgment, not a checklist to execute mechanically.

## Phase 0 — Anchor the goal

Read the task in hand. Invoke the `/goal` skill (external dependency, assumed to
exist) to define explicit, **observable** success criteria. These criteria are
the loop's exit condition — without them the loop cannot know when it is done.

## Phase 1 — Preflight (establish, then presence-check each channel)

For each relevant channel: auto-establish what is safe to set up; **pause and ask
the user** for anything risky or ambiguous (credentials, installing infra,
destructive setup). Verify with a **presence check** — confirm the channel exists
and responds. (Not a full generate-and-trace signal round-trip.)

Default channels:

| Channel | Ready means | Applies when |
|---|---|---|
| **Execution env** | Local env built & running; health/process check passes | always |
| **Browser tooling** | chrome-devtools-mcp / playwright connects | task includes UI |
| **Auth access** | Can get past login — automated flow *or* attach to a browser with existing cookies (remote debugging enabled) | task needs auth |
| **Logging** | Project's log system detected & queryable — prefer **victorialogs**, fall back to whatever the project uses | always |
| **Goal** | Set from Phase 0 | always |

The table is the default. The agent adds/removes channels per the guiding
principle above.

**Readiness gate.** Emit a readiness summary (channel · status · how verified).
If a *required* channel cannot be made ready, **STOP** — report what is missing
and how to resolve it. Do not start the loop blind.

## Phase 2 — Drive the closed loop

Repeat until the Phase 0 goal criteria are met:

1. **Run** — execute the task / trigger the behavior.
2. **Observe** — capture results: browser snapshot/screenshot, command output,
   API responses.
3. **Investigate** — query logs to understand the *mechanics*, not just the
   surface symptom. Understand *why*, not only *what*.
4. **Iterate** — form a hypothesis, make one change, re-run.

Each iteration records progress against the goal. Exit when the goal is met.
**Escalate to the user** if stuck or looping without progress (repeating the same
change, no movement toward criteria) rather than spinning indefinitely.

## On missing prerequisites (policy)

- Fix what is safe automatically (start the env, wire up an existing log query,
  connect the browser).
- Ask the user before: handling credentials, installing logging/observability
  infrastructure, or any destructive/ambiguous setup.

## Authoring constraints

- Lives at `plugins/pm/skills/pm-ensure-closed-loop/SKILL.md`.
- Frontmatter style matches existing pm skills: `name`, `description`
  (multi-line, "Use when…"), `allowed-tools`.
- `allowed-tools` broad enough to run the loop: Read, Glob, Grep, Bash, Edit,
  Write, Agent, AskUserQuestion, Skill, plus browser MCP tools.
- Must be tested per superpowers:writing-skills (baseline scenarios before the
  skill, compliance scenarios after) before deployment.
- Published to the marketplace via `pm:pm-update-claude-marketplace` after it
  passes.

## Out of scope

- Building the `/goal` skill (external dependency, created separately).
- End-to-end signal round-trip verification of channels (presence check only).
