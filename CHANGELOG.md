# Changelog

## [2026-08-27]

### pm v2.8.0
- Updated `pm-cursor-agents` to keep Sol as the architectural and acceptance host while delegating straightforward discovery, implementation, tests, and repair more aggressively; worker models are now selected from current Cursor model families at runtime instead of pinned versions, with risk-proportional host review.

## [2026-08-04]

### pm v2.7.0
- Added `pm-browser-ego`: uses ego-browser for website automation and proactively operates LastPass through Computer Use when authentication is required, while preserving credential secrecy and task-space ownership.

## [2026-07-29]

### pm v2.6.0
- Updated `pm-cursor-agents` completion reports to require an **Agents used** table listing every dispatched worker, model, selection rationale, runner-measured duration, and outcome; the runner now emits a stable stderr receipt with monotonic wall-clock timing without corrupting structured stdout.

### pm v2.5.0
- Updated `pm-cursor-agents` with Sol High Fast orchestration and explicit worker routing: Composer 2.5 Fast for mechanical packets, Grok 4.5 High Fast for bounded logic-heavy implementation, and host takeback for architectural or high-risk work.
- Added adversarial boundary-case guidance and closed-loop repair rules so worker completion remains evidence while the Sol host owns final acceptance.

## [2026-07-28]

### pm v2.4.0
- Added `pm-cursor-agents`: lets a frontier reasoning model plan and review while Cursor Composer 2.5 workers implement small, isolated changes from validated work packets, with shared-checkout file ownership, bounded retries, and final host-agent verification.

### pm v2.3.0
- Added `pm-files-architecture`: traces the files that actually run a feature, identifies runtime policy and ownership boundaries, and produces an evidence-backed file-level plan before implementation.

## [2026-05-24]

### pm v2.2.0
- Added `pm-ensure-closed-loop` skill: before working a task iteratively, it establishes and presence-checks the prerequisites an agent needs to run and observe the task itself — execution environment, browser tooling, auth access, and logging (prefers victorialogs) — anchors observable success criteria via `/goal`, then drives a run→observe→investigate→iterate loop until the goal is met. Includes a readiness gate that stops before iterating blind, and adapts the channel set to each task rather than applying a fixed checklist. Use when you're tempted to start editing before confirming you can see what the code does.

## [2026-05-11]

### pm v2.1.0
- Added `pm-walkthrough` skill: walks a reviewer through a list of items (bugs, features, plan steps) one at a time, generating a rich HTML page per item with diagrams, comparison tables, and before/after side-by-sides so the reviewer builds deep understanding before approving or rejecting. Iterative — each item gets its own verdict. Use when there's a backlog of items needing sign-off.

## [2026-04-16]

### pm v2.0.0 (BREAKING)
- Consolidated all 12 individual plugins into a single `pm` plugin with 12 skills
- Skills are now referenced as `pm:pm-<skill-name>` instead of `pm-<skill-name>:pm-<skill-name>` (e.g., `pm:pm-tdd` instead of `pm-tdd:pm-tdd`)
- Updated `pm-update-claude-marketplace` skill documentation to reflect the new single-plugin structure
- Consumers: remove old `pm-*@p-skills` entries from settings and add `"pm@p-skills": true`

## [2026-04-11]

### pm-confirm-issue v1.1.0
- Added facts-only rule: every claim must cite code, output, or test evidence — no assumptions allowed
- Added fact vs. assumption comparison table with concrete examples
- Verdict template now includes an "Unverified" section for things that couldn't be confirmed
- "What NOT to do" expanded: no hedging language without evidence, no inferring behavior from names alone

## [2026-04-10]

### pm-cold-review v1.0.0
- New plugin: context-free code review using an isolated subagent — reviewer sees only the raw diff and codebase, no conversation history, for unbiased feedback with severity-categorized issues and a ship/fix/rethink verdict

## [2026-04-07]

### pm-confirm-issue v1.0.0
- New plugin: investigate and confirm bug reports or unexpected behavior without modifying any code — read-only investigation with structured verdicts

## [2026-04-06]

### pm-claude-md v1.0.0
- New plugin: audit, update, and maintain CLAUDE.md files with quality scoring, session learning capture, staleness detection, conflict resolution, and smart placement across root/local/global/package files

## [2026-04-05]

### pm-update-claude-marketplace v1.0.0
- New plugin: automates marketplace releases with version bumps, changelog entries, and file sync

### pm-planning v1.1.0
- Added "Check Latest Docs First" rule: requires fetching current framework/library documentation before writing code, prevents using deprecated APIs from training data
