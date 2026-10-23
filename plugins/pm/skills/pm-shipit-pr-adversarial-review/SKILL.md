---
name: pm-shipit-pr-adversarial-review
description: Ship a change end to end with an adversarial cross-model review as the review gate instead of CodeRabbit. Runs pm-adversary on the diff, fixes what it finds, opens the PR with CodeRabbit told to skip, merges as soon as CI is green, then verifies the deployment. Use when Patrick asks to ship with an adversarial review, "ship it adversarially", "auto-loop-adversary", or wants the auto-loop without waiting on CodeRabbit.
---

# Ship with an adversarial review gate

Run the full ship loop: review, fix, merge the target branch, open the PR, merge, verify the deploy. The review gate is **`pm-adversary`**, one OpenAI critic and one Claude critic on the same diff. CodeRabbit is not waited on.

A request to run this skill authorizes the whole loop for the change in front of you. That includes fixes within the change's intended behavior, the PR, the merge, and bounded recovery of a failed deployment. Do not ask again for any of those. Stop only for a genuine decision outside that scope.

## Use the repository's own ship loop when it has one

Many repositories keep a ship skill that knows their deploy workflows, readiness checks and announcement rules. Look for one under `.agents/skills/` or `.claude/skills/` whose name contains `shipit`. For example, a repo may have an `…-shipit-pr-auto-loop` skill.

- **If one exists, follow it.** Use its target-branch rules, deployment-readiness checks, merge-target phase, pinned merge, deployment watch, recovery loop and announcement.
- **Replace only its review phases.** Wherever it says to cold-review, wait for CodeRabbit, analyse CodeRabbit, or fix CodeRabbit findings, use the adversarial gate below instead.
- **If none exists,** use the generic steps in this skill.

## Steps

1. **Resolve one target branch.** Use the branch the user named, otherwise the repo's default branch. Stop if two targets are named.
2. **Check the baseline.** Build, and run the tests that cover the changed code. Do not ship from a red baseline. If unrelated tests fail, prove they also fail on the target branch before calling them pre-existing.
3. **Run the adversarial gate** on the diff against the target branch (see below).
4. **Merge the latest target branch** into the feature branch. Rebuild and rerun the covering tests.
   - If the merge needed conflict resolution, or changed any file the PR also changes, run a targeted adversary recheck on that delta.
   - Otherwise no re-review is needed, because the target branch's own commits were reviewed in their own PRs.
5. **Open the PR.** Put a short summary of the adversary result in the body: models used, verdicts, and what was fixed. Add the line `@coderabbitai ignore` to the description so CodeRabbit skips the review and does not use up its rate limit.
6. **Merge as soon as CI is green.**
   - Wait for every PR check except CodeRabbit to succeed on the exact head SHA. If the PR has no checks, merge straight away.
   - Fetch the target branch first. If it has moved past the PR's base, return to step 4. Allow at most three such rounds, then stop and report.
   - Merge pinned to the reviewed head, for example `gh pr merge <n> --squash --match-head-commit <sha>`. Confirm the PR shows as merged.
   - If branch protection requires a CodeRabbit check or an approving review, do not bypass it with admin rights. Report what is blocking and stop.
7. **Verify the deployment** for the merge commit. Use the repository ship skill's deploy watch when there is one. Otherwise, find the Actions runs for the merge SHA, watch every deploy workflow it triggered to a conclusion, and check the jobs, not just the badge. If no deployment applies, say so.
8. **Report** in plain language: what changed, the adversary verdicts, the PR link, the merge, and the deploy result.

## The adversarial gate

Invoke **`pm-adversary`** with the diff as the artifact. Give it:

- The full diff against the target branch.
- The intent: what the change should do, and for whom.
- The covering test results.
- The files a reviewer needs to judge the change, such as callers, configuration and contracts.

The ship request authorizes `pm-adversary` to repair its findings within the change's scope. Follow its own rules for accounts, model selection and adjudication.

The gate **passes** when all three hold:

- **Both critics ran.** There is one OpenAI review and one Claude review, with their models verified. A single-model review does not pass. If either critic cannot run because of allowance or access, stop and report. Ship anyway only on Patrick's explicit override.
- **No supported material findings remain.** Every critical or major finding the lead accepted after checking it against the source is fixed. Findings the lead rejected need a recorded reason.
- **Checks are green after the fixes.** The build passes and the covering tests pass on the final diff.

Minor findings: fix them when the fix is local and clearly better, otherwise list them in the PR body.

Allow **at most three review rounds**. Each fix round ends with a recheck by both critics on the same revised diff, labelled as a recheck. If material findings remain after round three, stop, report them, and do not open the PR.

## Rules

- Never merge code the critics did not see. A pushed fix after review needs a recheck before merge, except a merge of the target branch that meets the no-re-review condition in step 4.
- Never disable checks, skip hooks, or force-push to get a green merge.
- Keep secrets out of the PR body, the review packets and the report.
- CodeRabbit may still comment after the merge if `@coderabbitai ignore` is not honoured. Treat any later CodeRabbit findings as input for a follow-up, not as a reason to revert a verified deployment.
