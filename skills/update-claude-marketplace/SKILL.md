---
name: update-claude-marketplace
description: "Publish skill changes to the p-skills Claude Code marketplace. Use after editing any skill to bump versions, update the marketplace catalog, generate a changelog entry, sync duplicate files, commit, and push. Ensures consumers see what changed."
allowed-tools:
  - Read
  - Write
  - Edit
  - Glob
  - Grep
  - Bash
---

# Update Claude Marketplace

Publish skill changes to the p-skills marketplace with proper version bumps, changelog entries, and file sync so consumers know what changed.

## When to Use

- After editing any SKILL.md in the marketplace
- After adding a new skill/plugin to the marketplace
- After removing a skill from the marketplace
- When the user says "publish", "release", or "update the marketplace"

## When NOT to Use

- When only reading or reviewing skills (no changes made)
- When editing files outside the skills/plugins directories

## Marketplace Structure

```
p-skills/
├── .claude-plugin/
│   └── marketplace.json          # Catalog — single plugin entry for "pm"
├── CHANGELOG.md                  # Consumer-facing changelog
├── plugins/
│   └── pm/
│       ├── .claude-plugin/
│       │   └── plugin.json       # Plugin manifest (has version)
│       └── skills/
│           ├── tdd/
│           │   └── SKILL.md
│           ├── planning/
│           │   └── SKILL.md
│           └── <skill-name>/
│               └── SKILL.md
└── skills/
    └── <skill-name>/
        └── SKILL.md              # Legacy copy (keep in sync)
```

All skills live under the single `pm` plugin. Skills are referenced as `pm:<skill-name>` (e.g., `pm:tdd`, `pm:planning`).

## Release Workflow

Execute these steps in order after any skill change:

### Step 1: Identify What Changed

Read git diff to determine which skills were modified, added, or removed.

```bash
git diff --name-only HEAD
git diff --staged --name-only
```

### Step 2: Determine Version Bump

Use semver for `plugins/pm/.claude-plugin/plugin.json`:

| Change Type | Bump | Example |
|------------|------|---------|
| New skill added, or new capability in an existing skill | **Minor** (2.0.0 -> 2.1.0) | Added new "cold-review" skill |
| Bug fix, typo, wording tweak in a skill | **Patch** (2.0.0 -> 2.0.1) | Fixed broken markdown table |
| Breaking change (renamed skill, changed trigger) | **Major** (2.0.0 -> 3.0.0) | Renamed a skill |

### Step 3: Bump plugin.json Version

Edit `plugins/pm/.claude-plugin/plugin.json` and update the `version` field.

### Step 4: Update CHANGELOG.md

Append an entry at the top of CHANGELOG.md (create if it doesn't exist):

```markdown
## [YYYY-MM-DD]

### <plugin-name> v<new-version>
- <What changed and why, written for consumers>
```

Rules for changelog entries:
- Lead with the skill name and new version
- Describe what changed from the consumer's perspective (what they get, not what you did internally)
- One bullet per meaningful change
- Group multiple skill updates under the same date heading

### Step 5: Sync Duplicate Files

The repo has skills in two locations. Keep them in sync:

```bash
cp plugins/pm/skills/<skill-name>/SKILL.md skills/<skill-name>/SKILL.md
```

Do this for every changed skill.

### Step 6: Update marketplace.json (If Needed)

Only modify `.claude-plugin/marketplace.json` when:
- **Adding** a new plugin -- add an entry to the `plugins` array
- **Removing** a plugin -- remove its entry
- **Changing a plugin's description** -- update the `description` field

Do NOT update marketplace.json for version bumps alone -- the version lives in each plugin's `plugin.json`.

### Step 7: Commit and Push

```bash
git add -A
git commit -m "<summary of changes>"
git push
```

Commit message format:
- Adding a skill: `Add <skill-name> plugin to marketplace`
- Updating a skill: `Update <skill-name> to v<version>: <what changed>`
- Multiple updates: `Update <skill-1>, <skill-2>: <summary>`

## Adding a New Skill Checklist

When adding a brand new skill to the pm plugin:

1. Create `plugins/pm/skills/<skill-name>/SKILL.md` with proper frontmatter (`name: <skill-name>`)

2. Create `skills/<skill-name>/SKILL.md` (legacy sync copy)

3. Bump the version in `plugins/pm/.claude-plugin/plugin.json` (minor bump for new skills)

4. Add CHANGELOG.md entry

5. Commit and push

## Removing a Skill Checklist

1. Remove `plugins/pm/skills/<skill-name>/` directory
2. Remove `skills/<skill-name>/` directory
3. Add CHANGELOG.md entry noting removal and reason
4. Commit and push
