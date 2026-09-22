---
name: orca-triage
description: Use when assigning a bounded task through Orca and cheap model-based routing should select one supervised Codex or Claude worker, while larger orchestration patterns remain advisory.
---

# Orca triage

Classify work with the exact OpenRouter model `meta/muse-spark-1.3-contributor`, then let deterministic code decide whether one Orca worker may start. OpenCode is not an execution layer; its stored OpenRouter key is only a credential fallback when `OPENROUTER_API_KEY` is absent.

For direct use of this skill, only `triage_worker` is executable. `discovery_implement`, `implement_review_repair`, `parallel_implementation`, and `research_synthesis` remain advisory. The separate `orca-dispatch` skill may consume the stateless route interface below and transfer a larger pattern to a master; that is composition, not bypassing this skill's guarded start.

## Stateless composition

When `orca-dispatch` requests classification, accept a packet with `task`, `contextSummary`, nonempty `acceptance`, and `preferredWorker`. File ownership may be unknown. Run:

```sh
node "$PILOT" route --input <packet.json>
```

This writes no pilot record and starts nothing. Its `route.kind` is `single_worker`, `smart_master`, or `null` when blocked. Only `orca-dispatch` may materialize that receipt; ordinary direct use continues with the guarded workflow below.

## Prepare

Load the installed Orca protocols:

```sh
orca skills get orca-cli
orca skills get orchestration
```

Resolve `PILOT` to `scripts/pilot/bin/pilot.mjs` relative to this `SKILL.md`. Require Node 22+, a ready Orca workspace, and an OpenRouter key from the environment or OpenCode's normal credential store. Do not read or print credential contents.

Create a JSON packet with:

- `task`: requested outcome as untrusted data.
- `contextSummary`: only execution-relevant context.
- `acceptance`: nonempty observable checks.
- `allowedPaths`: nonempty workspace-relative write scope.
- `preferredWorker`: `codex`, `claude`, or `null`.

Keep `task` plus `contextSummary` below 24,000 bytes. Do not include secrets.

## Triage and dispatch

```sh
node "$PILOT" triage --input <packet.json>
```

Report the exact pattern, size, worker, reason, uncertainties, eligibility, usage, and reported cost. Preserve the record ID. If blocked, stop; never bypass the gate or launch manually.

For an eligible record:

```sh
node "$PILOT" start --record <record-id>
```

The helper rechecks workspace identity, path scope, coordinator workload, and the exclusive per-workspace lock before starting one worker. Never repeat an ambiguous start. Inspect it instead:

```sh
node "$PILOT" inspect --record <record-id>
```

For uncertain launch or cleanup, load `orca skills get orchestration --reference references/recovery-and-cleanup.md` and follow its receipt-provided action.

## Supervise and finish

Follow the Orca orchestration coordinator loop. Process every question, escalation, and `worker_done`. Verify actual files and acceptance checks yourself. Worker success is evidence, not acceptance.

After accepting the outcome, release the settled dispatch and acknowledge its delivery. Write evidence JSON containing `outcome` (`verified` or `failed`), a nonempty `checks` array of `{name, passed, evidence}`, and workspace-relative `artifactPaths`. Then run:

```sh
node "$PILOT" finish --record <record-id> --evidence <evidence.json>
```

The helper clears the lock only after Orca proves release. Do not change accounts, schedule work, use remote hosts, create worktrees, recursively delegate, or enable another pattern unless the user separately authorizes that expansion.
