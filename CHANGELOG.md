# Changelog

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
