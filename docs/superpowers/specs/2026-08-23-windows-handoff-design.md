# PM Windows Handoff — Design

## Purpose

Create a Mac-owned Codex skill that can hand a Git working state to a native
Windows worker over Tailscale SSH, let Windows run a bounded Codex CLI task,
exchange questions and answers, survive SSH disconnects and Windows restarts,
and return a reviewable result to the Mac. The Mac remains the control plane and
the system of record.

## User experience

The user invokes `$pm-windows-handoff` and describes the task. The skill:

1. Inspects the current Git repository and the task's runtime requirements.
2. Captures the current Mac working state without modifying the real index.
3. Checks whether Windows can run the task and bootstraps safe project-local
   dependencies.
4. Transfers ownership only after preflight succeeds.
5. Dispatches the remote Codex worker and monitors its persisted state.
6. Relays questions back to the Mac task and resumes the same Windows Codex
   session with the answer.
7. Returns the result for Mac-side review, verification, and integration.

The supporting command exposes `doctor`, `dispatch`, `watch`, `status`,
`answer`, `collect`, `reclaim`, and `cancel` operations. The skill normally
chooses and runs these operations for the user; the commands remain available
for diagnosis and manual control.

## Constraints

- The source project must be a Git repository.
- The Mac owns task definition, source-of-truth state, leases, final review,
  integration, commits to the user's branch, and user communication.
- Windows uses native OpenSSH and native Codex CLI. WSL is not required.
- Windows must never work in a user's existing checkout. Every accepted job uses
  a managed worktree created from the exact handoff snapshot.
- An existing Windows repository is an optional cache, not a prerequisite.
- Ignored files and secrets are not transferred implicitly.
- No Git hosting service is required; unpublished objects travel in Git bundles
  over SSH.
- Windows does not merge, push, or modify the Mac branch.
- One lease generation may produce an integrable result. Late results from a
  stale generation are retained as evidence but never applied automatically.
- The initial implementation targets the configured host `pm` at
  `100.69.121.66` and Mac controller identity `100.116.78.32`, with host and path
  overrides available through controller configuration.

## Components

### Skill package

`pm-windows-handoff` teaches Codex when a task is suitable for Windows, how to
state acceptance criteria, when to retain it on the Mac, and how to operate the
controller. Detailed protocol and recovery rules live in a focused reference;
deterministic mechanics live in scripts.

The canonical package lives under `plugins/pm/skills/pm-windows-handoff/` and is
copied to `skills/pm-windows-handoff/` using the repository's publishing
convention.

### Mac controller

A Python CLI owns job creation and state transitions. It:

- probes SSH, Codex, Git, Node, npm, Docker, Compose, disk space, and required
  project commands;
- creates an exact snapshot commit using a temporary Git index, including
  tracked changes and non-ignored untracked files without touching the user's
  real index;
- creates and transfers a Git bundle plus a JSON job contract;
- acquires and renews the Windows lease only after remote preflight succeeds;
- polls compact state files rather than holding a fragile interactive SSH
  connection;
- relays answers, collects result bundles, and performs guarded reclaim;
- refuses automatic integration when the Mac working state changed after the
  snapshot.

Mac controller state lives outside project repositories under
`~/.codex/windows-handoff/jobs/<job-id>/` unless configured otherwise.

### Windows installer and worker

An idempotent PowerShell installer creates `C:\ProgramData\CodexWorker`, deploys
the runner, confirms the existing Tailscale-only SSH policy, resolves the native
Codex executable, and registers a Scheduled Task running as the configured user
at startup and logon.

The Windows worker stores:

```text
C:\ProgramData\CodexWorker\repos\<project-id>\repo.git
C:\ProgramData\CodexWorker\worktrees\<job-id>\
C:\ProgramData\CodexWorker\jobs\<job-id>\
  contract.json
  state.json
  events.jsonl
  heartbeat.json
  prompt.md
  answer.json
  result.json
  codex-session-id.txt
  stdout.jsonl
```

State updates use write-to-temporary-file followed by an atomic rename. The
worker loop is idempotent: after a process or machine restart it scans incomplete
jobs, validates the lease generation, and resumes the recorded Codex session or
restarts from the last checkpoint when no resumable session exists.

### Git transport and worktrees

Each project has a stable identifier derived from its repository identity. The
Windows bare repository caches Git objects across jobs. A transferred bundle
updates only managed handoff refs. Each job creates a fresh worktree from the
snapshot commit.

The remote worker commits its changes on a job-specific result ref and returns a
bundle. The Mac imports that ref, reviews the snapshot-to-result diff, reruns
verification, then applies or cherry-picks only when its guarded integration
checks succeed. Old managed worktrees may be pruned after a retention period;
bare caches remain reusable.

## Job contract

The JSON contract includes:

- protocol version, job ID, project ID, snapshot commit, branch label;
- lease owner, generation, issue time, expiry time;
- objective, acceptance criteria, allowed write scope, prohibited actions;
- runtime requirements and version ranges;
- bootstrap, focused-test, and broader-verification commands;
- required environment-variable names and separately approved secret names;
- timeout, heartbeat interval, checkpoint policy, and result schema.

The Codex result schema is:

```json
{
  "state": "completed|needs_input|checkpoint|failed",
  "summary": "string",
  "question": "string|null",
  "checkpoint_commit": "string|null",
  "tests": [{"command": "string", "outcome": "string"}],
  "risks": ["string"]
}
```

## Capability-gated preflight

Windows classifies a job before it receives the lease:

- `READY`: all machine and project prerequisites are available.
- `BOOTSTRAPPABLE`: only explicitly safe project-local setup is missing, such as
  `npm ci`; bootstrap runs and preflight repeats.
- `MAC_ONLY`: a required runtime, service, secret, platform capability, or safe
  bootstrap path is unavailable.

For Node projects, Windows installs from the lockfile and never receives
macOS `node_modules`. For container projects, Docker Engine and Compose must
answer real probes before acceptance. Because this Windows machine currently has
a damaged WSL installation, Docker-dependent jobs remain `MAC_ONLY` until a
native Windows Docker probe passes. Submodules, Git LFS, symlinks, case-folding
collisions, native packages, port availability, and required services are
explicit preflight checks when applicable.

Preflight may install project-local dependencies declared by the repository. It
must not install global software, repair WSL, change firewall policy, copy broad
secret sets, or perform destructive setup without explicit user authorization.

## Leases, questions, and fallback

The Mac writes a lease containing `owner`, `generation`, and `expires_at`.
Windows starts mutation only after receiving the current generation. Heartbeats
renew liveness evidence; they do not independently grant ownership.

When Windows needs a decision, it atomically writes `needs_input`, includes one
focused question and its checkpoint, then ends the current Codex turn. The Mac
controller observes the state and either answers from established task context
or asks the user. `answer` records the response and invokes `codex exec resume`
against the saved Windows session.

Recovery has two levels:

1. Soft recovery: reconnect to Windows and resume the same job/session after an
   SSH, worker-process, or machine restart.
2. Hard reclaim: after Windows is continuously unavailable for ten minutes, the
   Mac increments the lease generation and resumes locally from the latest
   checkpoint. If no safe checkpoint exists, the Mac reports the blocked job
   rather than inventing state.

After hard reclaim, results from the previous Windows generation are stale and
cannot be automatically integrated.

## Restart behavior

The Windows Scheduled Task runs at machine startup and user logon, restarts on
ordinary failure, and invokes the same idempotent recovery scan. Job state,
Codex session ID, Git refs, and checkpoints are on disk before a transition is
reported. A reboot between any two transitions therefore yields either the old
valid state or the new valid state, never an assumed in-memory state.

The Mac does not interpret a brief reboot as failure. It keeps the lease during
the ten-minute recovery window, polls with bounded backoff, and resumes normal
monitoring when heartbeats return.

## Security

- SSH remains key-only and restricted by Windows Firewall to the Mac Tailscale
  IP.
- Job identifiers and paths are validated; remote commands do not interpolate
  untrusted shell fragments.
- Commands are serialized in the contract and executed through explicit process
  argument arrays where supported.
- Secrets are opt-in by name, stored only in Windows-protected job scope, never
  written to logs, and removed during job cleanup.
- Bundle refs, result refs, and lease generations are verified before import or
  integration.
- Cancellation is graceful first; force termination requires a bounded target
  PID recorded for that job.

## Testing strategy

### Automated Mac tests

- Contract validation and protocol-version rejection.
- Job state-machine transitions, including invalid and stale generations.
- Temporary-index snapshots preserve the real Mac index and include the intended
  dirty files.
- Bundle creation/import round trips and guarded result integration.
- Capability classification and bootstrap allowlisting.
- Question/answer and Codex-session resume behavior using process fakes.
- Timeout, heartbeat, soft recovery, hard reclaim, and stale-result rejection.
- SSH command construction and hostile path/argument cases.

### Automated Windows tests

- Idempotent installation and Scheduled Task registration.
- Atomic state writes and recovery scans.
- Existing bare cache reuse and missing-cache creation.
- Worktree isolation and cleanup.
- Native Codex discovery outside `PATH`.
- Resume from stored session ID and fallback to checkpoint.
- Secret redaction and validated job paths.

### Live integration tests

Run progressive tests against `pm`:

1. Read-only doctor and capability report.
2. Clean, dependency-free fixture round trip.
3. Dirty tracked plus untracked-file snapshot round trip.
4. Node fixture using `npm ci`, tests, and Windows dependency cache reuse.
5. Worker Codex task that edits, tests, commits, and returns a bundle.
6. `needs_input` question, Mac answer, and same-session resume.
7. Kill the SSH client while Windows continues.
8. Kill the Windows worker process and verify Scheduled Task recovery.
9. Simulate stale heartbeat and verify Mac soft-wait behavior.
10. Simulate hard reclaim and reject the late Windows result.
11. Perform an explicitly approved real Windows reboot during an active
    checkpointed job, then verify automatic continuation and successful return.
12. Attempt a Docker-required fixture; expect `MAC_ONLY` until Docker passes its
    real engine and Compose probes.

No test may alter the user's active project checkout. Live tests use temporary
fixture repositories and managed job paths. A real reboot is never initiated
without warning and explicit approval immediately before the reboot.

## Success criteria

- A user can invoke one skill from a Git project and delegate a suitable task to
  Windows without manually preparing a Windows checkout.
- Windows reuses an existing managed repository or creates it automatically.
- Missing or incompatible dependencies are reported before ownership transfers.
- The task survives SSH loss, worker termination, and an approved Windows reboot.
- Questions travel from Windows to Mac and answers resume the same Codex session.
- Mac can reclaim safely without split-brain integration.
- Mac independently reviews and verifies every returned result before applying
  it to the user's working state.

## Out of scope for the first version

- Non-Git projects.
- Copying arbitrary ignored build artifacts or complete `.env` files.
- Automatic global runtime installation or WSL repair.
- Multiple Windows workers or load balancing.
- General-purpose remote desktop or filesystem sharing.
- Automatic pushes, pull requests, or merges into shared branches.
