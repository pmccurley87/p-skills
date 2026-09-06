---
name: pm-subagents
description: Use when a substantial implementation plan contains bounded discovery, editing, testing, or repair that fresh native agents can execute under one host's architectural control; skip for ordinary questions and trivial edits.
---

# PM Subagents

Use fresh, bounded workers to shorten implementation without surrendering design or acceptance. Optimize the full decide, dispatch, review, and repair loop for elapsed time and retries. Cheap work sent to an unsuitable model is expensive work.

This skill works with native Codex or Claude agents. Cursor is an optional execution lane, not a dependency.

## Keep one host in control

The host owns:

- user intent, architecture, public contracts, and task boundaries;
- repository instructions, dirty-state preservation, and complete file ownership;
- acceptance criteria, integration order, and material rulings;
- worker and reviewer selection from models actually available at dispatch;
- independent verification, commits, integration, and user communication.

Workers own bounded `inspect → edit → test → fix` packets. They do not change architecture, expand scope, commit, publish, push, contact people, perform external effects, or spawn more agents.

Prefer a capable standard host, such as Sol, when the platform lets you select it. If the host model cannot be changed, continue with the current host and report it truthfully. Never claim a model switch that did not happen.

The host may do a tiny obvious fix when defining and reviewing a packet would cost more than the work. Record that no worker ran. Do not fragment several tiny edits when one same-shape packet can cover them safely.

## Prepare the execution map

Read the approved plan, repository instructions, current status, and relevant interfaces. Resolve architecture and contracts before dispatch.

Use the existing isolated checkout or create a dedicated worktree for substantial implementation. Do not switch or overwrite the user's active branch, and do not start implementation on `main` or `master` without explicit user authorization.

Create a plan-owned progress ledger in an ignored workspace. Its first line identifies the exact plan. Record:

- packet status: pending, running, needs-context, blocked, review, repair, or complete;
- baseline and resulting revisions;
- worker identity and exact model;
- allowed write set and dependencies;
- commands, captured proof, findings, and rulings.

Confirm the workspace is ignored before writing artifacts. Never reuse another plan's ledger. After compaction or restart, reconcile the ledger with Git and live agents. Do not redispatch a complete packet.

## Partition safely

Dispatch only when the desired behavior, contract, write surface, and proof are concrete. Keep architecture, security policy, migration strategy, concurrency design, money or data-integrity decisions, and materially ambiguous behavior with the host.

Packets may run concurrently only when all of these are true:

- their complete write sets are disjoint, including tests, fixtures, snapshots, generated files, manifests, and lockfiles;
- shared interfaces are fixed;
- neither consumes the other's unfinished output;
- processes, ports, databases, test resources, and broad formatters cannot collide.

Otherwise serialize them. Assign every writable path to one active worker. An unexpected required path is an escalation to the host, not permission to edit it.

## Choose the least costly capable model

Inspect models currently available through the dispatch tool. Set the worker model explicitly; never rely on inherited defaults. Use capability classes rather than pinned versions or assumed prices:

| Work | Model class |
| --- | --- |
| Read-only discovery, routine checks, deterministic one- or two-file edits | Lower-cost |
| Prose-defined logic, localized multi-file work, or ordinary semantic review | Mid-tier |
| Material ambiguity or risk that remains after the host fixes the contract | Strong |

Do not use a strong worker to compensate for an unresolved packet. Choose for total completion time, including likely retries. Use a stronger reviewer only when the diff's risk and ambiguity require it; there is no universal most-capable final-review rule.

## Write each work packet

Give a fresh worker only the bounded context it needs. Native agents should use fresh context, such as `fork_turns: "none"`, or the platform's equivalent. Store longer inputs in files and pass their paths.

Every substantive packet must contain:

```markdown
## Objective
One observable outcome and where it fits.

## Baseline
Exact revision and relevant pre-existing changes to preserve.

## Files to inspect
Only the context needed for this packet.

## Allowed write set
Every file the worker may create or modify, including generated files.

## Required behavior and contract
Resolved behavior, interfaces, invariants, edge cases, and acceptance criteria.

## Work
Bounded inspect, edit, test, and ordinary in-scope repair.

## Tests and commands
Focused checks first, then required broader gates owned by this packet.

## Proof
The product boundary to exercise, expected artifacts, and provenance to retain.

## Constraints
Repository rules, dependencies, forbidden external effects, and "Do not spawn agents or commit."

## Report
Report path and concise completion contract.
```

Use `None` for a deliberately empty section. Put exact signatures, values, and cases in one place. Do not paste session history, abandoned approaches, or the whole plan.

## Dispatch and recover

Record the packet as running before dispatch. Save the agent identity, exact model, role, and reason. Let the worker complete routine inspection, implementation, focused tests, and ordinary fixes without asking for step-by-step permission already implied by the task.

When idle, wait on running workers with the platform's bounded wait mechanism. Continue independent host work while they run. Do not poll aggressively or redispatch because a worker is merely slow.

Handle worker outcomes as follows:

- `complete`: inspect the report and actual diff, then review and verify.
- `needs-context`: supply the missing bounded context to the same worker when possible.
- `blocked`: diagnose the cause; change the packet, model, dependency order, or host-owned decision before retrying.
- unexpected scope or user-owned changes: stop that packet, preserve evidence, and take control.

Existing user authorization persists across retries. Continue ordinary authorized repair. Do not invent authority for credentials, additional unapproved cost, destructive actions, publishing, production changes, or messages to other people.

Repeated failure of the same criterion requires host diagnosis and a changed approach. Do not repeat an identical dispatch indefinitely. Stop only when required authority or information is missing, or no credible path remains; report the exact blocker and proof attempted.

## Use Cursor only when it is the chosen lane

Use `pm-cursor-agents` when the user asks for Cursor or when its available sandboxed worker is a suitable execution lane. Load that skill and follow its current-model discovery, complete packet, sandbox, and authoritative timing-receipt rules.

Do not require Cursor installation, switch backends or models silently, or dispatch native and Cursor workers for the same packet. Native agents must work as a complete standalone path.

If the user requires Cursor and it is unavailable, report the exact blocker. Do not substitute a native worker for that required Cursor packet without user direction; native work may continue only on independent packets outside that requirement. If Cursor is optional or preferred, announce the native lane and exact model selection, then continue within existing authorization.

Load another skill only for a named unmet need in the current packet. The user's task and the current workflow stage remain authoritative; keyword overlap alone is not a reason to add another process.

## Review and repair

A worker claim is not acceptance. For every substantive packet, review both:

1. spec compliance against the packet and approved plan;
2. correctness, scope, user-change preservation, and regression risk.

Use a fresh independent reviewer for material changes. The reviewer receives the packet, worker report, exact diff, and binding constraints, with no author rationale. For a small deterministic edit, the host may perform the same checks directly. Do not rerun broad unchanged suites or duplicate a review whose evidence is still valid.

Send all confirmed findings back as one scoped repair packet. Re-review only the fix diff and affected findings, expanding checks only when the fix changes the risk. If repair exposes an architectural decision, the host rules on it before more worker work.

After all packets integrate, run one final integration review proportional to cross-packet risk. Give the fixer one consolidated findings packet. Continue scoped fix and re-review cycles while the approach is changing and credible; diagnose repeated failures instead of enforcing an arbitrary fix-wave count.

Record material rulings as:

`Ruling: <decision> — <reason> — <cost if wrong>`

## Capture evidence by default

Unless the user asks otherwise, exercise the relevant product boundary and present the captured result:

- Visible behavior: run the real journey and capture screenshots or a recording when runnable and allowed.
- Backend behavior: capture the observed request, response, side effect, command output, or other complete boundary.

Retain file, command, result, revision, environment, and runtime provenance. Label fixtures, mocks, and replays clearly; they cannot substitute for runnable live proof. Never fabricate captures, results, durations, costs, prices, or savings. If proof is blocked, disclose what ran and the unavailable dependency.

A required acceptance criterion without its required proof remains incomplete. Report implemented and verified as separate states when they differ. A generated or synthetic image may illustrate written content, but never present it as product evidence or a capture of the implemented behavior.

A request to suppress evidence presentation does not authorize an unverified success claim.

## Final report

Lead with the delivered outcome. Include an agents table when workers ran:

| Agent | Exact model | Role and why | Duration | Outcome |
| --- | --- | --- | --- | --- |

Use measured duration only and name its source; prefer Cursor's receipt when applicable. If no worker ran, say so instead of showing an empty table.

Then report concrete verification and linked or inline proof, remaining risks, and every material ruling with its cost if wrong. Keep internal packets and ledger detail out of the user report unless requested.
