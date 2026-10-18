---
name: pm-adversary
description: Review plans, prompts, code or other artifacts with independent Astra and Claude Opus 5.5 critics, then adjudicate findings against evidence. Use when the user asks for adversarial cross-model review, Astra plus Opus, or pm-adversary; combine with pm-gauntlet-loop for iterative improvement.
---

# Adversary

Use **Astra (`gpt-6-astra`) and Claude Opus 5.5 (`claude-opus-5-5`)** to challenge the same artifact independently. The purpose is to find substantive weaknesses and preserve useful intelligence, not to maximize criticism, agreement, rules or complexity.

This skill alone reviews and recommends. It does not authorize editing, paid product experiments, deployment or publication. When the user has already authorized improvements or combined it with a running gauntlet, repair and recheck within that scope. Do not ask again for actions already authorized.

## Prepare one evidence packet

Identify the artifact version, user goal, actual baseline, constraints and what improvement means. Give both critics enough raw material to verify claims: relevant source/contracts, complete outputs and existing test results. For prompt changes, include assembled messages, tool/schema descriptions, model/settings and state boundaries. Mark missing material and separate existing defects from candidate regressions.

Give each critic fresh context without the author's justification, the other critic's findings or an expected verdict. If a reviewer helped build the candidate, use a fresh reviewer instance and disclose that model's earlier role. Blind and randomize A/B labels when meaningful; do not claim blindness for labelled source diffs or targeted rechecks. Freeze evaluation criteria and retain new cases that test generality without hard-coding them into the solution.

## Run both critics

Use a native Astra worker when available, selecting `gpt-6-astra` with a fresh context. Run Opus through a verified native route or Claude Code CLI with the exact `claude-opus-5-5` model. Read [runner guidance](references/runners.md) when using CLI or checking availability. Independent reviews may run in parallel; reviews that depend on an earlier repair must wait for it.

Do not silently substitute Sol, an `opus` alias or another model if either requested model is unavailable. Report which reviewer ran and what is missing. Do not label a one-model or unverified run a completed Astra/Opus review.

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

State the models actually used, artifact/reference versions, verdicts, changes prompted by the review, rejected advice worth explaining, checks performed and remaining limits. Link the local review evidence. Report timing or cost only when measured; Claude CLI list-price estimates are not necessarily the user's billed cost. Never claim the combination guarantees the “best” result.
