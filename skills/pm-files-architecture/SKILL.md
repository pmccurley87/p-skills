---
name: pm-files-architecture
description: Map a feature or issue to the files that actually execute it, then propose a safe, evidence-backed file-level change plan before implementation. Use when reviewing a ticket or existing work; tracing runtime ownership across prompts, agents, workflows, services, configuration, and tests; identifying source-of-truth files versus stale duplicates; or deciding exactly which files to add, change, or leave untouched.
---

# File Architecture

Trace the live path first. Treat a similarly named prompt, document, or helper as a lead, not proof that it runs.

## Workflow

1. Establish scope and preserve state.
   - Read repository instructions and run `git status --short` before inspection.
   - Read the ticket, request, comments, linked work, and supplied evidence when available.
   - Keep the investigation read-only until the user explicitly approves implementation.

2. Find the authoritative runtime path.
   - Start from the external trigger: UI action, schedule, email, API, CLI, or queue.
   - Trace each hand-off to the terminal side effect: workflow/controller, agent invocation, activity/service, persistence, notification, or external request.
   - Record contracts at every boundary: input, output, optional fields, blob/file hand-offs, retries, and idempotency keys.
   - Read the invoked prompt and its allowed tools when an agent is involved. Identify who owns the final decision and write; do not assume the agent does.

3. Identify policy and delivery ownership.
   - Trace each rule to its runtime source: code, playbook/config, embedded resource, environment value, database row, or generated artifact.
   - For layered rules, state precedence explicitly: generic, client/domain, then provider/courier/feature override.
   - Check how each runtime receives the policy. A file that is not packaged, mounted, embedded, or loaded by the process is documentation, not runtime configuration.
   - Inspect build/deployment inputs when adding a shared asset or changing a plugin/resource boundary.

4. Establish repository evidence.
   - Use exact `rg` searches before broad searches.
   - Inspect the closest unit, integration, and workflow tests; distinguish what they prove from what they merely mock.
   - Inspect recent history on the relevant paths for prior fixes, operational constraints, and compatibility requirements.
   - Label conclusions as **Observed**, **Inference**, or **Unknown**. Do not claim production confirmation without checking production evidence.

5. Deliver the file architecture before changing code.
   - State what is already implemented, what remains, and the recommended design.
   - Give the user a bullet-pointed file plan and wait for approval before editing.
   - Include every new file, changed file, test file, build/package file, and deliberately untouched adjacent file.

## Agent and Prompt Checks

For an agent-driven path, answer all of these before proposing a prompt change:

- Which process invokes the agent, and with which system prompt?
- Which tools and filesystem access does that invocation permit?
- Does the agent parse, advise, mutate, or merely return an artifact?
- Where is the artifact consumed, especially for large-file/blob paths?
- Which deterministic component revalidates and performs the write?

Prefer a layered design for rules:

```text
generic policy → domain/client policy → provider-specific policy
                     ↓
              effective policy per run
                     ↓
      agent preflight + deterministic write gate
```

Keep the deterministic boundary authoritative. Agent validation improves early diagnostics and mapping feedback; it must not be the only protection before a database or external write.

## Required Pre-Implementation Output

Use this shape when the user asks which files will change:

```markdown
No changes made. This is the proposed implementation shape.

**New files**

- `absolute/or/repo/path` — **Add.** Where it participates in the runtime path; why it is needed; who consumes it.

**Files to change**

- `absolute/or/repo/path` — **Change.** The exact responsibility to alter; why this is the authoritative location; compatibility or delivery considerations.

**Tests to add or change**

- `absolute/or/repo/path` — The behaviour, failure mode, and boundary the test proves.

**Deliberately unchanged**

- `absolute/or/repo/path` — Why a similarly named or adjacent file is outside the live path or task scope.
```

Include a concise data-flow diagram when three or more hand-offs are relevant. Call out a user decision when it changes product behaviour, such as whether invalid imports notify customers or only internal operators.

## After Approval

Implement only the approved file plan. Preserve unrelated worktree changes. Validate the real decision boundary, the end-to-end hand-off, packaging/resource delivery, and the relevant regression tests. Report repository, ticket, and production changes separately.
