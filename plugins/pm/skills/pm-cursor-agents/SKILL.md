---
name: pm-cursor-agents
description: Orchestrate coding work with GPT-5.6 Sol High Fast as planner and reviewer while explicit Cursor CLI worker lanes use Composer 2.5 Fast for mechanical changes or Grok 4.5 High Fast for bounded logic-heavy implementation. Use when the user asks to delegate isolated edits, tests, refactors, or routine implementation while retaining architectural control and final acceptance in the host agent. Do not use for ambiguous product decisions, broad architecture changes, public-interface redesigns, or high-risk operations.
---

# PM Cursor Agents

Use GPT-5.6 Sol High Fast as the host orchestrator when model selection is available. Route mechanical packets to Cursor Composer 2.5 Fast and bounded logic-heavy packets to Cursor Grok 4.5 High Fast. Keep architecture, acceptance, and final correction in the host.

The unit of delegation is an executable work packet, not a prose plan. The selected worker receives enough context to inspect, edit, test, and repair straightforward failures without returning after every step.

## Keep the role split strict

The host agent owns:

- requirements, architecture, and task partitioning;
- identifying and preserving pre-existing changes;
- public interfaces and cross-cutting design decisions;
- acceptance criteria and scope boundaries;
- reviewing the resulting diff and independently verifying it;
- commits, merges, pushes, and user communication.

The selected worker owns:

- inspecting the files named in its packet;
- implementing the bounded change;
- adding or updating the specified tests;
- running the listed commands;
- fixing ordinary implementation or test failures within scope;
- returning a concise completion report.

Do not delegate architecture discovery and implementation as one vague task. Resolve the design first, then delegate the mechanical slice.

## Choose the worker lane

Choose the lane after resolving requirements and inspecting the relevant code:

- Use `composer` for exact, mechanical work: localized refactors, field propagation, routine tests, explicit validation cases, and isolated UI or API adjustments.
- Use `grok` for bounded work that still needs local reasoning: stateful business logic, interacting invariants, parsing, normalization, batch processing, atomic error handling, or a small multi-file implementation with a fixed public contract.
- Keep the work in Sol when the main difficulty is architecture, public-interface design, security, concurrency, migrations, money or data integrity, or ambiguous behavior.

Prefer the least expensive lane that can complete the fixed packet. Do not use a stronger worker to compensate for an unresolved design. Do not silently change lanes after dispatch.

## Decide whether to delegate

Delegate only when all of these are true:

- The desired behavior and acceptance criteria are concrete.
- Expected edits are small and can be assigned to a clear file set.
- Tests or observable checks can determine success.
- The change does not require credentials, production access, destructive operations, or policy judgment.
- The worker can finish without changing public interfaces or architecture.

Keep the work in the host agent when requirements are ambiguous, the change spans tightly coupled subsystems, security or data-loss risk is material, or the main work is deciding what should exist.

## Preflight the repository

Before dispatching:

1. Read the repository instructions and relevant implementation files.
2. Run `git status --short` and inspect existing diffs. Treat all existing changes as user-owned.
3. Select the exact files the worker may inspect and the files it is expected to change.
4. Establish an objective verification command.
5. Confirm the Cursor CLI and model are available:

```bash
python3 <skill-directory>/scripts/run_cursor_agent.py --worker composer --check
python3 <skill-directory>/scripts/run_cursor_agent.py --worker grok --check
```

Check only the selected lane when dispatching one worker. If its exact model is unavailable or the user is not authenticated, report that blocker. Do not silently substitute another model, effort, or standard-speed tier.

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

Run one worker in the target checkout. Composer remains the default for backward compatibility:

```bash
python3 <skill-directory>/scripts/run_cursor_agent.py \
  --worker composer \
  --workspace /absolute/path/to/repository \
  --packet /absolute/path/to/work-packet.md
```

For a bounded logic-heavy packet, select Grok explicitly:

```bash
python3 <skill-directory>/scripts/run_cursor_agent.py \
  --worker grok \
  --workspace /absolute/path/to/repository \
  --packet /absolute/path/to/work-packet.md
```

The runner validates the packet, resolves the Cursor executable, selects exactly `composer-2.5-fast` or `cursor-grok-4.5-high-fast`, enables Cursor's sandbox, and prevents force mode. It also tells the worker not to commit or push. Fast variants cost more than standard-speed tiers; use them intentionally to minimize worker latency.

For read-only investigation, add `--mode ask`. Do not use read-only mode for an implementation packet.

Let the worker complete its own inspect → edit → test → fix loop. Do not interrupt it for routine progress updates.

## Track every dispatched agent

Record one row per Cursor worker invocation before writing the completion report. Follow-up or retry invocations are separate rows.

For each dispatch, capture:

- worker lane (`composer` or `grok`);
- exact model identifier (`composer-2.5-fast` or `cursor-grok-4.5-high-fast`);
- concise selection rationale (why this lane fit the packet);
- runner-measured elapsed time;
- outcome (success, non-zero exit, escalation, host takeback, or other).

The runner prints a stderr receipt after each worker subprocess finishes:

```text
PM_CURSOR_AGENT_RECEIPT worker=composer model=composer-2.5-fast elapsed_seconds=142.317 elapsed=2m22s exit_code=0
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

## Review and escalation loop

After the worker returns:

1. Inspect `git status` and the complete diff. Flag changes outside the packet.
2. Check the implementation against every acceptance criterion.
3. Run the relevant verification independently; do not rely only on the worker's report.
4. Review correctness, regressions, security, and preservation of user changes.
5. If review finds a small, mechanically obvious defect, either correct it directly in the host or send one follow-up packet containing the exact failure evidence and unchanged scope.
6. If the same criterion fails a second time, stop delegating that issue and take it back into the host agent.

Immediately return control to the host agent when:

- implementation exposes a design conflict;
- a public interface or architecture must change;
- tests reveal ambiguous expected behavior;
- the worker requests scope outside its packet;
- the worker changes unrelated or user-owned code.

The host agent always performs the final review. Worker completion is evidence, not acceptance. Optimize the complete plan → implement → review → repair → verify loop, not first-pass worker acceptance alone.

## Completion report

Start every completion report with an **Agents used** table, then the remaining details.

If no Cursor worker ran, say so explicitly instead of showing an empty table.

| Worker | Model | Why selected | Duration | Outcome |
| --- | --- | --- | --- | --- |
| composer | composer-2.5-fast | Mechanical field propagation in two files | 2m 22s (runner) | Success — exit 0 |
| grok | cursor-grok-4.5-high-fast | Bounded invariant logic across three modules | 8m 41s (runner) | Non-zero exit — host took over |

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
