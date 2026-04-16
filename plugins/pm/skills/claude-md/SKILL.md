---
name: claude-md
description: "Audit, update, and maintain CLAUDE.md files. Use when the user asks to check, audit, update, improve, fix, or revise CLAUDE.md files. Also use when the user mentions 'CLAUDE.md maintenance', 'project memory', 'session learnings', or wants to capture what they learned during a session. Covers quality scoring, session learning capture, staleness detection, conflict resolution, and smart placement across root/local/global/package CLAUDE.md files."
allowed-tools:
  - Read
  - Write
  - Edit
  - Glob
  - Grep
  - Bash
---

# CLAUDE.md Manager

Audit, update, and maintain CLAUDE.md files — keeping Claude Code's project context accurate, concise, and current.

Based on Anthropic's official [claude-md-management](https://github.com/anthropics/claude-plugins-official/tree/main/plugins/claude-md-management) plugin, extended with staleness detection, conflict resolution, and smart placement.

## When to Use

- "Audit my CLAUDE.md" / "Check if my CLAUDE.md is up to date"
- "Update CLAUDE.md with what we learned"
- "Capture this session's learnings"
- "Clean up my CLAUDE.md"
- "My CLAUDE.md feels stale"
- After a session where you discovered missing context

## When NOT to Use

- Just reading CLAUDE.md for reference (use Read directly)
- Editing non-CLAUDE.md documentation

## Modes

This skill has two modes. Ask the user which they want, or infer from context:

| Mode | Trigger | Purpose |
|------|---------|---------|
| **Audit & Improve** | "audit", "check", "improve", "score" | Evaluate quality, fix gaps |
| **Capture Learnings** | "update", "revise", "capture", "learned" | Record session discoveries |

---

## Mode 1: Audit & Improve

Full quality assessment and targeted improvement of CLAUDE.md files.

### Phase 1: Discovery

Find all CLAUDE.md files in the repository:

```bash
find . -name "CLAUDE.md" -o -name ".claude.md" -o -name ".claude.local.md" 2>/dev/null | head -50
```

Also check for global defaults:

```bash
ls -la ~/.claude/CLAUDE.md 2>/dev/null
```

**File Types & Locations:**

| Type | Location | Purpose | Git |
|------|----------|---------|-----|
| Project root | `./CLAUDE.md` | Primary project context, shared with team | Committed |
| Local overrides | `./.claude.local.md` | Personal/local settings | Gitignored |
| Global defaults | `~/.claude/CLAUDE.md` | User-wide defaults across all projects | N/A |
| Package-specific | `./packages/*/CLAUDE.md` | Module-level context in monorepos | Committed |
| Subdirectory | Any nested path | Feature/domain-specific context | Committed |

Claude auto-discovers CLAUDE.md files in parent directories, so monorepo setups work automatically.

### Phase 2: Quality Assessment

For each CLAUDE.md file, evaluate against quality criteria. See [references/quality-criteria.md](references/quality-criteria.md) for detailed rubrics.

**Quick Assessment Checklist:**

| Criterion | Weight | Check |
|-----------|--------|-------|
| Commands/workflows documented | 20 pts | Are build/test/deploy commands present? |
| Architecture clarity | 20 pts | Can Claude understand the codebase structure? |
| Non-obvious patterns | 15 pts | Are gotchas and quirks documented? |
| Conciseness | 15 pts | No verbose explanations or obvious info? |
| Currency | 15 pts | Does it reflect current codebase state? |
| Actionability | 15 pts | Are instructions executable, not vague? |

**Quality Grades:**

- **A (90-100)**: Comprehensive, current, actionable
- **B (70-89)**: Good coverage, minor gaps
- **C (50-69)**: Basic info, missing key sections
- **D (30-49)**: Sparse or outdated
- **F (0-29)**: Missing or severely outdated

### Phase 3: Staleness Detection

Cross-reference CLAUDE.md content against the actual codebase:

1. **Dead references**: Check that file paths mentioned in CLAUDE.md actually exist
2. **Stale commands**: Verify documented commands against `package.json` scripts, `Makefile` targets, etc.
3. **Contradictions**: Look for rules that conflict with each other or with actual code patterns
4. **Outdated tech**: Flag version numbers or tech references that don't match current deps
5. **Redundant rules**: Identify duplicates across CLAUDE.md files in the hierarchy

```bash
# Example: verify file references
grep -oP '`[^`]*\.(ts|js|py|go|rs|md)`' CLAUDE.md | tr -d '`' | while read f; do
  [ ! -e "$f" ] && echo "STALE: $f not found"
done
```

### Phase 4: Conflict Detection

When multiple CLAUDE.md files exist, check for conflicts:

- Root says "use tabs" but `packages/api/CLAUDE.md` says "use spaces"
- Global says "always add tests" but project root says "skip tests for scripts/"
- Subdirectory rules that shadow or contradict parent rules

Report conflicts with file paths and line numbers so the user can resolve them.

### Phase 5: Quality Report

**ALWAYS output the quality report BEFORE making any changes.**

```markdown
## CLAUDE.md Quality Report

### Summary
- Files found: X
- Average score: X/100
- Files needing update: X
- Stale references found: X
- Conflicts detected: X

### File-by-File Assessment

#### 1. ./CLAUDE.md (Project Root)
**Score: XX/100 (Grade: X)**

| Criterion | Score | Notes |
|-----------|-------|-------|
| Commands/workflows | X/20 | ... |
| Architecture clarity | X/20 | ... |
| Non-obvious patterns | X/15 | ... |
| Conciseness | X/15 | ... |
| Currency | X/15 | ... |
| Actionability | X/15 | ... |

**Stale content:**
- [List dead references, outdated commands]

**Conflicts with other files:**
- [List contradictions]

**Recommended changes:**
- [List additions, removals, and edits]
```

### Phase 6: Targeted Updates

After presenting the report, **ask the user for approval** before making any changes.

**Update Guidelines:**

1. **Propose specific diffs** — not vague suggestions:
   ```markdown
   ### Update: ./CLAUDE.md

   **Why:** Build command changed from `npm run build` to `turbo build`

   ```diff
   - | `npm run build` | Production build |
   + | `turbo build` | Production build (uses Turborepo cache) |
   ```
   ```

2. **Remove stale content** — don't just add, also prune:
   ```markdown
   ### Remove from: ./CLAUDE.md

   **Why:** `src/legacy/` was deleted in commit abc123

   ```diff
   - - `src/legacy/` - Legacy API adapters (do not modify)
   ```
   ```

3. **Keep it minimal** — avoid:
   - Restating what's obvious from the code
   - Generic best practices
   - One-off fixes unlikely to recur
   - Verbose explanations when a one-liner suffices

4. **Respect the under-200-lines guideline** — if CLAUDE.md is already long, suggest what to cut before adding

### Phase 7: Apply Updates

After user approval, apply changes using the Edit tool. Preserve existing content structure and ordering.

---

## Mode 2: Capture Learnings

Record what you discovered during this session into the appropriate CLAUDE.md file.

### Step 1: Reflect

Review the current session for learnings. What context was missing that would have helped?

- Bash commands that were used or discovered
- Code style patterns followed
- Testing approaches that worked
- Environment/configuration quirks
- Warnings or gotchas encountered
- Build or deploy workflows
- Non-obvious dependencies or ordering

### Step 2: Find Target Files

```bash
find . -name "CLAUDE.md" -o -name ".claude.local.md" 2>/dev/null | head -20
```

### Step 3: Smart Placement

Decide where each learning belongs:

| Learning type | Target file | Reason |
|---------------|-------------|--------|
| Project commands, architecture, shared patterns | `./CLAUDE.md` | Team-shared, committed to git |
| Personal preferences, local paths, editor config | `./.claude.local.md` | Personal only, gitignored |
| Cross-project defaults (formatting, style) | `~/.claude/CLAUDE.md` | Applies to all projects |
| Package-specific patterns | `./packages/<name>/CLAUDE.md` | Scoped to that package |

**Rules:**
- If it helps the whole team, it goes in `./CLAUDE.md`
- If it's just your machine/preferences, it goes in `.claude.local.md`
- If it applies everywhere you work, it goes in `~/.claude/CLAUDE.md`
- If it's specific to one package in a monorepo, scope it there

### Step 4: Draft Additions

**Keep it concise** — one line per concept. CLAUDE.md is part of the prompt, so brevity matters.

Format: `<command or pattern>` - `<brief description>`

Avoid:
- Verbose explanations
- Obvious information derivable from code
- One-off fixes unlikely to recur

### Step 5: Check for Conflicts

Before adding, read the target CLAUDE.md and check:
- Does this contradict an existing rule?
- Is this already documented (possibly worded differently)?
- Would this push the file over 200 lines?

If yes to any: propose an edit/replacement rather than an addition.

### Step 6: Show Proposed Changes

For each addition, show a diff:

```markdown
### Update: ./CLAUDE.md

**Why:** [one-line reason this helps future sessions]

```diff
+ [the addition — keep it brief]
```
```

### Step 7: Apply with Approval

Ask the user if they want to apply the changes. Only edit files they approve.

---

## Common Issues to Flag

1. **Stale commands**: Build commands that no longer work
2. **Missing dependencies**: Required tools not mentioned
3. **Outdated architecture**: File structure that's changed
4. **Missing environment setup**: Required env vars or config
5. **Broken test commands**: Test scripts that have changed
6. **Undocumented gotchas**: Non-obvious patterns not captured
7. **Bloated files**: CLAUDE.md over 200 lines with filler content
8. **Missing files**: No CLAUDE.md at all in an active project

## User Tips

When presenting results, remind users:

- **`#` shortcut**: During a Claude session, press `#` to auto-incorporate learnings into CLAUDE.md
- **Keep it concise**: Dense is better than verbose
- **Actionable commands**: All documented commands should be copy-paste ready
- **Use `.claude.local.md`**: For personal preferences not shared with team
- **Global defaults**: Put user-wide preferences in `~/.claude/CLAUDE.md`

## What Makes a Great CLAUDE.md

**Key principles:**
- Concise and human-readable (under 200 lines)
- Actionable commands that can be copy-pasted
- Project-specific patterns, not generic advice
- Non-obvious gotchas and warnings
- Prescriptive language ("MUST", "NEVER") over suggestions ("prefer", "consider")

**Recommended sections** (use only what's relevant):
- Commands (build, test, dev, lint)
- Architecture (directory structure)
- Key Files (entry points, config)
- Code Style (project conventions)
- Environment (required vars, setup)
- Testing (commands, patterns)
- Gotchas (quirks, common mistakes)
- Workflow (when to do what)

See [references/templates.md](references/templates.md) for templates by project type.
