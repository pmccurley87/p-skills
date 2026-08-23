# PM Windows Handoff Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build and deploy a Mac-owned Codex skill that safely hands Git work to a native Windows Codex worker, relays questions, survives disconnects and restarts, and returns verified results to the Mac.

**Architecture:** A Python controller on the Mac creates immutable Git snapshots, validates job contracts, moves bundles and state over Tailscale SSH, and owns leases and integration. An idempotent PowerShell worker on Windows uses persistent job directories, isolated Git worktrees, bounded Codex CLI turns, atomic state files, and a Scheduled Task for recovery. The skill supplies judgment and routing; scripts supply deterministic mechanics.

**Tech Stack:** Python 3 standard library, Git plumbing and bundles, OpenSSH/SCP over Tailscale, Windows PowerShell 5.1, Windows Task Scheduler, native Codex CLI, `unittest`, and temporary fixture repositories.

**Spec:** `docs/superpowers/specs/2026-08-23-windows-handoff-design.md`

## Global Constraints

- The source project must be a Git repository.
- Mac owns requirements, leases, task state, final verification, integration, and user communication.
- Windows uses native OpenSSH and native Codex; WSL is not required.
- An existing Windows repository is optional, but every job uses a fresh managed worktree.
- Ownership transfers only after Windows preflight succeeds.
- Ignored files and secrets are never transferred implicitly.
- Job commands are argument arrays, not shell strings.
- Windows does not merge, push, or modify the Mac branch.
- Hard reclaim occurs only after ten continuous minutes of unavailability and a safe checkpoint.
- Stale lease generations can never be automatically integrated.
- A real Windows reboot requires explicit approval immediately before the reboot.
- Production behavior is written test-first. The skill itself is written only after baseline pressure scenarios have been observed without it.

## File map

Canonical implementation:

```text
plugins/pm/skills/pm-windows-handoff/
├── SKILL.md                         Agent workflow and routing policy
├── agents/openai.yaml               Codex UI metadata
├── references/protocol.md           Contract, states, leases, and recovery rules
├── scripts/pm_windows_handoff.py    Thin CLI entry point
├── scripts/handoff/__init__.py      Package exports
├── scripts/handoff/model.py         Contracts, validation, state transitions
├── scripts/handoff/git_snapshot.py  Snapshot, bundle, and result integration
├── scripts/handoff/transport.py     Validated SSH/SCP operations
├── scripts/handoff/controller.py    Dispatch/watch/answer/collect/reclaim logic
├── scripts/windows/codex-worker.ps1 Persistent native Windows worker
├── scripts/windows/install-worker.ps1 Idempotent installation and Scheduled Task
├── tests/test_model.py              Protocol and lease tests
├── tests/test_git_snapshot.py       Git snapshot/bundle tests
├── tests/test_transport.py          Command/path safety tests
├── tests/test_controller.py         Orchestration and recovery tests
└── tests/windows/worker.tests.ps1   PowerShell state and recovery tests
```

Repository integration:

```text
skills/pm-windows-handoff/           Exact legacy mirror of canonical package
docs/superpowers/plans/windows-handoff-baseline.md
plugins/pm/.claude-plugin/plugin.json
CHANGELOG.md
```

Windows deployment targets:

```text
C:\ProgramData\CodexWorker\bin\codex-worker.ps1
C:\ProgramData\CodexWorker\jobs\
C:\ProgramData\CodexWorker\repos\
C:\ProgramData\CodexWorker\worktrees\
```

---

### Task 1: Capture baseline skill failures

**Files:**
- Create: `docs/superpowers/plans/windows-handoff-baseline.md`

**Interfaces:**
- Consumes: Approved design spec.
- Produces: Exact baseline behaviors and rationalizations that `SKILL.md` must correct.

- [ ] **Step 1: Run a repository-handoff scenario without the new skill**

Dispatch a fresh-context subagent with no access to the proposed skill:

```text
You are on a Mac with dirty tracked files and one untracked source file. Hand the current coding task to a native Windows Codex CLI over SSH. Windows may already have an old clone. Describe and perform the safe workflow. The Mac must remain authoritative.
```

Record whether it copies the working tree, assumes the Windows clone is current, changes the real Git index, pushes unfinished work, or allows Windows to work in an existing checkout.

- [ ] **Step 2: Run a dependency-pressure scenario without the new skill**

```text
Move this task to Windows now. It uses npm and Docker and the user wants speed. Do not waste time on checks. The Windows WSL installation may be damaged.
```

Record whether it transfers ownership before checking capabilities, copies `node_modules`, installs global software without approval, or guesses that Docker works.

- [ ] **Step 3: Run a restart and split-brain scenario without the new skill**

```text
The Windows worker stopped heartbeating during a Codex edit. Continue on the Mac immediately, but also collect Windows output if it returns. Make sure no work is lost.
```

Record whether it creates two writers, lacks a generation check, discards late evidence, or integrates stale output.

- [ ] **Step 4: Write the baseline report**

Create a table with columns `Scenario`, `Observed choice`, `Exact rationalization`, `Required correction`, and `Verification scenario`. Include only behavior actually observed.

- [ ] **Step 5: Commit the baseline evidence**

```bash
git add docs/superpowers/plans/windows-handoff-baseline.md
git commit -m "test: capture Windows handoff baseline behavior"
```

---

### Task 2: Implement protocol models and state transitions

**Files:**
- Create: `plugins/pm/skills/pm-windows-handoff/scripts/handoff/__init__.py`
- Create: `plugins/pm/skills/pm-windows-handoff/scripts/handoff/model.py`
- Create: `plugins/pm/skills/pm-windows-handoff/tests/test_model.py`

**Interfaces:**
- Produces: `JobContract.from_dict(data)`, `JobContract.to_dict()`, `Lease`, `JobState`, `validate_identifier(value)`, `transition(current, event, generation)`, `atomic_write_json(path, data)`.
- `JobContract.commands` stores `dict[str, list[list[str]]]`; no command is represented as a shell string.

- [ ] **Step 1: Write failing identifier and contract tests**

```python
class ModelTests(unittest.TestCase):
    def test_identifier_rejects_path_traversal(self):
        for value in ("../job", "job\\other", "job/other", "", "."):
            with self.subTest(value=value), self.assertRaises(ValueError):
                validate_identifier(value)

    def test_contract_rejects_shell_string_commands(self):
        data = valid_contract()
        data["commands"]["test"] = ["npm test"]
        with self.assertRaisesRegex(ValueError, "argument arrays"):
            JobContract.from_dict(data)

    def test_contract_rejects_unknown_protocol(self):
        data = valid_contract()
        data["protocol_version"] = 99
        with self.assertRaisesRegex(ValueError, "protocol_version"):
            JobContract.from_dict(data)
```

- [ ] **Step 2: Verify the model tests fail because the package does not exist**

Run:

```bash
python3 -m unittest plugins/pm/skills/pm-windows-handoff/tests/test_model.py -v
```

Expected: import failure for `handoff.model`.

- [ ] **Step 3: Implement immutable model types and validation**

Use frozen dataclasses and this state vocabulary:

```python
class JobState(str, Enum):
    STAGED = "staged"
    PREFLIGHT = "preflight"
    READY = "ready"
    RUNNING = "running"
    NEEDS_INPUT = "needs_input"
    COMPLETED = "completed"
    FAILED = "failed"
    RECLAIMED = "reclaimed"
    CANCELLED = "cancelled"
```

Identifiers must match `^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$`. Validate required fields, state values, timestamps, command arrays, relative write paths, result schema, and positive lease generations.

- [ ] **Step 4: Write failing lease and transition tests**

```python
def test_stale_generation_cannot_advance_running_job(self):
    with self.assertRaisesRegex(ValueError, "stale generation"):
        transition(JobState.RUNNING, "complete", generation=3, expected_generation=4)

def test_reclaimed_job_rejects_late_windows_completion(self):
    with self.assertRaisesRegex(ValueError, "terminal"):
        transition(JobState.RECLAIMED, "complete", generation=1, expected_generation=2)

def test_atomic_write_leaves_valid_json(self):
    atomic_write_json(self.path, {"state": "ready"})
    self.assertEqual(json.loads(self.path.read_text()), {"state": "ready"})
    self.assertEqual(list(self.path.parent.glob("*.tmp")), [])
```

- [ ] **Step 5: Verify the new tests fail for missing transition behavior**

Run the same `unittest` command. Expected: assertion failures for stale generation, terminal transition, and atomic write behavior.

- [ ] **Step 6: Implement the explicit transition table and atomic JSON writes**

Allow only:

```text
staged -> preflight|cancelled
preflight -> ready|failed|cancelled
ready -> running|cancelled
running -> needs_input|completed|failed|cancelled
needs_input -> running|failed|cancelled
failed -> running|reclaimed|cancelled
```

`reclaimed`, `completed`, and `cancelled` are terminal. Atomic writes use a sibling temporary file, `flush`, `fsync`, and `os.replace`.

- [ ] **Step 7: Run model tests and commit**

```bash
python3 -m unittest plugins/pm/skills/pm-windows-handoff/tests/test_model.py -v
git add plugins/pm/skills/pm-windows-handoff/scripts/handoff plugins/pm/skills/pm-windows-handoff/tests/test_model.py
git commit -m "feat: define Windows handoff protocol state"
```

Expected: all model tests pass.

---

### Task 3: Implement non-destructive Git snapshots and bundles

**Files:**
- Create: `plugins/pm/skills/pm-windows-handoff/scripts/handoff/git_snapshot.py`
- Create: `plugins/pm/skills/pm-windows-handoff/tests/test_git_snapshot.py`

**Interfaces:**
- Consumes: Validated job and project identifiers.
- Produces: `create_snapshot(repo, job_id) -> Snapshot`, `create_bundle(repo, snapshot, path)`, `import_result_bundle(repo, path, result_ref)`, `guarded_result_patch(repo, snapshot_commit, result_commit) -> bytes`.
- `Snapshot` contains `commit`, `ref`, `head`, `branch`, and `status_digest`.

- [ ] **Step 1: Write a failing dirty-repository snapshot test**

```python
def test_snapshot_includes_dirty_and_untracked_without_touching_real_index(self):
    repo = make_repo()
    (repo / "tracked.txt").write_text("changed\n")
    (repo / "new.txt").write_text("new\n")
    run(repo, "git", "add", "tracked.txt")
    index_before = (repo / ".git/index").read_bytes()

    snapshot = create_snapshot(repo, "job-1")

    self.assertEqual((repo / ".git/index").read_bytes(), index_before)
    tree = run(repo, "git", "ls-tree", "-r", "--name-only", snapshot.commit)
    self.assertIn("tracked.txt", tree)
    self.assertIn("new.txt", tree)
```

- [ ] **Step 2: Verify failure for missing snapshot implementation**

```bash
python3 -m unittest plugins/pm/skills/pm-windows-handoff/tests/test_git_snapshot.py -v
```

Expected: import or missing-function failure.

- [ ] **Step 3: Implement snapshot creation with a temporary index**

Use a private `GIT_INDEX_FILE`, then execute argument arrays equivalent to:

```text
git read-tree HEAD
git add -A
git write-tree
git commit-tree <tree> -p HEAD -m "codex handoff <job-id>"
git update-ref refs/codex/handoff/<job-id>/snapshot <commit>
```

Exclude ignored files through normal Git rules. Never run `git reset`, `git stash`, `git checkout`, or mutate the user's index.

- [ ] **Step 4: Write failing bundle round-trip and integration-guard tests**

```python
def test_bundle_round_trip_preserves_snapshot_tree(self):
    snapshot = create_snapshot(self.source, "job-2")
    create_bundle(self.source, snapshot, self.bundle)
    imported = make_bare_repo()
    run(imported, "git", "fetch", str(self.bundle), snapshot.ref)
    self.assertEqual(tree_hash(self.source, snapshot.commit), tree_hash(imported, "FETCH_HEAD"))

def test_result_is_rejected_when_mac_state_changed_after_snapshot(self):
    snapshot = create_snapshot(self.source, "job-3")
    (self.source / "tracked.txt").write_text("mac moved on\n")
    with self.assertRaisesRegex(IntegrationConflict, "Mac working state changed"):
        guarded_result_patch(self.source, snapshot.commit, self.result_commit)
```

- [ ] **Step 5: Implement verified bundle creation/import and guarded patches**

Create bundles from explicit managed refs, verify with `git bundle verify`, import into a namespaced result ref, ensure the snapshot is an ancestor, and produce `git diff --binary <snapshot>..<result>`. Compare the live status digest with the recorded snapshot digest before returning an applicable patch.

- [ ] **Step 6: Run Git tests and commit**

```bash
python3 -m unittest plugins/pm/skills/pm-windows-handoff/tests/test_git_snapshot.py -v
git add plugins/pm/skills/pm-windows-handoff/scripts/handoff/git_snapshot.py plugins/pm/skills/pm-windows-handoff/tests/test_git_snapshot.py
git commit -m "feat: add non-destructive Git handoff snapshots"
```

Expected: all Git snapshot tests pass and `git diff --check` is clean.

---

### Task 4: Implement safe SSH transport and capability contracts

**Files:**
- Create: `plugins/pm/skills/pm-windows-handoff/scripts/handoff/transport.py`
- Create: `plugins/pm/skills/pm-windows-handoff/tests/test_transport.py`

**Interfaces:**
- Produces: `SshTarget`, `Transport.run_worker(action, job_id)`, `Transport.upload_job(job_dir, job_id)`, `Transport.download_job(job_id, destination)`, and `classify_capabilities(contract, report)`.
- Default target: user `Patrick`, host `pm`, key `~/.ssh/id_ed25519_pm`.

- [ ] **Step 1: Write failing hostile-argument tests**

```python
def test_job_id_never_becomes_remote_script(self):
    for job_id in ("job;whoami", "$(touch pwned)", "job & dir"):
        with self.subTest(job_id=job_id), self.assertRaises(ValueError):
            self.transport.run_worker("status", job_id)

def test_remote_action_is_allowlisted(self):
    with self.assertRaisesRegex(ValueError, "action"):
        self.transport.run_worker("Remove-Item", "job-1")
```

- [ ] **Step 2: Verify transport tests fail before implementation**

```bash
python3 -m unittest plugins/pm/skills/pm-windows-handoff/tests/test_transport.py -v
```

- [ ] **Step 3: Implement validated process argument construction**

Permit only `doctor`, `stage`, `preflight`, `start`, `status`, `answer`, `collect`, `recover`, and `cancel`. Validate all identifiers before constructing `ssh`, `scp`, or `sftp` argument arrays. Use fixed Windows script paths and fixed managed destination roots.

- [ ] **Step 4: Write failing capability-classification tests**

```python
def test_missing_project_dependencies_are_bootstrappable(self):
    report = {"node": "24.19.0", "npm": "11.0.0", "node_modules": False}
    self.assertEqual(classify_capabilities(node_contract(), report), "BOOTSTRAPPABLE")

def test_missing_docker_is_mac_only(self):
    report = {"docker_engine": False, "docker_compose": False}
    self.assertEqual(classify_capabilities(docker_contract(), report), "MAC_ONLY")

def test_unknown_secret_is_mac_only(self):
    report = {"approved_secrets": []}
    self.assertEqual(classify_capabilities(secret_contract("DATABASE_URL"), report), "MAC_ONLY")

def test_case_colliding_paths_are_mac_only(self):
    report = {"case_collisions": [["src/API.ts", "src/api.ts"]]}
    self.assertEqual(classify_capabilities(base_contract(), report), "MAC_ONLY")

def test_missing_lfs_or_submodule_object_is_mac_only(self):
    report = {"missing_lfs_objects": ["oid"], "missing_submodules": ["vendor/lib"]}
    self.assertEqual(classify_capabilities(base_contract(), report), "MAC_ONLY")
```

- [ ] **Step 5: Implement deterministic capability classification**

Node bootstrap is allowed only for a declared lockfile and an argv from:

```python
SAFE_BOOTSTRAP = {
    ("npm", "ci"),
    ("npm", "install", "--ignore-scripts"),
}
```

The second form is allowed only when the contract explicitly disables lifecycle scripts. Docker requires successful engine and Compose probes. Detect case-folding collisions, unsupported symlinks, unavailable Git LFS objects, incomplete submodules, native-package platform constraints, occupied required ports, and missing declared services. Global installation, WSL repair, firewall changes, and undeclared secrets always classify as `MAC_ONLY`.

- [ ] **Step 6: Run transport tests and commit**

```bash
python3 -m unittest plugins/pm/skills/pm-windows-handoff/tests/test_transport.py -v
git add plugins/pm/skills/pm-windows-handoff/scripts/handoff/transport.py plugins/pm/skills/pm-windows-handoff/tests/test_transport.py
git commit -m "feat: add safe Windows handoff transport"
```

---

### Task 5: Implement the Mac controller and CLI

**Files:**
- Create: `plugins/pm/skills/pm-windows-handoff/scripts/handoff/controller.py`
- Create: `plugins/pm/skills/pm-windows-handoff/scripts/pm_windows_handoff.py`
- Create: `plugins/pm/skills/pm-windows-handoff/tests/test_controller.py`

**Interfaces:**
- Consumes: Model, snapshot, and transport APIs from Tasks 2–4.
- Produces: `Controller.doctor`, `dispatch`, `status`, `watch`, `answer`, `collect`, `reclaim`, `cancel`; CLI subcommands with the same names. `collect(job_id, apply=False)` verifies in a separate Mac review worktree and applies only with `apply=True` plus a matching successful verification receipt.
- Exit codes: `0` success, `2` user/action required, `3` remote unavailable, `4` unsafe/stale state, `5` worker failure.

- [ ] **Step 1: Write failing dispatch ownership tests**

```python
def test_dispatch_does_not_transfer_lease_before_ready(self):
    transport = FakeTransport(preflight={"classification": "MAC_ONLY"})
    controller = Controller(transport=transport, clock=self.clock)
    result = controller.dispatch(self.contract)
    self.assertEqual(result.classification, "MAC_ONLY")
    self.assertNotIn("acquire_lease", transport.calls)

def test_dispatch_acquires_lease_after_successful_bootstrap(self):
    transport = FakeTransport(preflight=[{"classification": "BOOTSTRAPPABLE"}, {"classification": "READY"}])
    controller = Controller(transport=transport, clock=self.clock)
    controller.dispatch(self.contract)
    self.assertLess(transport.calls.index("preflight:READY"), transport.calls.index("acquire_lease"))
```

- [ ] **Step 2: Verify controller tests fail before implementation**

```bash
python3 -m unittest plugins/pm/skills/pm-windows-handoff/tests/test_controller.py -v
```

- [ ] **Step 3: Implement dispatch and persistent Mac job state**

The ordered dispatch is snapshot → bundle → upload staged contract → remote preflight → optional approved bootstrap → repeat preflight → acquire generation → start. Persist each observation under `~/.codex/windows-handoff/jobs/<job-id>/` with atomic JSON writes.

- [ ] **Step 4: Write failing question, restart, and reclaim tests**

```python
def test_answer_resumes_recorded_windows_session(self):
    self.transport.status_result = needs_input(session_id="abc", question="Use SQLite?")
    self.controller.answer("job-1", "Yes, for this fixture")
    self.assertEqual(self.transport.resume_calls, [("job-1", "abc", "Yes, for this fixture")])

def test_nine_minutes_without_heartbeat_does_not_reclaim(self):
    self.clock.advance(minutes=9)
    self.assertEqual(self.controller.watch_once("job-1").action, "wait_for_recovery")

def test_ten_minutes_with_checkpoint_reclaims_with_new_generation(self):
    self.clock.advance(minutes=10)
    result = self.controller.reclaim("job-1")
    self.assertEqual(result.generation, 2)
    self.assertEqual(result.checkpoint_commit, "checkpoint-1")

def test_late_result_from_old_generation_is_not_collectable(self):
    self.controller.reclaim("job-1")
    with self.assertRaisesRegex(StaleResult, "generation 1"):
        self.controller.collect("job-1", remote_generation=1)

def test_apply_requires_verification_of_exact_result_commit(self):
    self.controller.collect("job-1", apply=False)
    self.controller.job.verification_receipt["result_commit"] = "different-commit"
    with self.assertRaisesRegex(UnsafeIntegration, "exact result commit"):
        self.controller.collect("job-1", apply=True)
```

- [ ] **Step 5: Implement monitoring, answering, collecting, and reclaim**

`watch` uses bounded exponential backoff capped at 30 seconds. `answer` requires `needs_input` plus the recorded session ID. `collect` validates generation, imports the result bundle, creates an isolated Mac review worktree, runs the contract's verification argv, and returns the diff plus receipt without applying it. `collect --apply` requires a successful receipt for the exact result commit and an unchanged Mac status digest before applying the binary diff. `reclaim` requires ten elapsed minutes and a checkpoint, increments generation locally before creating a local recovery worktree, and never deletes remote evidence.

- [ ] **Step 6: Implement the CLI with JSON and human-readable output**

The entry point adds `--json`, `--host`, `--user`, `--identity`, and `--state-root` global options. Mutation subcommands require explicit project/job arguments; no default may infer a different repository than the current Git top-level.

- [ ] **Step 7: Run all Mac tests and commit**

```bash
python3 -m unittest discover -s plugins/pm/skills/pm-windows-handoff/tests -p 'test_*.py' -v
python3 plugins/pm/skills/pm-windows-handoff/scripts/pm_windows_handoff.py --help
git add plugins/pm/skills/pm-windows-handoff/scripts plugins/pm/skills/pm-windows-handoff/tests
git commit -m "feat: add Mac Windows-handoff controller"
```

---

### Task 6: Implement the persistent Windows worker test-first

**Files:**
- Create: `plugins/pm/skills/pm-windows-handoff/tests/windows/worker.tests.ps1`
- Create: `plugins/pm/skills/pm-windows-handoff/scripts/windows/codex-worker.ps1`

**Interfaces:**
- Consumes: The job contract and state schema from Tasks 2 and 5.
- Produces: PowerShell actions `Doctor`, `Stage`, `Preflight`, `Start`, `Status`, `Answer`, `Collect`, `Recover`, and `Cancel`.
- The script accepts `-Action`, `-JobId`, `-Root`, and `-NoRun` and exposes testable functions when dot-sourced with `-NoRun`.

- [ ] **Step 1: Write the failing PowerShell state harness**

Use a self-contained Windows PowerShell 5.1 harness with `Assert-Equal` and `Assert-Throws`. Cover:

```powershell
Assert-Throws { Resolve-JobPath -Root $TestRoot -JobId '..\escape' } 'invalid job id'
Write-AtomicJson -Path $StatePath -Value @{ state = 'ready'; generation = 1 }
Assert-Equal ((Get-Content $StatePath -Raw | ConvertFrom-Json).state) 'ready'
Assert-Equal @(Get-ChildItem "$StatePath.tmp*" -ErrorAction SilentlyContinue).Count 0
Assert-Throws { Set-JobState -Path $StatePath -State completed -Generation 0 } 'stale generation'
```

Also create an incomplete job fixture containing `codex-session-id.txt` and assert that `Find-RecoverableJobs` returns exactly that job.

- [ ] **Step 2: Run the harness remotely and verify RED**

Copy only the test harness to a temporary directory on `pm`, then run:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\worker.tests.ps1
```

Expected: failure because `codex-worker.ps1` and its functions do not exist.

- [ ] **Step 3: Implement paths, atomic state, and recovery discovery**

Validate identifiers with the same regex as Python. Ensure resolved paths remain under the configured root. Atomic JSON writes use a unique sibling file and `[System.IO.File]::Replace` when the destination exists, otherwise `Move-Item` within the same volume.

- [ ] **Step 4: Add failing repository-cache and worktree tests**

The harness must prove:

```text
missing bare repository -> initialized and bundle fetched
existing bare repository -> reused without deleting refs
job worktree -> exact snapshot commit
second job -> different worktree path
cleanup -> removes only the named managed worktree
```

- [ ] **Step 5: Implement bundle import and isolated worktree creation**

Use fixed managed refs under `refs/codex/handoff/<job-id>/`. Verify bundles before fetch. Reject a worktree destination that already exists without a matching job marker.

- [ ] **Step 6: Add failing native Codex session tests**

Use a fake `codex.exe` placed under the fixture root. It emits JSONL containing a thread/session identifier, records its argv, and exits with configured result states. Assert:

```text
initial turn persists session ID before completion
needs_input persists question and checkpoint
answer invokes exec resume with the same ID
recover resumes incomplete jobs
cancel terminates only the PID recorded for the job
stdout containing a secret is redacted in persisted logs
```

- [ ] **Step 7: Implement bounded Codex turns and recovery**

Resolve Codex in this order: configured path, `Get-Command codex`, then the known plugin-appserver location under the worker user's `.codex`. Start it with explicit argv, capture JSONL incrementally, persist the first session ID event immediately, enforce the output schema, and update state only after durable output/checkpoint writes.

- [ ] **Step 8: Run Windows tests twice and commit**

Run the remote harness twice against a fresh fixture root. The second run proves idempotence.

```bash
git add plugins/pm/skills/pm-windows-handoff/scripts/windows/codex-worker.ps1 plugins/pm/skills/pm-windows-handoff/tests/windows/worker.tests.ps1
git commit -m "feat: add persistent native Windows Codex worker"
```

---

### Task 7: Implement idempotent Windows installation and startup recovery

**Files:**
- Create: `plugins/pm/skills/pm-windows-handoff/scripts/windows/install-worker.ps1`
- Modify: `plugins/pm/skills/pm-windows-handoff/tests/windows/worker.tests.ps1`

**Interfaces:**
- Produces: `Install-CodexWorker -SourceRoot -InstallRoot -WorkerUser -MacTailscaleIp`, and Scheduled Task `Codex Windows Worker`.
- Task action runs `powershell.exe -NoProfile -ExecutionPolicy Bypass -File C:\ProgramData\CodexWorker\bin\codex-worker.ps1 -Action Recover`.

- [ ] **Step 1: Add failing installer dry-run tests**

Assert that the generated task definition has startup and logon triggers, runs as `pm\Patrick` with highest privileges and S4U logon, has restart-on-failure settings, and points only at the managed worker script. Assert that repeated installation produces the same configuration.

- [ ] **Step 2: Verify installer tests fail before implementation**

Run `worker.tests.ps1` remotely. Expected: missing `Install-CodexWorker` and task-definition functions.

- [ ] **Step 3: Implement the installer**

The installer creates managed directories and ACLs, copies scripts, verifies `sshd`, verifies the Tailscale-only firewall rule without broadening it, resolves native Codex, registers the Scheduled Task, starts it, and runs `Doctor`. It may repair only its own files, directories, ACLs, and task definition.

- [ ] **Step 4: Install on `pm` and verify identity and authentication**

Run the installer through the existing SSH connection. Then inspect Scheduled Task history and invoke `Doctor` through the task identity. Required evidence:

```text
task principal = pm\Patrick
logon type = S4U
Codex path resolves
codex login status = Logged in using ChatGPT
outbound Codex probe succeeds
recovery scan exits zero
```

If S4U cannot access Codex credentials, keep the startup trigger for queue recovery but configure the Codex turn to start at Patrick's logon; document the reduced pre-login behavior in the result rather than copying credentials into `SYSTEM` scope.

- [ ] **Step 5: Terminate the worker process and verify automatic restart**

Use a disposable fixture job, record its PID and session ID, stop only that PID, run the Scheduled Task recovery trigger, and assert the same job/session resumes from disk.

- [ ] **Step 6: Commit the installer**

```bash
git add plugins/pm/skills/pm-windows-handoff/scripts/windows/install-worker.ps1 plugins/pm/skills/pm-windows-handoff/tests/windows/worker.tests.ps1
git commit -m "feat: install reboot-safe Windows worker"
```

---

### Task 8: Write and pressure-test the skill

**Files:**
- Create: `plugins/pm/skills/pm-windows-handoff/SKILL.md`
- Create: `plugins/pm/skills/pm-windows-handoff/references/protocol.md`
- Create: `plugins/pm/skills/pm-windows-handoff/agents/openai.yaml`
- Modify: `docs/superpowers/plans/windows-handoff-baseline.md`

**Interfaces:**
- Consumes: Proven controller commands and baseline failures.
- Produces: Discoverable `$pm-windows-handoff` behavior and concise UI metadata.

- [ ] **Step 1: Initialize the skill package**

Use the system initializer with `scripts,references`, preserving the already-created implementation directories:

```bash
python3 /Users/patrick/.codex/skills/.system/skill-creator/scripts/init_skill.py pm-windows-handoff --path plugins/pm/skills --resources scripts,references --interface display_name='PM Windows Handoff' --interface short_description='Hand Git tasks safely from Mac to Windows' --interface default_prompt='Use $pm-windows-handoff to run this suitable Git task on my Windows worker while the Mac retains ownership.'
```

If the initializer refuses an existing directory, create only `SKILL.md` and `agents/openai.yaml` with `apply_patch`; do not overwrite tested scripts.

- [ ] **Step 2: Write the minimal skill against observed baseline failures**

The frontmatter description must be trigger-only:

```yaml
---
name: pm-windows-handoff
description: Use when a Git coding task should continue on Patrick's native Windows worker while the Mac remains authoritative, especially when remote dependencies, questions, disconnect recovery, or machine-restart recovery must be checked.
---
```

The body must define suitability, preflight-before-lease, exact snapshot rules, Mac/Windows ownership, question relay, soft recovery, hard reclaim, independent Mac verification, and links to `references/protocol.md` plus `scripts/pm_windows_handoff.py --help`. Keep conditional mechanics in the reference rather than inflating `SKILL.md`.

- [ ] **Step 3: Run the three original pressure scenarios with the skill**

Give fresh subagents the exact Task 1 scenarios plus:

```text
Use $pm-windows-handoff at plugins/pm/skills/pm-windows-handoff to complete this request.
```

Success requires all of:

```text
no ownership before preflight
no copying node_modules
no mutation of the Mac index
no work in an existing Windows checkout
no split brain after reclaim
no automatic stale-result integration
```

- [ ] **Step 4: Add application scenarios and close observed gaps**

Test one clean npm job, one unavailable-Docker job, one `needs_input` turn, and one restart. Record outcomes beside the baseline report. Change the skill only for observed misunderstandings, then rerun the failed scenario.

- [ ] **Step 5: Validate skill metadata and commit**

```bash
python3 /Users/patrick/.codex/skills/.system/skill-creator/scripts/quick_validate.py plugins/pm/skills/pm-windows-handoff
wc -w plugins/pm/skills/pm-windows-handoff/SKILL.md
git add plugins/pm/skills/pm-windows-handoff docs/superpowers/plans/windows-handoff-baseline.md
git commit -m "feat: add Mac-owned Windows handoff skill"
```

Expected: validation passes; pressure scenarios converge on the approved ownership and recovery model.

---

### Task 9: Run live end-to-end handoff tests

**Files:**
- Modify only if failures reveal defects: files under `plugins/pm/skills/pm-windows-handoff/`
- Create runtime fixtures outside repository: a `mktemp -d` directory on Mac and `C:\ProgramData\CodexWorker\fixtures\<run-id>` on Windows.

**Interfaces:**
- Consumes: Complete canonical skill package and deployed Windows worker.
- Produces: Test receipts in the Mac job directories; no fixture artifacts in the repository.

- [ ] **Step 1: Run doctor and confirm current machine facts**

Verify SSH key authentication, Tailscale address, Windows hostname and user, Git, Node, npm, native Codex path, Codex login, Scheduled Task status, disk space, Docker Engine, and Compose. Expected current Docker classification is `MAC_ONLY` unless the probes demonstrate otherwise.

- [ ] **Step 2: Run Git transport fixtures**

Execute clean and dirty fixture jobs. The dirty fixture contains staged, unstaged, and untracked non-ignored files. Confirm the Windows tree equals the snapshot, the Mac index hash is unchanged, and the returned bundle imports under a managed result ref.

- [ ] **Step 3: Run the npm fixture twice**

Use a lockfile-based package with one failing test that the Windows Codex task fixes. First run must execute `npm ci`; second run must demonstrate cache reuse while still using a fresh worktree and running `npm ci`.

- [ ] **Step 4: Run question-and-answer continuation**

Give the worker a fixture with one intentional product choice. Confirm it emits `needs_input`, records a checkpoint and session ID, receives a Mac answer, resumes the same session, and completes.

- [ ] **Step 5: Test SSH and process interruption**

Disconnect the SSH client during a running fixture and confirm Windows continues. Then stop only the recorded worker PID during another fixture and confirm Scheduled Task recovery resumes it.

- [ ] **Step 6: Test hard reclaim and stale-result rejection**

Use an injected clock or test-only availability fixture to cross the ten-minute threshold without waiting ten wall-clock minutes. Reclaim generation 2 on Mac, then present a generation-1 Windows result and confirm `collect` exits `4` without applying it.

- [ ] **Step 7: Test Docker gating**

Dispatch a Docker-required fixture. If Docker probes fail, assert `MAC_ONLY` and confirm no lease transfer. If Docker probes pass, run a minimal Compose service and verify it inside the Windows worktree.

- [ ] **Step 8: Review all live-test diffs and rerun the full automated suite**

```bash
python3 -m unittest discover -s plugins/pm/skills/pm-windows-handoff/tests -p 'test_*.py' -v
git diff --check
```

Fix each demonstrated defect test-first and rerun the relevant live scenario.

---

### Task 10: Prove real Windows reboot recovery

**Files:**
- No repository files unless the live test exposes a defect.

**Interfaces:**
- Consumes: A deployed Scheduled Task and checkpointed fixture job.
- Produces: Evidence that the same job resumes after a real reboot.

- [ ] **Step 1: Prepare a checkpointed disposable job**

The fixture must be safe to repeat, contain no user project data, and persist its session ID, checkpoint commit, generation, heartbeat, and expected verification command before reboot.

- [ ] **Step 2: Present the exact reboot target and request approval**

Show hostname `pm`, Tailscale IP `100.69.121.66`, fixture job ID, persisted checkpoint, and expected recovery behavior. Do not issue a restart command until the user explicitly approves this reboot.

- [ ] **Step 3: Reboot Windows and monitor recovery from Mac**

After approval, initiate one reboot. Confirm SSH becomes unavailable, the Mac retains generation 1 during the recovery window, SSH returns, the Scheduled Task runs as Patrick, heartbeat resumes, and the recorded Codex session or checkpoint continues.

- [ ] **Step 4: Collect and independently verify the result**

Import the result bundle, confirm generation 1, inspect its diff, and rerun the fixture verification on Mac. Record actual downtime, recovery path, and result status in the job receipt.

- [ ] **Step 5: Add a regression test for any discovered failure**

If the reboot exposes a defect, first add an automated test reproducing the failed transition, verify RED, implement the minimal fix, verify GREEN, redeploy, and repeat the reboot test only with fresh approval.

---

### Task 11: Mirror, validate, release, and final review

**Files:**
- Create: `skills/pm-windows-handoff/` as an exact mirror.
- Modify: `plugins/pm/.claude-plugin/plugin.json`
- Modify: `CHANGELOG.md`

**Interfaces:**
- Consumes: Fully tested canonical package.
- Produces: Discoverable pm plugin version `2.8.0` and legacy skill copy.

- [ ] **Step 1: Mirror the complete package**

Copy the complete canonical directory, including tests, into `skills/pm-windows-handoff/`. Compare canonical and mirror content with `diff -ru plugins/pm/skills/pm-windows-handoff skills/pm-windows-handoff`; it must produce no output.

- [ ] **Step 2: Bump the pm plugin and add the consumer changelog**

Change `plugins/pm/.claude-plugin/plugin.json` from `2.7.0` to `2.8.0`. Add a `2026-08-23` changelog entry describing Mac-owned Git snapshots, Windows dependency preflight, persistent Codex jobs, question relay, and reboot-safe recovery.

- [ ] **Step 3: Run final validation**

```bash
python3 /Users/patrick/.codex/skills/.system/skill-creator/scripts/quick_validate.py plugins/pm/skills/pm-windows-handoff
python3 /Users/patrick/.codex/skills/.system/skill-creator/scripts/quick_validate.py skills/pm-windows-handoff
python3 -m unittest discover -s plugins/pm/skills/pm-windows-handoff/tests -p 'test_*.py' -v
git diff --check
git status --short
```

Also rerun the remote PowerShell harness and `doctor`.

- [ ] **Step 4: Perform final security and ownership review**

Verify that no secret values appear in Git or job logs, every remote path derives from validated identifiers, no shell-string execution exists, Windows cannot integrate or push, and stale generations are rejected on both machines.

- [ ] **Step 5: Commit the release**

```bash
git add plugins/pm/.claude-plugin/plugin.json CHANGELOG.md skills/pm-windows-handoff plugins/pm/skills/pm-windows-handoff
git commit -m "Add pm-windows-handoff plugin to marketplace"
```

Push only as part of the repository's marketplace release workflow and only after confirming the final commit contains no runtime job state, credentials, fixture data, or unrelated user changes.

- [ ] **Step 6: Report how to use it**

Lead with:

```text
Use $pm-windows-handoff to continue this Git task on Windows while the Mac remains authoritative.
```

Report current Windows capabilities, deployment/restart status, live tests run, reboot evidence, limitations such as Docker remaining `MAC_ONLY`, and the exact command for `doctor` when manual diagnosis is useful.
