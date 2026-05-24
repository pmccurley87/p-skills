# pm:ensure-closed-loop Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create the `pm:ensure-closed-loop` skill — a hybrid gate + technique skill that establishes and presence-checks execution/observability prerequisites, anchors a goal via `/goal`, then drives a run→observe→investigate→iterate loop until the goal is met.

**Architecture:** This is skill *documentation*, authored via the writing-skills TDD adaptation. "Tests" are subagent scenarios run with the Agent tool: RED = baseline behavior without the skill, GREEN = compliance with the skill, REFACTOR = close rationalization loopholes. The artifact is a single `SKILL.md`.

**Tech Stack:** Markdown SKILL.md; YAML frontmatter; Agent tool for scenario testing; pm marketplace tooling (`pm:pm-update-claude-marketplace`) for deployment.

**REQUIRED BACKGROUND:** superpowers:writing-skills and superpowers:test-driven-development. The Iron Law applies: no skill content kept without a failing test first.

**Spec:** `docs/superpowers/specs/2026-05-24-ensure-closed-loop-design.md`

---

## File Structure

- Create: `plugins/pm/skills/pm-ensure-closed-loop/SKILL.md` — the entire skill, self-contained inline (no supporting files needed; the loop and channel table fit comfortably).
- Modify (Task 7, deploy): marketplace catalog + version files, handled by `pm:pm-update-claude-marketplace`.

No code files. One skill document.

---

## Task 1: RED — Baseline scenarios (no skill)

**Files:** none yet (scratch notes only).

Goal: watch agents fail/behave naturally WITHOUT the skill, so we know what the skill must teach. Capture rationalizations verbatim.

- [ ] **Step 1: Dispatch baseline scenario A (gate discipline)**

Use the Agent tool (general-purpose), giving NO mention of this skill:

> "We have a task: fix the broken checkout button on the local web app so clicking it completes an order. Start working on it iteratively until it works."

Record: Does the agent set up logging/observability and confirm it can run+observe the app BEFORE editing code? Or does it dive into editing blind? Capture exact phrasing of any "I'll just look at the code first" reasoning.

- [ ] **Step 2: Dispatch baseline scenario B (adaptivity)**

> "Make the nightly data-export cron job actually produce the file. Iterate until it works." (No UI involved.)

Record: Does the agent reason that browser/auth channels don't apply and instead establish the relevant observability (job logs, output file)? Or does it apply a generic UI-shaped checklist / ignore observability entirely?

- [ ] **Step 3: Dispatch baseline scenario C (goal exit condition)**

> "Improve the search results page until it's good." (Deliberately vague success criteria.)

Record: Does the agent pin down observable success criteria before looping, or loop without a defined exit condition?

- [ ] **Step 4: Write baseline findings**

Create scratch file `docs/superpowers/plans/ensure-closed-loop-baseline.md` summarizing, per scenario: what the agent did, verbatim rationalizations, which behaviors the skill must correct.

- [ ] **Step 5: Commit baseline**

```bash
git add docs/superpowers/plans/ensure-closed-loop-baseline.md
git commit -m "test: baseline scenarios for ensure-closed-loop (RED)"
```

---

## Task 2: GREEN — Write the SKILL.md frontmatter + overview

**Files:**
- Create: `plugins/pm/skills/pm-ensure-closed-loop/SKILL.md`

- [ ] **Step 1: Write frontmatter and overview**

Match existing pm skill style (see `plugins/pm/skills/pm-confirm-issue/SKILL.md`).

```markdown
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
---

# Ensure Closed Loop

## Overview

Never start iterating blind. Before changing a thing, confirm you can both **run
it** and **see what it does** — then keep a tight loop until the goal is met.

**Core principle:** observability set up *first* gives the agent the best chance
of closing the loop on its own. An agent that cannot observe results is guessing.
```

- [ ] **Step 2: Commit**

```bash
git add plugins/pm/skills/pm-ensure-closed-loop/SKILL.md
git commit -m "feat: ensure-closed-loop frontmatter + overview"
```

---

## Task 3: GREEN — Guiding principle (adapt, don't obey)

**Files:**
- Modify: `plugins/pm/skills/pm-ensure-closed-loop/SKILL.md`

- [ ] **Step 1: Append the guiding-principle section**

```markdown
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
```

- [ ] **Step 2: Commit**

```bash
git add plugins/pm/skills/pm-ensure-closed-loop/SKILL.md
git commit -m "feat: ensure-closed-loop adapt-dont-obey principle"
```

---

## Task 4: GREEN — Phase 0 (goal) + Phase 1 (preflight gate)

**Files:**
- Modify: `plugins/pm/skills/pm-ensure-closed-loop/SKILL.md`

- [ ] **Step 1: Append Phase 0 and Phase 1**

```markdown
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
```

- [ ] **Step 2: Commit**

```bash
git add plugins/pm/skills/pm-ensure-closed-loop/SKILL.md
git commit -m "feat: ensure-closed-loop phases 0 and 1"
```

---

## Task 5: GREEN — Phase 2 (the loop) + red flags

**Files:**
- Modify: `plugins/pm/skills/pm-ensure-closed-loop/SKILL.md`

- [ ] **Step 1: Append Phase 2, escalation, and red-flags table**

```markdown
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
```

- [ ] **Step 2: Verify word count is reasonable**

Run: `wc -w plugins/pm/skills/pm-ensure-closed-loop/SKILL.md`
Expected: under ~600 words (concise; this is not a getting-started skill but should stay tight).

- [ ] **Step 3: Commit**

```bash
git add plugins/pm/skills/pm-ensure-closed-loop/SKILL.md
git commit -m "feat: ensure-closed-loop phase 2 loop and red flags"
```

---

## Task 6: GREEN/REFACTOR — Re-run scenarios with the skill, close loopholes

**Files:**
- Modify: `plugins/pm/skills/pm-ensure-closed-loop/SKILL.md` (only if loopholes found)

- [ ] **Step 1: Re-run scenario A with the skill present**

Dispatch a fresh Agent, instructing it to use the `pm:ensure-closed-loop` skill, with scenario A from Task 1. Verify: it anchors a goal, runs the preflight gate, and does NOT edit before observability is confirmed.

- [ ] **Step 2: Re-run scenario B with the skill present**

Verify the agent drops browser/auth (no UI) and establishes job-log + output-file observability instead — confirming "Adapt, don't obey" works.

- [ ] **Step 3: Re-run scenario C with the skill present**

Verify the agent pins down observable success criteria via `/goal` before looping.

- [ ] **Step 4: Close any loopholes**

For each new rationalization observed, add an explicit counter (red-flags row or a sentence in the relevant phase). Re-run the affected scenario until it complies. Record results in `ensure-closed-loop-baseline.md` under a "GREEN results" heading.

- [ ] **Step 5: Commit**

```bash
git add plugins/pm/skills/pm-ensure-closed-loop/SKILL.md docs/superpowers/plans/ensure-closed-loop-baseline.md
git commit -m "test: ensure-closed-loop compliance verified (GREEN), loopholes closed"
```

---

## Task 7: Deploy — publish to the marketplace

**Files:** marketplace catalog/version files (handled by the deploy skill).

- [ ] **Step 1: Run the marketplace update skill**

Invoke `pm:pm-update-claude-marketplace`. It bumps the pm plugin version, updates the catalog, generates a changelog entry, syncs duplicate files, commits, and pushes.

- [ ] **Step 2: Verify the skill is listed**

Confirm `pm-ensure-closed-loop` appears in the pm plugin catalog and the version bumped.

---

## Self-Review

- **Spec coverage:** Phase 0 (goal) → Task 4. Phase 1 channels + readiness gate + missing-prereq policy → Task 4. Phase 2 loop + escalation → Task 5. "Adapt, don't obey" guidance → Task 3. Presence-check (not round-trip) → wording in Task 4. Authoring constraints (path, frontmatter, allowed-tools) → Task 2. Deploy → Task 7. Testing discipline → Tasks 1 & 6. All covered.
- **Placeholders:** none — all SKILL.md content is written inline in the steps.
- **Consistency:** channel names, phase names, and the four loop verbs (Run/Observe/Investigate/Iterate) match across Tasks 4–6 and the spec.
