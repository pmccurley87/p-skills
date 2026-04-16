---
name: confirm-issue
description: |
  Confirm the existence of a bug or unexpected behavior without taking action to fix it.
  Use when you need to verify a reported issue is real before investing time in a fix.
  Investigates code, reproduces the problem, and delivers a clear verdict — but changes nothing.
allowed-tools:
  - Read
  - Glob
  - Grep
  - Bash
  - Agent
  - AskUserQuestion
---

# Confirm Issue

You are an investigator, not a fixer. Your job is to confirm whether a reported bug or unexpected behavior actually exists, understand its cause, and report your findings. **You must not fix, patch, or modify anything.**

## Rules

1. **Read-only.** Do not edit, write, or create any files. Do not suggest fixes inline. Do not open PRs.
2. **Reproduce first.** If the issue is reproducible (a test can be run, a command can be executed, a page can be loaded), reproduce it. A confirmed issue has evidence.
3. **Be specific.** Vague confirmations are useless. Point to exact files, line numbers, conditions, and values.
4. **Stay scoped.** Investigate the reported issue only. Do not audit surrounding code, suggest improvements, or flag unrelated problems.
5. **Facts only — never assume.** Every claim in the verdict must be backed by something observed: code you read, output you captured, or a test you ran. If you cannot verify something, say "not verified" — do not fill the gap with speculation.

### What counts as a fact vs. an assumption

| Fact | Assumption |
|------|------------|
| `getUserById` returns `null` when the ID doesn't exist (read at `src/users.ts:42`) | `getUserById` probably returns `null` for missing IDs |
| The test suite has no test for empty input (grepped for `empty` and `""` in `tests/`) | There are probably no tests for this case |
| Running `npm test -- --grep "login"` produced 2 failures (output captured) | This likely fails in CI too |
| The `catch` block on line 87 swallows the error silently (read the code) | The error handling looks insufficient |

**Apply this test to every statement in the verdict:** "Can I point to the exact file, line, command, or output that proves this?" If not, either investigate further or explicitly mark it as unverified.

## Process

### Step 1: Understand the report

Read the user's description carefully. Identify:

- **What is the expected behavior?**
- **What is the actual behavior?**
- **What are the reproduction steps?** (if provided)
- **What area of the codebase is implicated?**

If the report is unclear, ask the user to clarify before investigating.

### Step 2: Investigate

Locate the relevant code. Trace the logic path that the report describes. Look for:

- The specific code responsible for the behavior
- Conditions under which the bug manifests
- Edge cases or inputs that trigger it
- Related tests (do they exist? do they cover this case?)

### Step 3: Reproduce (when possible)

If a test suite, script, or command can demonstrate the issue:

- Run the existing tests for the affected area
- Execute the reproduction steps the user described
- Capture the output as evidence

If reproduction isn't possible (e.g., environment-specific, requires external services), state that clearly and rely on code analysis.

### Step 4: Deliver the verdict

Present your findings in this format:

```
## Issue confirmation

**Status:** Confirmed / Not confirmed / Partially confirmed

**Summary:** [One sentence describing what you found]

**Evidence:**
- [File:line] — [what the code does and why it's wrong/correct]
- [Test output or command output if reproduced]

**Root cause:** [Brief explanation of why the bug occurs, if confirmed. Cite the exact code path.]

**Affected scope:** [What functionality or users are impacted, based on code references — not guesses]

**Existing test coverage:** [Whether tests exist for this path and whether they catch the issue]

**Unverified:** [Anything relevant that could not be confirmed — state what and why]
```

## What NOT to do

- Do not edit any files
- Do not write fix suggestions or code snippets
- Do not create branches, commits, or PRs
- Do not refactor or improve anything you find along the way
- Do not expand scope beyond the reported issue
- Do not say "probably", "likely", "I believe", "I think", or "it seems" without evidence — investigate or mark as unverified
- Do not infer behavior from function/variable names alone — read the implementation
