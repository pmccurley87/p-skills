# pm-handover: design and implementation plan

Status: implemented and behaviorally verified as pm v2.10.0.

## Outcome

An agent working midway through a Git task can invoke `pm-handover` to publish a separate checkpoint branch containing the current work and a self-contained handover document. The user receives a branch link and a ready-to-paste prompt for another agent. The receiving agent can recover the exact checkpoint, set up the project on another machine, and continue from the next unfinished step without access to the original chat.

The skill's invocation authorizes creation and push of the task checkpoint to the established repository remote. It does not authorize merging, deploying, sending messages, or copying credentials. This planning request does not invoke that future workflow.

## Approach

Recommend a portable Markdown document plus a small Git snapshot helper.

- Instructions alone are smaller but leave fragile index preservation and partial-push recovery to improvised commands on every run.
- A document plus a helper keeps context writing with the agent and makes Git transfer verifiable and repeatable.
- Remote worker orchestration adds host configuration, session control, and monitoring that this request does not need. Keep it out of v1.

Target any Git repository and any receiving agent. Require Git and Python 3 for the helper, but no Codex session export, SSH access to the destination machine, GitHub CLI, or installed skill on the receiver. Shell examples must fit the stated destination OS; when unknown, use plain Git commands that also work in PowerShell.

## Workflow

### 1. Recover the task and inspect the source

- Read the active conversation, applicable repository instructions, task notes, recent commits, and current diff. Record the user's objective, acceptance criteria, constraints, decisions, attempted approaches, and remaining work.
- Record repository identity, source branch (or detached HEAD), source HEAD, upstream/base when known, staged/unstaged changes, and relevant untracked files. Do not guess missing context or base branches.
- Resolve the established writable remote. Ask only if destination identity or inclusion scope cannot be resolved from context. Sanitize remote URLs before including them in documents or output.
- Classify changed files as task work, unrelated local work, or excluded sensitive/generated data. Include task-relevant untracked files explicitly; do not blindly stage all files.
- Detect unresolved conflicts, merge/rebase/cherry-pick operations, and dirty submodules. Report a concrete blocker for states v1 cannot faithfully transfer; do not abort operations or flatten submodule work silently.
- Pause source edits during capture. Do not run a pull, rebase, reset, stash, or checkout as part of capturing an unfinished task.

### 2. Prepare the handover document

Render `docs/handovers/<timestamp>-<task-slug>.md` into temporary storage, to be included in the snapshot without changing the source worktree. Make the document understandable without this skill or the original chat.

Required content:

1. **Objective and completion criteria:** what the user needs and how to know it is done.
2. **Repository and checkpoint:** credential-free remote URL, source branch and HEAD, handover branch, task checkpoint SHA, document path, known base/upstream.
3. **Current state:** completed work, partial implementations, changed files with their purpose, known failures, and exclusions that affect reproducibility.
4. **Decisions and context:** important reasoning, rejected approaches and why, constraints, relevant issue/PR links, user preferences and approval boundaries.
5. **Next steps:** ordered actionable work, first command or file to inspect, unresolved questions, and acceptance checks. Distinguish confirmed facts from hypotheses.
6. **Verification evidence:** commands actually run, results, which checkpoint/state they tested, and tests not run. A checkpoint may intentionally contain broken or incomplete code; do not repair unrelated failures to make the handover look complete.
7. **Machine setup:** runtime/package-manager versions, dependency installation, services, ports, fixtures, migrations, and OS-specific limitations. Include environment variable names and approved secret acquisition instructions, never values. Explain required ignored/local-only resources and how to recreate them.
8. **Git access and continuation:** clone/fetch/checkout instructions, authentication prerequisites, verification, and where to commit subsequent work.

Use repository-relative paths and actual verified commands. Summarize relevant context rather than dumping the transcript. If context is missing, state exactly what must be rediscovered.

### 3. Capture without disturbing the source branch

- Allocate a unique `codex/handover/<task-slug>-<UTC-timestamp>` branch, adding a suffix on collision. Never reuse or overwrite an existing remote branch automatically.
- Use a temporary Git index seeded from source HEAD and an explicit file manifest. Capture selected working-tree content, including deletions and relevant new files, as a task checkpoint commit with source HEAD as parent. Preserve the user's real index, source branch ref, and worktree.
- A file with staged and unstaged edits transfers its final working-tree content. The handover does not recreate staging boundaries on the other machine. If unrelated changes share the same file and inclusion is ambiguous, resolve scope before capture.
- Create a second commit adding the handover document on top of the task checkpoint. The document can reference the earlier task checkpoint SHA without attempting to embed its own commit hash. Return the final tip SHA in the transfer receipt and prompt.
- Use normal commit creation in an isolated temporary worktree after assembling the snapshot, respecting signing and hooks. If hooks fail or modify the snapshot, stop and report; do not bypass them silently. Verify the committed tree against the selected source contents.
- Detect changes to selected source files, HEAD, and the real index during capture; discard the unadvertised snapshot and retry only after the source is stable. Do not publish a mixed-state checkpoint.
- Exclude credential files and values from new content and documents, and inspect the outgoing history for task-relevant exposure risk. Do not claim this proves the entire repository is secret-free. Ignored dependencies, caches, and local databases are recreated or listed as prerequisites.

### 4. Push and verify

- Push only the new handover ref to the resolved remote using an explicit refspec, with a create-only guard so a racing branch creation cannot be overwritten. Never force-push an existing branch.
- Read the remote ref back and require it to equal the final local tip SHA before declaring the handover ready.
- Where the host is recognized, provide a correctly encoded branch URL and handover document URL. Otherwise return the Git remote URL, branch, and path as the portable locator.
- On authentication/network failure, retain the local checkpoint and document and report the exact retry command. An ambiguous push response must be reconciled against the remote ref before retrying. Distinguish local checkpoint ready from remotely available.
- Do not mark the task itself complete. The successful outcome is a verified handover.

### 5. Give the receiving agent a copyable entry point

Return a short prompt containing the sanitized remote, branch, exact final tip SHA, document path, and instruction to read the handover plus repository instructions before continuing.

The generated commands must cover both a fresh clone and an existing repository. Default to a fresh clone or a new worktree for an existing repository; do not switch or reset a dirty destination checkout. Fetch the named branch, verify its SHA matches the receipt, and start a local continuation branch from that exact SHA. If the remote branch moved, report the discrepancy rather than silently using its new tip.

Assume the receiving machine already has Git credentials configured; the user says this is the most likely case. Try repository access using its existing SSH key or HTTPS credential manager first, without asking for credentials or requiring a login step. Include the repository URL and fetch/checkout commands as the normal path. Only if access fails, distinguish missing authentication from insufficient repository permissions or a network error and provide the relevant host-appropriate setup instructions. Never put tokens, passwords, private keys, or authenticated URLs in Git, the document, or the pasted prompt.

The receiver owns subsequent task work after the user starts it there. Record that source-side continuation may diverge and will need deliberate integration. Do not build locks, background monitoring, or automatic merge-back into v1.

## Proposed files

- `plugins/pm/skills/pm-handover/SKILL.md`: discovery description and agent workflow.
- `plugins/pm/skills/pm-handover/assets/handover-template.md`: output template.
- `plugins/pm/skills/pm-handover/scripts/create_handover.py`: explicit-manifest snapshot, guarded publication, verification, and receipt. Task prose comes from the agent; the script must not invent context.
- `plugins/pm/skills/pm-handover/tests/test_handover.py`: Git fixture tests.
- `plugins/pm/skills/pm-handover/agents/openai.yaml`: display metadata.
- `skills/pm-handover/`: exact mirror of the canonical package.
- `plugins/pm/.claude-plugin/plugin.json` and `CHANGELOG.md`: new-skill release entry and minor version bump from the version current at implementation time (currently 2.9.0).

## Implementation sequence

- [x] Pull latest and inspect repository conventions.
- [x] Write the proposed behavior, boundaries, and acceptance checks.
- [x] Build fixture repositories and behavioral tests for capture and transfer.
- [x] Implement the helper with argument-array subprocess calls, explicit paths/ref validation, cleanup limited to its own temporary resources, and actionable failure receipts.
- [x] Write the skill, document template, and metadata around the verified helper behavior.
- [x] Exercise the full workflow with a realistic half-finished task, then resume from a fresh clone using only the generated prompt/document.
- [x] Mirror the package, validate both skills, check diffs, update version/changelog using the repository publishing workflow when implementing/releasing.

## Acceptance checks

- Dirty fixture: staged and unstaged changes, deletion, executable file, filenames containing spaces, and relevant untracked file arrive with the expected contents.
- Preservation: original branch ref, HEAD, staged diff, unstaged diff, and untracked files remain unchanged after success and failure.
- Scope: unrelated work and ignored secrets stay out of the checkpoint; document includes exclusions and names of required configuration without values.
- Transfer: a local bare remote and fresh clone recover the exact final tip; the document's task checkpoint SHA resolves to its parent. No original-machine path or chat is required to understand the next step.
- Failures: remote unavailable, rejected push, colliding branch, concurrent source edit, hook failure/modification, and missing authentication yield accurate status and retain recoverable work.
- Unsupported state: conflicts and dirty submodules block clearly; clean submodules and Git LFS include required receiver setup and object availability checks when applicable.
- Destination: fresh clone and existing dirty checkout instructions preserve local work and check the receipt SHA before continuation.
- Task fidelity: the handover records a deliberate failing test and partial implementation accurately; the receiver can identify and execute the next step without re-deriving the task.

## Defaults and limits

No machine-specific worker, automatic agent launch, background monitoring, secret transport, deployment, merge-back, or release of the target project. A Git checkpoint transfers versioned code and written context, not running processes or in-memory state. Any required external artifact must have a documented accessible source; otherwise the handover must say what blocks continuation.
