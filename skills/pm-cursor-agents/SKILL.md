---
name: pm-cursor-agents
description: Orchestrate coding work with a frontier reasoning model as planner and reviewer while Cursor CLI agents using Composer 2.5 implement small, isolated file changes. Use when the user asks to delegate bounded edits, tests, refactors, or routine implementation to Cursor or Composer while retaining architectural control and final review in the host agent. Do not use for ambiguous product decisions, broad architecture changes, public-interface redesigns, or high-risk operations.
---

# PM Cursor Agents

Use the host reasoning model as the orchestrator and Cursor Composer 2.5 as a bounded implementation worker. Prefer GPT-5.6 Sol High for planning and review when model selection is available.

The unit of delegation is an executable work packet, not a prose plan. Composer receives enough context to inspect, edit, test, and repair straightforward failures without returning after every step.

## Keep the role split strict

The host agent owns:

- requirements, architecture, and task partitioning;
- identifying and preserving pre-existing changes;
- public interfaces and cross-cutting design decisions;
- acceptance criteria and scope boundaries;
- reviewing the resulting diff and independently verifying it;
- commits, merges, pushes, and user communication.

Composer owns:

- inspecting the files named in its packet;
- implementing the bounded change;
- adding or updating the specified tests;
- running the listed commands;
- fixing ordinary implementation or test failures within scope;
- returning a concise completion report.

Do not delegate architecture discovery and implementation as one vague task. Resolve the design first, then delegate the mechanical slice.

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
3. Select the exact files Composer may inspect and the files it is expected to change.
4. Establish an objective verification command.
5. Confirm the Cursor CLI and model are available:

```bash
python3 <skill-directory>/scripts/run_cursor_agent.py --check
```

If Composer 2.5 is unavailable or the user is not authenticated, report that blocker. Do not silently substitute another model.

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

## Dispatch Composer 2.5

Run one worker in the target checkout:

```bash
python3 <skill-directory>/scripts/run_cursor_agent.py \
  --workspace /absolute/path/to/repository \
  --packet /absolute/path/to/work-packet.md
```

The runner validates the packet, resolves the Cursor executable, selects `composer-2.5`, enables Cursor's sandbox, and prevents force mode. It also tells the worker not to commit or push.

For read-only investigation, add `--mode ask`. Do not use read-only mode for an implementation packet.

Let the worker complete its own inspect → edit → test → fix loop. Do not interrupt it for routine progress updates.

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

After Composer returns:

1. Inspect `git status` and the complete diff. Flag changes outside the packet.
2. Check the implementation against every acceptance criterion.
3. Run the relevant verification independently; do not rely only on the worker's report.
4. Review correctness, regressions, security, and preservation of user changes.
5. If one criterion fails for a straightforward reason, send one follow-up packet containing the exact failure evidence and unchanged scope.
6. If the same criterion fails a second time, stop delegating that issue and take it back into the host agent.

Immediately return control to the host agent when:

- implementation exposes a design conflict;
- a public interface or architecture must change;
- tests reveal ambiguous expected behavior;
- the worker requests scope outside its packet;
- the worker changes unrelated or user-owned code.

The host agent always performs the final review. Composer completing the packet is evidence, not acceptance.

## Completion report

Report to the user:

- what was delegated and why it was suitable;
- what changed;
- verification actually run and its result;
- any worker deviation or host-agent correction;
- the final review verdict and remaining risks.

Do not expose long internal work packets unless the user asks for them.
