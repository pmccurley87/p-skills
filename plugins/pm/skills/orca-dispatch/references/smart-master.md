# Smart master handoff

Transfer ownership to a fresh master in the target repository. The intake agent does not supervise or sign off the master.

Create one top-level worktree with the routed agent and submit the initial brief atomically:

```text
orca worktree create --repo <exact-selector> --name <task-slug> --no-parent --agent <routed-agent> --prompt <master-brief> --activate --json
```

The master brief contains, in this order:

1. The user's original outcome and constraints.
2. The target repository and observable acceptance checks.
3. The Muse routing pattern from `route.pattern`, explanation from `triage.decision.reason`, and any `triage.decision.uncertainties` as discovery questions. Treat them as recommendations rather than a fixed task graph. Do not substitute the normalized route reason (`eligible`) for Muse's explanation.
4. This ownership contract:

```text
Use $smart-orchestration and $orchestration. You are the master and own decomposition, Orca coordination, integration, verification, and final sign-off. Create native Orca Runs, Tasks, dependencies, and workers for delegated packets. Do not use a platform-native subagent system when Orca can dispatch the worker. Keep architecture, risky decisions, external actions, and final acceptance with this master.
```

A successful handoff requires the new worktree ID, agent terminal handle, and an accepted initial prompt receipt. Report those identifiers and stop intake work. Do not wait for completion, shadow-coordinate the new Run, or start a second master after silence. If launch is ambiguous, inspect the returned Orca receipt and follow its recovery action.
