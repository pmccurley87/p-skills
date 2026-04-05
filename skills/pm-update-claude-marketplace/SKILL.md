---
name: pm-update-claude-marketplace
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
│   └── marketplace.json          # Catalog of all plugins
├── CHANGELOG.md                  # Consumer-facing changelog
├── plugins/
│   └── <plugin-name>/
│       ├── .claude-plugin/
│       │   └── plugin.json       # Plugin manifest (has version)
│       └── skills/
│           └── <skill-name>/
│               └── SKILL.md      # The actual skill
└── skills/
    └── <skill-name>/
        └── SKILL.md              # Legacy copy (keep in sync)
```

## Release Workflow

Execute these steps in order after any skill change:

### Step 1: Identify What Changed

Read git diff to determine which skills were modified, added, or removed.

```bash
git diff --name-only HEAD
git diff --staged --name-only
```

### Step 2: Determine Version Bump

Use semver for each changed plugin's `plugin.json`:

| Change Type | Bump | Example |
|------------|------|---------|
| New section, new capability, new rule | **Minor** (1.0.0 -> 1.1.0) | Added "Check Latest Docs" rule |
| Bug fix, typo, wording tweak | **Patch** (1.0.0 -> 1.0.1) | Fixed broken markdown table |
| Breaking change (renamed skill, changed trigger) | **Major** (1.0.0 -> 2.0.0) | Renamed skill, changed description |

### Step 3: Bump plugin.json Version

Edit `plugins/<name>/.claude-plugin/plugin.json` and update the `version` field.

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
cp plugins/<name>/skills/<name>/SKILL.md skills/<name>/SKILL.md
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

## Adding a New Plugin Checklist

When adding a brand new skill to the marketplace:

1. Create `plugins/<name>/.claude-plugin/plugin.json`:
   ```json
   {"name":"<name>","version":"1.0.0","description":"<one-line description>"}
   ```

2. Create `plugins/<name>/skills/<name>/SKILL.md` with proper frontmatter

3. Create `skills/<name>/SKILL.md` (legacy sync copy)

4. Add entry to `.claude-plugin/marketplace.json` `plugins` array:
   ```json
   {
     "name": "<name>",
     "source": "./plugins/<name>",
     "description": "<one-line description>"
   }
   ```

5. Add CHANGELOG.md entry

6. Commit and push

## Removing a Plugin Checklist

1. Remove `plugins/<name>/` directory
2. Remove `skills/<name>/` directory
3. Remove entry from `.claude-plugin/marketplace.json` `plugins` array
4. Add CHANGELOG.md entry noting removal and reason
5. Commit and push

## Consumer Reinstall Notice

After a major version bump or breaking change, note in the changelog that consumers should reinstall:

```markdown
### pm-example v2.0.0 (BREAKING)
- Renamed from pm-old-name to pm-example
- Consumers: run `/plugin install pm-example@p-skills` to update
```
