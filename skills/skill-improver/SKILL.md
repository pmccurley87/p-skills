---
name: skill-improver
description: "Iteratively reviews and fixes Claude Code skill quality issues until they meet standards. Runs automated fix-review cycles. Use to fix skill quality issues, improve skill descriptions, run automated skill review loops, or iteratively refine a skill."
allowed-tools:
  - Read
  - Edit
  - Write
  - Glob
  - Grep
---

# Skill Improvement Methodology

Iteratively improve a Claude Code skill by reviewing, fixing, and re-reviewing until it meets quality standards.

## Core Loop

1. **Review** - Analyze the target skill for quality issues
2. **Categorize** - Parse issues by severity
3. **Fix** - Address critical and major issues
4. **Evaluate** - Check minor issues for validity before fixing
5. **Repeat** - Continue until quality bar is met

## When to Use

- Improving a skill with multiple quality issues
- Iterating on a new skill until it meets standards
- Automated fix-review cycles instead of manual editing
- Consistent quality enforcement across skills

## When NOT to Use

- **One-time review**: Just read the skill and give feedback directly
- **Quick single fixes**: Edit the file directly
- **Non-skill files**: Only works on SKILL.md files
- **Experimental skills**: Manual iteration gives more control during exploration

## Issue Categorization

### Critical Issues (MUST fix immediately)

These block skill loading or cause runtime failures:

- Missing required frontmatter fields (name, description) -- Claude cannot index or trigger the skill
- Invalid YAML frontmatter syntax -- Parsing fails, skill won't load
- Referenced files that don't exist -- Runtime errors when Claude follows links
- Broken file paths -- Same as above, leads to tool failures

### Major Issues (MUST fix)

These significantly degrade skill effectiveness:

- Weak or vague trigger descriptions -- Claude may not recognize when to use the skill
- Wrong writing voice (second person "you" instead of imperative) -- Inconsistent with Claude's execution model
- SKILL.md exceeds 500 lines without using references/ -- Overloads context, reduces comprehension
- Missing "When to Use" or "When NOT to Use" sections -- Required by project quality standards
- Description doesn't specify when to trigger -- Skill may never be selected

### Minor Issues (Evaluate before fixing)

These are polish items that may or may not improve the skill:

- Subjective style preferences -- Reviewer may have different taste than author
- Optional enhancements -- May add complexity without proportional value
- "Nice to have" improvements -- Consider cost-benefit before implementing
- Formatting suggestions -- Often valid but low impact

## Minor Issue Evaluation

Before implementing any minor issue fix, evaluate:

1. **Is this a genuine improvement?** - Does it add real value or just satisfy a preference?
2. **Could this be a false positive?** - Is the reviewer misunderstanding context?
3. **Would this actually help Claude use the skill?** - Focus on functional improvements

Only implement minor fixes that are clearly beneficial.

## Example Fix Cycle

**Iteration 1 -- review output:**
```text
Critical: SKILL.md:1 - Missing required 'name' field in frontmatter
Major: SKILL.md:3 - Description uses second person ("you should use")
Major: Missing "When NOT to Use" section
Minor: Line 45 is verbose
```

**Fixes applied:**
- Added name field to frontmatter
- Rewrote description in third person
- Added "When NOT to Use" section

**Iteration 2 -- review again to verify fixes:**
```text
Minor: Line 45 is verbose
```

**Minor issue evaluation:**
Line 45 communicates effectively as-is. The verbosity provides useful context. Skip.

**All critical/major issues resolved. Done.**

## Completion Criteria

The improvement loop is done when:

1. Review reports no issues or "Pass"
2. All critical and major issues are fixed AND verified
3. Remaining issues are only minor AND evaluated as false positives or not worth fixing

## Rationalizations to Reject

- "I'll just mark it complete and come back later" - Fix issues now
- "This minor issue seems wrong, I'll skip all of them" - Evaluate each one individually
- "The reviewer is being too strict" - The quality bar exists for a reason
- "It's good enough" - If there are major issues, it's not good enough

## Quality Checklist

Before declaring a skill complete, verify:

- [ ] Frontmatter has name and description fields
- [ ] Description explains when to trigger the skill
- [ ] YAML syntax is valid
- [ ] All referenced files exist
- [ ] "When to Use" section present
- [ ] "When NOT to Use" section present
- [ ] Writing voice is imperative (not second person)
- [ ] SKILL.md is under 500 lines or uses references/
