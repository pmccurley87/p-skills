---
name: pm-claude-design
description: Use when Codex or Claude Code is asked to create, revise, open, or show a Claude Design mockup for review, especially when a design link is not visible to the user or design approval must precede implementation.
---

# PM Claude Design

Control Claude Design from the current agent. Deliver the requested mockup and, when asked to show it, make the design visible in the user's real window.

This skill concerns Claude Design. It does not operate the Claude Code CLI. Resolve loose wording from the task context; clarify only when the intended product changes the work.

## Choose the control route

- Follow the user's chosen tool. For website work in Ego Lite, use `pm-browser-ego` and its `ego-browser` sub-skill. Read the installed browser guide before using its API.
- Use the host's Computer Use tools for the native Claude app, bringing a window forward, or selecting the visible Ego space. In Codex, discover `cua_repl` and read its returned API documentation.
- Let the current browser command return before using native controls on that page. This does not mean calling `task.finish()`. Preserve task-space ownership; a user takeover is a stop, not a reason to switch tools.
- Reuse the authenticated session and project that work. A URL working in Ego but reporting “Project not found” in Chrome is not proof of deletion. Check the account/workspace or show the working window. Do not keep reopening the same inaccessible link or change sharing to make it work.

See [browser-control.md](references/browser-control.md) for the concrete tool entry points and lifecycle rules.

## Create or revise the mockup

1. Open the requested project, or create one if the user requested a new design. Use the site's current navigation; do not migrate existing projects merely to show a review.
2. Give Claude the goal, reference screenshot or existing design, requested states, and what must stay unchanged. Attach only material authorized for that destination. Keep private project details out of reusable instructions.
3. Keep review controls outside the proposed customer UI. Distinguish real reference values from illustrative data; do not invent completed totals or successful states.
4. Send feedback into the existing design conversation. Wait for the canvas to update. An AI reply saying “done” is not evidence that the displayed design changed.
5. Inspect the result and exercise the controls relevant to the request. Check the actual revised state, not a cached preview. Correct concrete mismatches before presenting it.

A request to review a design does not authorize product-code changes, deployment, publication, project migration, or broader access. Preserve any sign-off the user requested. Do not add approval gates they did not request.

## Show it to the user

A shared link or queued Codex panel is an intermediate result. If the user asks to see it on screen, use native Computer Use to raise the right window and select the project or Ego space. In an overview, click the preview to open it; clicking its name can enter rename mode.

Verify that the foreground window visibly contains the mockup and the intended state. An accessibility tree can include hidden spaces, so use a screenshot when foreground visibility is uncertain. Keep the result open for review using the controlling tool's handoff/deliverable mechanism.

Report only what is verified: the design is visible, what changed, and whether implementation still awaits sign-off. If blocked, name the actual access or display problem rather than saying it opened.
