# Single supervised worker

Keep the intake agent as coordinator.

1. Create one Orca Run for the requested objective.
2. Start one worker with `orca orchestration worker-start --spec`, the exact repository, `--worktree new-top-level`, and the routed agent. Use a concise worktree name and explicit acceptance checks in the worker specification.
3. Follow the version-matched coordinator loop. Process questions, escalation, and `worker_done`; worker completion is evidence, not acceptance.
4. Inspect the resulting files and run the acceptance checks. Route a bounded repair through Orca only when the evidence identifies one.
5. Release or retain the settled Dispatch exactly as the Orca receipt requires, acknowledge its delivery, and report the verified outcome.

Start the worker in Orca directly. Never ask the user to create the workspace or select the agent in the UI. Do not call `pilot start` or `pilot finish`; those commands belong to the standalone legacy triage workflow.

