---
name: orca-dispatch
description: Use when work should start from an Orca intake workspace and the user wants automatic cost-aware selection of a worker or master without manually creating workspaces or choosing agents.
---

# Orca Dispatch

Turn one task request into one Orca-native launch. Cheap routing chooses either a bounded supervised worker or a stronger master; Orca owns every workspace and lifecycle record.

**REQUIRED SUB-SKILLS:** Load `orca-triage`, `orca-cli`, and `orchestration`. Use the version-matched Orca guides before mutating runtime state.

## Route

Resolve the triage helper from the loaded `orca-triage` skill. Build a route packet containing:

- `task`: the requested outcome.
- `contextSummary`: repository, constraints, and only execution-relevant context.
- `acceptance`: observable checks inferred from the request.
- `preferredWorker`: `codex`, `claude`, or `null`.

Do not require file ownership before discovery. Keep task plus context below 24,000 bytes and exclude secrets.

```sh
node "$TRIAGE_PILOT" route --input <packet.json>
```

The receipt is authoritative:

- `blocked`: report the reason and ask only for the material fact Muse marked as requiring clarification. Discoverable uncertainties travel with an eligible route.
- `single_worker`: read [references/single-worker.md](references/single-worker.md).
- `smart_master`: read [references/smart-master.md](references/smart-master.md).

Resolve the target with `orca repo list --json`. Use an exact repo selector when the task or current context identifies one unambiguously; otherwise ask which repository. Do not silently substitute the intake folder for the target repository.

## Boundaries

Run exactly one route. Never reinterpret a blocked receipt, launch both paths, or use the old triage record lock for dispatcher work. Do not keep parallel lifecycle state outside Orca.

A master handoff transfers final acceptance to the launched master. A single-worker route keeps acceptance with the intake coordinator. Destructive actions, publishing, deployments, purchases, account changes, and external messages still require their normal authorization.
