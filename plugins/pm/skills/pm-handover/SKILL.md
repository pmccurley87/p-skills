---
name: pm-handover
description: Use when an unfinished Git task needs to continue with another agent, session, or machine, including requests to hand over current branch work or resume elsewhere.
---

# PM Handover

Publish a separate checkpoint branch containing current task work and enough written
context for another agent to continue without the original chat. Requires Git and
Python 3.9+. The receiver needs no copy of this skill.

## Prepare

1. Recover the user's objective, decisions, remaining work, and acceptance criteria
   from the conversation, repository instructions, notes, commits, and diffs. State
   unknowns; don't invent missing context. Capture actual test evidence, including
   failures and checks not run. Do not finish or fix the task just to hand it over.
2. Inspect HEAD, branch/upstream, `git status`, staged/unstaged diffs, and untracked
   paths. Select task files explicitly. Include both paths of a rename and relevant
   new tests. A selected file transfers its final working-tree content; staging
   boundaries remain intact only at the source. Resolve ambiguous mixed-task files
   before capture. Pause source edits while capturing.
3. Use the established writable remote. Invocation to hand over authorizes the
   checkpoint commit and push there; a request merely to discuss a handover does
   not. Ask only when destination or file scope is unresolved. Inspect outgoing
   commits and selected content for credentials; the helper's narrow checks are
   not a comprehensive secret scan. Exclude secrets and unrelated work.
4. For submodules, ensure recorded commits are available to the receiver; publish
   dirty submodule work separately within authorized scope first. For Git LFS,
   verify objects are present locally and available remotely through its normal
   pre-push hook; record `git lfs pull` setup. Explain missing external artifacts or
   OS dependencies as blockers. Never copy ignored `.env`, databases, or credentials.

## Capture and publish

Write a JSON array of repository-relative **file** paths in temporary storage (use
`[]` for an already committed task). Complete the
[handover template](assets/handover-template.md) there: replace every angle-bracket
instruction with facts or an explicit unknown; retain the `{{UPPERCASE}}` tokens for
the helper. Review both inputs before publication.

Run the bundled helper, resolving its path relative to this skill directory:

```sh
python3 <skill-dir>/scripts/create_handover.py create --repo <repo> --remote origin --slug <task-slug> --manifest <files.json> --document <handover.md> --push
```

Use actual paths and the resolved remote, with shell-appropriate quoting. The helper
creates two commits in an isolated worktree, preserves the source checkout/index,
respects signing/hooks, allocates `codex/handover/...`, and publishes with a
create-only ref guard. Conflicts, active Git operations, sparse checkouts, dirty
submodules, changing source files, and failing/modifying hooks stop capture.
Do not bypass hooks, stash, reset, pull, or rewrite source history to force success.

## Deliver

- Require receipt `status: published` and its verified final SHA before saying ready
  on another machine. Return the branch/document links (or remote/ref/path), exact
  SHA, and the receipt's copyable receiving prompt. Mention any setup blockers.
- `local_only` after push failure means the checkpoint exists locally. Inspect the
  cause, run `retry_argv` as an argument array (or correctly quoted command), and
  verify publication before claiming readiness. Retry reconciles an ambiguous push
  and refuses an existing different tip. Do not create duplicate checkpoints blindly.
- Assume the receiver already has credentials. Try existing access first; provide
  authentication setup only when needed. Never put credentials in the document or
  prompt. Use a fresh clone/worktree and compare the fetched SHA before continuation.
- Keep further work on a continuation branch. No automatic agent launch, monitoring,
  merge-back, deployment, or sending messages is part of this skill.
