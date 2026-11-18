---
name: pm-claude-design
description: Use when Codex or Claude Code is asked to create, revise, open, or show a design mockup for review, whether the user says Claude Design, a design, a mockup, or a Design artifact, including reopening a saved design when the user says “bring it up again”.
---

# PM Claude Design

Deliver the requested mockup as a Design artifact on claude.ai and, when asked to show it, make it visible to the user. Claude Design projects are being retired in favour of Artifacts, so new design work goes to an Artifact, not a Claude Design project.

This skill does not operate the Claude Code CLI. Resolve loose wording from the task context; clarify only when the intended product changes the work.

## Choose the route

1. **Artifact tool available** (Claude Code with the `Artifact` tool): use it. Read [artifact-route.md](references/artifact-route.md). No browser automation is needed to create or revise.
2. **No Artifact tool** (for example Codex): create the Design artifact through the browser. For T3 Browser read [macbook-t3.md](references/macbook-t3.md); for Ego Lite or native windows read [browser-control.md](references/browser-control.md).
3. **An existing Claude Design project** (`claude.ai/design/p/...`): reopen it only to show or export it. To keep working on it, export it and move it into a Design artifact (see artifact-route.md, Moving an old project). Do not start new work there.

Follow the user's chosen tool when they name one.

## Account check

An artifact or project is visible only to the account that owns it, or to people it is shared with. A “not found” page usually means the viewing browser is signed in to a different account, not that the item was deleted.

- Before creating, know which account the creating tool uses. Before showing, check which account the viewing browser uses. Compare them; do not guess.
- If they differ, ask the user which account to use. Signing a browser out, switching accounts, or changing sharing are the user's decisions.
- Never extract cookies or session data, or move a session between browsers.

## Create or revise the mockup

1. Ground the design in the real product. When the mockup changes an existing app, start from a current screenshot of that app and say what must stay unchanged. Without one, the result invents its own look.
2. Remove or blur private data (customer names in content, emails, tracking numbers, credentials) from any screenshot before it leaves the machine. Attach only material authorized for that destination.
3. Give the goal, the reference, the requested states, and realistic sample content. Label sample data as sample; do not invent completed totals or success states.
4. Keep review controls and explanations outside the proposed UI: one artboard per option, named so the options can be compared.
5. For a revision, change only what was asked and keep the same artifact URL.

A request to review a design does not authorize product-code changes, deployment, sharing changes, or broader access. Preserve any sign-off the user requested. Do not add approval gates they did not request.

## Show it to the user

- Inside T3: open the artifact URL in this thread's Browser with the user's signed-in profile, then confirm the canvas shows the artboards. Details: [macbook-t3.md](references/macbook-t3.md).
- Elsewhere: give the link and, if asked to put it on screen, use native Computer Use to raise the right window. Verify with a screenshot.
- If the viewing browser shows “not found”, run the account check above before anything else.

Report only what is verified: the design is visible (or exactly why not), what changed, which account owns it, and whether implementation still awaits sign-off. Artifacts are private by default; say so when the user means to share the link.
