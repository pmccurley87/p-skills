---
name: pm-walkthrough
description: |
  Walk a reviewer through a list of items — bugs, features, plan steps, findings — one at a time,
  building enough context for them to understand each item deeply before approving or giving feedback.
  Use when there is a backlog of related items (bugs to triage, features to scope, refactor steps to
  agree on) and the user needs to sign off on each one. Optionally generates a single-page HTML
  walkthrough UI so the reviewer can read it in a browser instead of the terminal.
allowed-tools:
  - Read
  - Glob
  - Grep
  - Bash
  - Write
  - Edit
  - Agent
  - AskUserQuestion
---

# Walkthrough

You are a guide. Your job is to take a list of items the reviewer needs to understand and walk
them through it — one item at a time — until they have enough context to make a confident decision
on each. You teach first, recommend second, and only move on once the reviewer has approved or
asked for changes.

## When to use

- A list of bugs needs triage and a recommended fix per bug
- A multi-step plan needs sign-off step by step
- A set of features needs scoping decisions
- Code review findings need agreement before any code changes
- Any time "here are N things, please decide on each" is the shape of the work

## When NOT to use

- A single decision — just present it directly
- Implementation work where the user has already approved the plan — use `pm:planning` or just execute
- Pure investigation with no decision required — use `pm:confirm-issue` or `pm:cold-review`

## Process

### Step 1: Establish the list

Identify the items to walk through. They may already be in the conversation (a bug list the user
pasted, findings from a review, a plan you just produced). If not, ask.

For each item, capture:
- A short title
- Where it came from (file, ticket, finding)
- Initial classification (bug / feature / plan-step / question)

Confirm the list with the user before starting. They may want to reorder, drop items, or add more.

### Step 2: Set up the walkthrough HTML

**An HTML page per item is required, not optional.** Text alone in chat cannot carry the depth
this skill aims for — diagrams, side-by-side code, before/after comparisons, collapsible deep-dives,
and visual hierarchy do work that paragraphs cannot. Chat is for the verdict; HTML is for the
understanding.

Pick an output directory (default: `./walkthrough-<date>/`). You will create:

- `index.html` — landing page with the full item list, status indicators, and links into each item
- `item-01-<slug>.html`, `item-02-<slug>.html`, ... — one rich page per item
- `assets/style.css` — shared styles (or inline if you prefer self-contained pages)

Each item page must be self-contained enough to open standalone (no build step, no external CDN
required for core function — inline what's needed). Diagrams via inline SVG or Mermaid (CDN script
is acceptable for Mermaid since it's read-only).

### Step 3: Build understanding for each item — in HTML

For each item, the HTML page must work harder than a text briefing would. Required sections (skip
any that genuinely don't apply, but default to including them):

1. **Header** — title, classification (bug/feature/plan-step), severity or size badge, status
2. **TL;DR** — one or two sentences the reviewer can read in 5 seconds
3. **Background** — what the reviewer needs to know to evaluate the rest. Use:
   - Inline code blocks with file:line headers
   - Architecture or flow diagrams (SVG or Mermaid) where structure matters
   - Annotated screenshots if UI is involved
4. **The problem / the opportunity** — what's broken or what's possible. Use:
   - Reproduction steps as a numbered list
   - Before-state evidence (logs, output, screenshots) in a collapsible block
   - A diagram of the failure path if non-trivial
5. **Options considered** — a comparison table (option × pros/cons/effort/risk). If only one
   option is viable, say so explicitly and explain why alternatives were ruled out.
6. **Recommendation** — the proposed approach, with:
   - A "before vs after" side-by-side (code diff, diagram diff, or behaviour diff)
   - The specific files/areas that would change
   - Why this option beats the others (link back to the comparison)
7. **Risks & unknowns** — what could go wrong, what you couldn't verify, what assumptions you made
8. **Effort & dependencies** — rough size, what blocks this, what this blocks
9. **Verdict block** — radio buttons (Approve / Approve with changes / Defer / Reject / Discuss),
   a notes textarea, and a "Copy verdict" button that puts a structured string on the clipboard
   for the reviewer to paste back into chat.

Use visual hierarchy aggressively: collapsible `<details>` for deep-dives, syntax-highlighted
code, sticky table of contents on long pages, and clear next/prev navigation between items.

The reviewer should finish each page knowing as much as you do about that item. If they have to
ask "wait, what does X mean?", the page failed — update it and reload.

### Step 4: Get a verdict

Tell the user the page is ready and give them the file path. Wait for them to read it. Then use
`AskUserQuestion` with options scoped to this item:

- **Approve** — accept the recommendation as-is
- **Approve with changes** — accept the direction, but adjust details (ask for them)
- **Defer** — skip for now, revisit later
- **Reject** — don't pursue this; explain why so it's recorded
- **Discuss** — open conversation; reviewer wants to talk before deciding

Record the verdict and any feedback against the item. Do **not** start implementing yet — this skill
ends at approval, not at execution.

### Step 5: Iterate

Move to the next item. Keep a running summary visible: `[3/8 approved, 1 deferred, on item 5 of 8]`.

After the last item, present a final summary table:

| # | Item | Verdict | Notes |

Then ask whether to:
- Hand off to implementation (e.g., `pm:planning` or direct execution)
- Export the walkthrough record to a file
- Open follow-up walkthroughs for deferred items

## HTML quality bar

The HTML is the product. Treat it that way.

- **Self-contained per page** — open in any browser, no build, no server
- **Legible typography** — system font stack, comfortable line length (~70ch), generous spacing
- **Visual hierarchy** — clear H1/H2/H3, badges for status/severity, callouts for risks
- **Code presentation** — monospace blocks with file:line headers, syntax highlighting if
  feasible (Prism via CDN is fine), collapsible for long snippets
- **Diagrams over prose** — when explaining flow, structure, or before/after, draw it. SVG
  inline or Mermaid via CDN.
- **Comparison tables** — for options analysis, use a table not paragraphs
- **Don't dump everything** — use `<details>` to hide deep-dives behind summaries; the page
  should be skimmable in 30 seconds and deeply readable in 5 minutes
- **Index page** — `index.html` shows item list with status, links into each, and overall progress

Update the index page's status indicators after each verdict so the running state is visible
both in chat and in the browser.

## Rules

1. **Educate before recommending.** A recommendation without context is just an opinion. Always
   give the reviewer enough background to evaluate the recommendation themselves.
2. **One item at a time.** Don't bundle items together unless the user explicitly says so.
3. **Cite sources.** Every claim about the codebase needs a `file:line` reference.
4. **No implementation during walkthrough.** This skill produces decisions, not changes. Hand off
   to other skills or a fresh task when approvals are in hand.
5. **Respect deferrals.** If the user defers an item, don't keep nudging it — capture it and move
   on.
6. **Keep the running state visible.** The reviewer should always know where they are in the list.

## What NOT to do

- Do not start fixing bugs or implementing features mid-walkthrough
- Do not skip the background section because "it's obvious" — if it were obvious, you wouldn't be
  walking through it
- Do not present all items at once in a wall of text — that defeats the purpose
- Do not pad briefings with filler; if an item is genuinely simple, say so and move fast
- Do not invent options just to have alternatives in the "Options considered" section — if there
  was really only one viable approach, say that
