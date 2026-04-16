---
name: cold-review
description: |
  Context-free code review using an isolated subagent. Use when the user wants
  an honest, unbiased review of their current diff or a pull request. The reviewer
  subagent receives no conversation history — only the raw diff and codebase access —
  so feedback is based purely on what the code shows, not what the author intended.
allowed-tools:
  - Bash
  - Read
  - Glob
  - Grep
  - Agent
  - AskUserQuestion
---

# Cold Review

Deliver honest, context-free code reviews by delegating to an isolated subagent that has no access to the current conversation.

## Why This Exists

When the same agent that wrote the code also reviews it, the review is biased — it already knows the intent, the constraints discussed, and the tradeoffs considered. A cold review strips all of that away. The subagent sees only the diff and the codebase, exactly like a reviewer picking up a PR from a teammate they haven't spoken to.

## When to Use

- After completing a feature or fix, before committing or opening a PR
- When reviewing an existing PR by number
- When the user wants a second opinion on their changes
- When the user says "review", "cold review", or "honest feedback"

## When NOT to Use

- For reviewing code the user hasn't changed (use direct code reading instead)
- For reviewing architecture or design decisions (this reviews diffs, not plans)
- When the user wants a review that accounts for specific context they've shared (that defeats the purpose)

## Process

### Step 1: Gather the diff

Determine what to review based on user input:

**Current working changes (default):**
Run `git diff HEAD` to capture all uncommitted changes (staged and unstaged) against the last commit.

**A specific PR:**
Run `gh pr diff <number>` to get the PR's diff.

**Commits on the current branch vs main:**
Run `git diff main...HEAD` to get all changes on the branch.

If the diff is empty, ask the user what they want reviewed.

### Step 2: Gather context for the subagent

Collect minimal supporting context the reviewer needs:

1. **The diff** — captured in Step 1
2. **The base branch** — so the reviewer knows what the code looked like before
3. **File list** — which files were touched
4. **Project language/framework** — infer from file extensions and project structure (check for package.json, Cargo.toml, go.mod, requirements.txt, etc.)

Do NOT pass any conversation history, user explanations, or task descriptions to the subagent. The entire point is that the reviewer works without this.

### Step 3: Launch the cold review subagent

Spawn a subagent with the Agent tool. The prompt must contain:

1. The raw diff
2. A list of changed files
3. The project language/framework
4. The review instructions (from the template below)

Nothing else. No "the user was trying to..." or "this is part of a larger effort to...".

**Subagent prompt template:**

Build the prompt by concatenating these sections. Replace `{language}`, `{file_list}`, and `{diff}` with the actual values.

> You are a code reviewer. You have been given a diff to review. You know nothing about why these changes were made — judge them purely on what you see.
>
> Project context:
> - Language/framework: {language}
> - Changed files: {file_list}
>
> The diff is below, delimited by DIFF_START and DIFF_END:
>
> DIFF_START
> {diff}
> DIFF_END
>
> Review this diff and provide feedback in the following structure:
>
> Summary: One paragraph describing what this diff appears to do, based solely on reading the code.
>
> Issues: List problems found, categorized by severity:
> - Critical — Bugs, security vulnerabilities, data loss risks, broken functionality
> - Major — Logic errors, missing edge cases, poor error handling, performance problems
> - Minor — Style inconsistencies, naming issues, missing types, unclear code
>
> For each issue, include the file and line reference, what the problem is, and why it matters. If no issues exist at a severity level, omit it.
>
> Strengths: Note 1-3 things the diff does well. Be specific.
>
> Verdict — one of:
> - Ship it — No critical or major issues. Minor issues are optional.
> - Fix and ship — Major issues to address, but the approach is sound.
> - Rethink — Fundamental problems that need discussion.
>
> You may read files from the codebase to understand surrounding code, but do NOT modify anything.

### Step 4: Relay the results

Present the subagent's review to the user exactly as returned. Do not editorialize, soften, or add commentary. The value is in the unfiltered feedback.

If the user asks follow-up questions about the review, answer from your own knowledge — do not re-invoke the subagent for clarifications.
