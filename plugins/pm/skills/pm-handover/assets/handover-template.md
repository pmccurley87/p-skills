# Handover: <task title>

## Objective and completion criteria
<Original goal, required behavior, and concrete checks that define done.>

## Repository and checkpoint
- Repository: {{REMOTE_URL}}
- Source branch: {{SOURCE_BRANCH}}
- Source HEAD: {{SOURCE_HEAD}}
- Handover branch: {{HANDOVER_BRANCH}}
- Code checkpoint: {{CHECKPOINT_SHA}}
- This document: {{DOCUMENT_PATH}}
- Base/upstream: <verified value or unknown>

The handover branch adds this document on top of the code checkpoint. The transfer
receipt supplies the final tip SHA. Work is unfinished; a checkpoint is not a passing build.

## Current state
<Completed work and partial implementations. For each relevant file, explain what
changed and what remains. List unrelated local changes excluded from capture.>

## Decisions and constraints
<Decisions and reasons, rejected approaches, user preferences, scope, authorization
boundaries, issue/PR links. Mark hypotheses and unknowns explicitly.>

## Verification evidence
| Command | State tested | Observed result |
| --- | --- | --- |
| <actual command, or explicitly not run> | <commit or working state> | <result and relevant failure> |

## Setup on the receiving machine
<Runtime/package manager versions, lockfile install commands, services, fixtures,
ports, platform assumptions, and applicable repository instructions.>

<Environment variable names and how to obtain required values through the existing
approved setup. Never include the values. List ignored/local-only resources,
accessible artifact sources, and any prerequisite blocking continuation.>

<If applicable: submodule initialization, Git LFS object download, dependencies
requiring a particular OS. Do not assume running processes or local databases transfer.>

## Continue here
1. <First actionable command/file and the reason to start there.>
2. <Next implementation step.>
3. <Required final verification.>

<Open questions and the evidence needed to answer them.>

## Git access and ownership
Use the receiving machine's existing Git credentials first. Follow the clone/fetch
commands in the transfer prompt, compare the fetched SHA with the receipt, and
create a new continuation branch in a fresh clone or worktree. Preserve any existing
dirty checkout. On an access failure, distinguish authentication, repository
permission, and network problems before changing setup.

The receiving agent continues the task when the user starts it there. Further
source-side edits can diverge and need deliberate integration. This handover does
not authorize merging, deployment, or overwriting the published checkpoint.
