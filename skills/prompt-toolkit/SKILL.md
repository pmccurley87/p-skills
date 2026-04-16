---
name: prompt-toolkit
description: "Analyzes and rewrites prompts for better AI output, creates reusable prompt templates, and structures end-to-end AI content workflows. Use when the user wants to improve prompts, build prompt templates, run A/B tests on prompts, or optimize AI content workflows."
---

# Prompt Engineer Toolkit

## Overview

Move prompts from ad-hoc drafts to production assets with repeatable testing, versioning, and regression safety. Emphasizes measurable quality over intuition.

## When to Use

- Launching a new LLM feature that needs reliable outputs
- Prompt quality degrades after model or instruction changes
- Multiple team members edit prompts and need history/diffs
- Evidence-based prompt selection for production rollout
- Consistent prompt governance across environments

## When NOT to Use

- Writing a prompt from scratch (use pm-prompt-master)
- Designing prompts with evaluation rubrics and iteration (use pm-prompt-engineer)
- One-off prompt improvements that don't need A/B testing or versioning

## Core Capabilities

- A/B prompt evaluation against structured test cases
- Quantitative scoring for adherence, relevance, and safety checks
- Prompt version tracking with immutable history and changelog
- Prompt diffs to review behavior-impacting edits
- Reusable prompt templates and selection guidance
- Regression-friendly workflows for model/prompt updates

## Key Workflows

### 1. Run Prompt A/B Test

Prepare JSON test cases with input/expected pairs, then evaluate both prompts against them. Score each output on:

### 2. Choose Winner With Evidence

Score outputs per case and aggregate:

- expected content coverage
- forbidden content violations
- regex/format compliance
- output length sanity

Use the higher-scoring prompt as candidate baseline, then run regression suite.

### 3. Version Prompts

Track each prompt with a semantic identifier (e.g., `support_classifier`), version number, author, and change note. Store versions immutably so diffs between any two versions are always available.

### 4. Regression Loop

1. Store baseline version.
2. Propose prompt edits.
3. Re-run A/B test.
4. Promote only if score and safety constraints improve.

## Prompt Templates

### 1) Structured Extractor

```text
You are an extraction assistant.
Return ONLY valid JSON matching this schema:
{{schema}}

Input:
{{input}}
```

### 2) Classifier

```text
Classify input into one of: {{labels}}.
Return only the label.

Input: {{input}}
```

### 3) Summarizer

```text
Summarize the input in {{max_words}} words max.
Focus on: {{focus_area}}.
Input:
{{input}}
```

### 4) Rewrite With Constraints

```text
Rewrite for {{audience}}.
Constraints:
- Tone: {{tone}}
- Max length: {{max_len}}
- Must include: {{must_include}}
- Must avoid: {{must_avoid}}

Input:
{{input}}
```

### 5) QA Pair Generator

```text
Generate {{count}} Q/A pairs from input.
Output JSON array: [{"question":"...","answer":"..."}]

Input:
{{input}}
```

### 6) Issue Triage

```text
Classify issue severity: P1/P2/P3/P4.
Return JSON: {"severity":"...","reason":"...","owner":"..."}
Input:
{{input}}
```

### 7) Code Review Summary

```text
Review this diff and return:
1. Risks
2. Regressions
3. Missing tests
4. Suggested fixes

Diff:
{{input}}
```

### 8) Persona Rewrite

```text
Respond as {{persona}}.
Goal: {{goal}}
Format: {{format}}
Input: {{input}}
```

### 9) Policy Compliance Check

```text
Check input against policy.
Return JSON: {"pass":bool,"violations":[...],"recommendations":[...]}
Policy:
{{policy}}
Input:
{{input}}
```

### 10) Prompt Critique

```text
Critique this prompt for clarity, ambiguity, constraints, and failure modes.
Return concise recommendations and an improved version.
Prompt:
{{input}}
```

## Technique Guide

### Selection Rules

- Zero-shot: deterministic, simple tasks
- Few-shot: formatting ambiguity or label edge cases
- Chain-of-thought: multi-step reasoning tasks
- Structured output: downstream parsing/integration required
- Self-critique/meta prompting: prompt improvement loops

### Prompt Construction Checklist

- Clear role and goal
- Explicit output format
- Constraints and exclusions
- Edge-case handling instruction
- Minimal token usage for repetitive tasks

### Failure Pattern Checklist

- Too broad objective
- Missing output schema
- Contradictory constraints
- No negative examples for unsafe behavior
- Hidden assumptions not stated in prompt

## Evaluation Rubric

Score each case on 0-100 via weighted criteria:

- Expected content coverage: +weight
- Forbidden content violations: -weight
- Regex/format compliance: +weight
- Output length sanity: +/-weight

Recommended acceptance gates:

- Average score >= 85
- No case below 70
- Zero critical forbidden-content hits

## Pitfalls to Avoid

1. Picking prompts from single-case outputs -- use a realistic, edge-case-rich test suite.
2. Changing prompt and model simultaneously -- always isolate variables.
3. Missing `must_not_contain` (forbidden-content) checks in evaluation criteria.
4. Editing prompts without version metadata, author, or change rationale.
5. Skipping semantic diffs before deploying a new prompt version.
6. Optimizing one benchmark while harming edge cases -- track the full suite.
7. Model swap without rerunning the baseline A/B suite.

## Pre-Promotion Checklist

- [ ] Task intent is explicit and unambiguous.
- [ ] Output schema/format is explicit.
- [ ] Safety and exclusion constraints are explicit.
- [ ] No contradictory instructions.
- [ ] No unnecessary verbosity tokens.
- [ ] A/B score improves and violation count stays at zero.

## Versioning Policy

- Use semantic prompt identifiers per feature (`support_classifier`, `ad_copy_shortform`).
- Record author + change note for every revision.
- Never overwrite historical versions.
- Diff before promoting a new prompt to production.

## Rollout Strategy

1. Create baseline prompt version.
2. Propose candidate prompt.
3. Run A/B suite against same cases.
4. Promote only if winner improves average and keeps violation count at zero.
5. Track post-release feedback and feed new failure cases back into test suite.
