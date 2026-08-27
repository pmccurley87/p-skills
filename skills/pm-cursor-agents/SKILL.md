---
name: pm-cursor-agents
description: Use when coding work contains bounded, verifiable discovery, implementation, testing, refactoring, or repair that Cursor CLI workers can execute under a host agent's architectural control.
---

# PM Cursor Agents

Use Sol as the host orchestrator when model selection is available. Sol owns the decisions that shape the work; Cursor workers should do as much of the straightforward evidence gathering and execution as practical.

The unit of delegation is an executable work packet, not a prose plan. The selected worker receives enough context to inspect, edit, test, and repair straightforward failures without returning after every step.

## Keep the role split strict

The host agent owns:

- requirements, architecture, and task partitioning;
- identifying and preserving pre-existing changes;
- public interfaces and cross-cutting design decisions;
- acceptance criteria and scope boundaries;
- choosing a current worker model based on task complexity, urgency, cost, and available models;
- risk-proportional review and independent verification;
- commits, merges, pushes, and user communication.

The selected worker owns:

- bounded repository discovery and factual code-path mapping;
- inspecting the files named in its packet;
- implementing the bounded change;
- adding or updating the specified tests;
- running the listed commands;
- fixing ordinary implementation or test failures within scope;
- returning a concise completion report.

Sol does not need to rediscover implementation details that a bounded worker can inspect and report. The host should inspect repository instructions, dirty state, relevant public boundaries, and enough code to fix the contract and scope. Delegate deeper factual tracing when it does not itself decide architecture.

When a task contains executable worker work, delegation is the default. If Sol keeps otherwise straightforward discovery, implementation, tests, or repair, it must have a concrete reason such as coupling, risk, ambiguous behavior, or delegation overhead exceeding the work.

## Choose the worker lane

Choose the worker family after resolving requirements and inspecting the relevant boundary:

- Use `quick` for factual discovery, documentation, routine tests, and tiny deterministic edits with objective verification.
- Use `composer` for agentic implementation: localized refactors, field propagation, validation cases, and isolated UI or API adjustments.
- Use `grok` for bounded work that needs more local reasoning: stateful business logic, interacting invariants, parsing, normalization, batch processing, atomic error handling, or a small multi-file implementation with a fixed public contract.
- Keep the work in Sol when the main difficulty is architecture, public-interface design, security, concurrency, migrations, money or data integrity, or ambiguous behavior.

Refer to model families, not pinned versions. Before dispatch, query the Cursor CLI for current models and let Sol choose the exact available model, reasoning effort, and standard or fast tier. Prefer the least expensive choice likely to finish correctly; use fast tiers when elapsed time materially matters. Do not use a stronger worker to compensate for an unresolved design or silently change the selected model after dispatch.

## Decide whether to delegate

Delegate an implementation packet when all of these are true:

- The desired behavior and acceptance criteria are concrete.
- Expected edits are small and can be assigned to a clear file set.
- Tests or observable checks can determine success.
- The change does not require credentials, production access, destructive operations, or policy judgment.
- The worker can finish without changing public interfaces or architecture.

Even when implementation must remain in Sol, delegate bounded read-only evidence gathering or test discovery when it can reduce host context without outsourcing the decision. Keep the core work in Sol when requirements are ambiguous, the change spans tightly coupled subsystems, security or data-loss risk is material, or the main work is deciding what should exist.

## Preflight the repository

Before dispatching:

1. Read repository instructions, relevant public boundaries, and only enough implementation to define the contract and packet.
2. Run `git status --short` and inspect existing diffs. Treat all existing changes as user-owned.
3. Select the exact files the worker may inspect and the files it is expected to change.
4. Establish an objective verification command.
5. List the currently available models for the selected family, choose one, and confirm it explicitly:

```bash
python3 <skill-directory>/scripts/run_cursor_agent.py --worker <quick|composer|grok> --check
python3 <skill-directory>/scripts/run_cursor_agent.py \
  --worker <family> --model <selected-model-id> --check
```

Check only the selected family when dispatching one worker. If the chosen model is unavailable or the user is not authenticated, report that blocker and make a new explicit selection; do not silently substitute a model, effort, or speed tier.

## Write the executable work packet

Create a Markdown file outside the repository when practical. Use every heading below. Write `None` where a section is intentionally empty.

```markdown
## Objective
One concrete outcome.

## Files to inspect
- Absolute or repository-relative paths needed for context.

## Files expected to change
- The bounded file set the worker owns.

## Required behavior
- Observable behavior after the change.
- Important edge cases.

## Implementation steps
1. Ordered, mechanical steps with design decisions already resolved.

## Interfaces and signatures
- Exact signatures, types, schemas, or `None — no public interface changes`.

## Tests to add
- Exact cases and likely test locations.

## Commands to run
- Focused verification commands first.
- Broader required checks second.

## Acceptance criteria
- Binary, observable completion conditions.

## Things not to change
- Files, behavior, dependencies, APIs, formatting, or unrelated user changes that are out of scope.
```

Avoid dumping the host agent's reasoning into the packet. State decisions, constraints, and checks. Include exact interfaces when they matter.

For data boundaries and validation logic, enumerate adversarial cases that are part of the contract: invalid runtime types, operations that can raise the wrong exception, booleans accepted as integers, unhashable values, non-finite numbers, Unicode policy, atomicity, ordering, duplicates, and exact exception classes. Include only cases relevant to the task.

## Dispatch the selected Cursor worker

Run one worker in the target checkout with the exact model Sol selected at runtime:

```bash
python3 <skill-directory>/scripts/run_cursor_agent.py \
  --worker composer \
  --model <selected-composer-model-id> \
  --workspace /absolute/path/to/repository \
  --packet /absolute/path/to/work-packet.md
```

For another family, change both the worker family and selected model:

```bash
python3 <skill-directory>/scripts/run_cursor_agent.py \
  --worker grok \
  --model <selected-grok-model-id> \
  --workspace /absolute/path/to/repository \
  --packet /absolute/path/to/work-packet.md
```

The runner validates the packet, resolves the Cursor executable, verifies that the selected model is currently available and belongs to the declared family, enables Cursor's sandbox, and prevents force mode. It also tells the worker not to commit or push.

For read-only investigation, add `--mode ask`. Do not use read-only mode for an implementation packet.

Let the worker complete its own inspect → edit → test → fix loop. Do not interrupt it for routine progress updates.

## Track every dispatched agent

Record one row per Cursor worker invocation before writing the completion report. Follow-up or retry invocations are separate rows.

For each dispatch, capture:

- worker family (`quick`, `composer`, or `grok`);
- exact runtime-selected model identifier;
- concise selection rationale (why this lane fit the packet);
- runner-measured elapsed time;
- outcome (success, non-zero exit, escalation, host takeback, or other).

The runner prints a stderr receipt after each worker subprocess finishes:

```text
PM_CURSOR_AGENT_RECEIPT worker=composer model=<runtime-selected-model> elapsed_seconds=142.317 elapsed=2m22s exit_code=0
```

Parse `elapsed_seconds` and `elapsed` from that receipt as authoritative wall-clock duration. Do not estimate duration from chat timestamps when a receipt exists.

If no Cursor worker was dispatched, state that explicitly in the completion report.

## Orchestrate multiple workers in one checkout

The host agent owns concurrency control. Workers may share the same checkout when their complete write surfaces are disjoint.

Before launching workers, create a file-ownership ledger:

```text
worker-a: src/feature-a.ts, src/feature-a.test.ts
worker-b: src/feature-b.ts, src/feature-b.test.ts
```

For each packet:

- List every file the worker may write, including snapshots, generated files, fixtures, manifests, and lockfiles.
- Assign each writable file to exactly one active worker.
- Keep shared interfaces fixed before dispatch.
- Run packets serially when one consumes another's unfinished output.
- Do not run mutating formatters, generators, package installers, or broad autofix commands concurrently unless their outputs are also exclusively assigned.
- Tell each worker that an unexpected required file is an escalation, not permission to edit it.
- After workers finish, compare the actual changed paths with the ledger before accepting any result.

Launch independent packets concurrently against the same `--workspace`. If ownership overlaps or cannot be predicted confidently, serialize those packets. The host agent retains commits, pushes, and final integration.

## Review in proportion to risk

After every worker returns, Sol inspects the complete diff for scope, user-change preservation, and acceptance-criteria coverage, then independently runs the relevant verification. Review depth depends on the work:

- For straightforward deterministic work, audit changed paths and the diff, check every criterion, and rerun focused verification. Do not repeat the worker's repository investigation without evidence of a problem.
- For bounded logic-heavy work, also perform a semantic review of invariants, edge cases, and regression risk.
- For security, concurrency, migrations, money, or data-integrity work, Sol owns the design and core acceptance; worker output is supporting evidence or bounded implementation only.

If review finds a small, mechanically obvious defect, either correct it directly in the host or send one follow-up packet containing the exact failure evidence and unchanged scope. If the same criterion fails a second time, stop delegating that issue and take it back into Sol.

Immediately return control to the host agent when:

- implementation exposes a design conflict;
- a public interface or architecture must change;
- tests reveal ambiguous expected behavior;
- the worker requests scope outside its packet;
- the worker changes unrelated or user-owned code.

Sol always performs final acceptance. Worker completion is evidence, not acceptance. Optimize the complete decide → delegate → accept loop, not the amount of work performed by Sol or the worker in isolation.

## Completion report

Start every completion report with an **Agents used** table, then the remaining details.

If no Cursor worker ran, say so explicitly instead of showing an empty table.

| Worker | Model | Why selected | Duration | Outcome |
| --- | --- | --- | --- | --- |
| composer | `<runtime-selected model>` | Mechanical field propagation in two files | 2m 22s (runner) | Success — exit 0 |
| grok | `<runtime-selected model>` | Bounded invariant logic across three modules | 8m 41s (runner) | Non-zero exit — Sol took over |

Duration rules:

- Prefer runner receipt values (`elapsed` for display, `elapsed_seconds` when precision matters). Label them `(runner)`.
- If runner evidence is unavailable, use host-measured wall time and label it `(host-measured)`. Never present host estimates as runner evidence.

After the table, report:

- what was delegated and why it was suitable;
- what changed;
- verification actually run and its result;
- any worker deviation or host-agent correction;
- the final review verdict and remaining risks.

Do not expose long internal work packets unless the user asks for them.
