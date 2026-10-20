---
name: pm-adversary
description: Review plans, prompts, code or other artifacts with independent OpenAI and Claude critics selected from verified remaining allowances. Use for adversarial cross-model review or pm-adversary; combine with pm-gauntlet-loop for iterative improvement.
---

# Adversary

Use one OpenAI critic and one Claude critic to challenge the same artifact independently. Select their models from verified remaining allowances below. The purpose is to find substantive weaknesses and preserve useful intelligence, not to maximize criticism, agreement, rules or complexity.

This skill alone reviews and recommends. It does not authorize editing, paid product experiments, deployment or publication. When the user has already authorized improvements or combined it with a running gauntlet, repair and recheck within that scope. Do not ask again for actions already authorized.

## Prepare one evidence packet

Identify the artifact version, user goal, actual baseline, constraints and what improvement means. Give both critics enough raw material to verify claims: relevant source/contracts, complete outputs and existing test results. For prompt changes, include assembled messages, tool/schema descriptions, model/settings and state boundaries. Mark missing material and separate existing defects from candidate regressions.

Give each critic fresh context without the author's justification, the other critic's findings or an expected verdict. If a reviewer helped build the candidate, use a fresh reviewer instance and disclose that model's earlier role. Blind and randomize A/B labels when meaningful; do not claim blindness for labelled source diffs or targeted rechecks. Freeze evaluation criteria and retain new cases that test generality without hard-coding them into the solution.

## Verify accounts and select reviewers

Before dispatch, read live usage for the accounts that will actually run the critics. **Claude must use `patrick@xdelivered.com`**, unless the user explicitly requests another account. Verify the identity in the reviewer's actual route and environment; a Desktop login does not establish a CLI login. Use the current Codex account for the OpenAI critic and its matching weekly limit. Read [runner guidance](references/runners.md) for account checks, usage sources and CLI execution.

Compare **remaining**, not used, percentages (`remaining = 100 - used`). Session limits, context usage, credit balances and local token/cost estimates are not weekly allowances.

| Critic | Verified allowance remaining | Select |
| --- | --- | --- |
| Claude, `patrick@xdelivered.com` | Fable weekly **> 40%** | Fable, verified as the actual returned model |
| Claude, `patrick@xdelivered.com` | Fable weekly **<= 40%** | Opus 5.5 (`claude-opus-5-5`) |
| OpenAI, current Codex account | Weekly **>= 50%** | Astra (`gpt-6-astra`) |
| OpenAI, current Codex account | Weekly **< 50%** | GPT-6.1 Sol (`gpt-6.1-sol`) |

At exactly 40% Fable remaining, choose Opus; at exactly 50% Codex weekly remaining, choose Astra. Announce the accounts, selected models, remaining percentages, reset times and observation time before launching. Keep that preflight with the review evidence. Refresh before a later repair/recheck round; disclose any model change so it is not mistaken for the same reviewer's recheck.

If identity or the required weekly allowance is missing, stale or from another account, report the missing preflight and obtain the needed access or an explicit user override before launching that critic. Do not guess a percentage or silently use another account. If the selected model is unavailable, report that blocker; quota-based choices in this table are authorized, further substitutions require the user's direction. Respect shared usage caps: switching models does not replenish an exhausted account allowance.

## Run both critics

Use a native OpenAI worker when available, with the selected exact model and fresh context. Run the selected Claude model through a verified native route or Claude Code CLI on the verified account. Independent reviews may run in parallel; reviews that depend on an earlier repair must wait for it. Verify the returned model identity. Do not label a one-model or unverified run a completed cross-model review.

Ask each reviewer to:

- Judge whether the candidate serves the user's goal better than the baseline without material regressions. A pass, tie or no actionable finding is allowed.
- Find consequential errors, conflicting contracts, lost capability, unnecessary machinery and rules fitted to isolated examples. Preserve useful flexibility; do not remove justified validation or domain requirements just because they constrain behavior.
- Ground each finding in a specific artifact/source or observed result. State impact, confidence, the smallest useful correction and a way to verify it. Separate demonstrated failures from plausible risks and missing evidence.

Reviewers are read-only unless explicitly assigned a separate builder task. They must not deploy, alter shared state or expand the assignment to satisfy their critique.

## Adjudicate, then recheck

The lead checks findings against source and evidence. Agreement is not proof and disagreement is not settled by voting. Accept the supported correction; reject a factual error; investigate a consequential uncertainty. Record the decision and reason. Prefer removing contradictions and redundant machinery to accumulating defensive instructions.

When repairs are authorized, apply the smallest coherent change and give both critics the same revised artifact. Targeted verification can include previous findings, but label it as a recheck rather than an independent blind review. Run relevant executable checks; for behavior claims, use real outputs under matched conditions when authorized. Static review cannot establish teaching quality, latency or production safety.

With `pm-gauntlet-loop`, send the adjudicated gaps back to its builder and use the shared candidate, bar and progress record. Do not create nested loops or duplicate reviewers unnecessarily. Finish when supported material findings are resolved and the agreed checks pass; disclose open risks and missing validation. Do not add clauses solely to force another round's approval.

## Report

State the accounts and models actually used, the allowance evidence and selection reason, artifact/reference versions, verdicts, changes prompted by the review, rejected advice worth explaining, checks performed and remaining limits. Link the local review evidence. Report timing or cost only when measured; Claude CLI list-price estimates are not necessarily the user's billed cost. Never claim the combination guarantees the “best” result.
