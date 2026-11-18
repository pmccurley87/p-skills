# Claude Design through T3 Browser

## Select the host and browser

- Discover the installed T3 tools. Check `hostname` when the user names a machine. A parent running elsewhere does not prove its browser uses the MacBook session. For another linked machine, discover `t3_environment_links` and use that environment; do not start a new top-level thread unless asked.
- Call `preview_status` first. Inspect tab ownership and `defaultProfileId`. `available:false` with no tab is not proof that Browser is unsupported: `preview_open` can initialize it.
- Reuse the authenticated default profile unless the user picks another. Profiles belong to that host. Do not extract cookies, secrets or browser storage, or tunnel a session to another host.
- Read any listed tab, but act only on your own tab or an unclaimed tab with no human in control. If no such tab is suitable, open a new tab in this thread with `reuseExistingTab:false`. Never take over a human-owned tab.
- When another thread id is supplied, read it with `t3_thread_read` before reporting about it. Treat its saved URL as a reference; do not assume its tab belongs to this agent.

## Reopen or reveal a saved design

“Bring it up again” means show the existing result. Use the saved URL from the conversation or prior thread. Do not create, edit, migrate or publish a design to reopen it.

1. Call `preview_status` and select an owned or unclaimed tab, or create one as above.
2. Call `preview_open` with the saved URL, `open:true`, and the default profile for a new tab. Pass the safe `tabId` when reusing a tab. Avoid navigating a human-owned tab through implicit reuse.
3. Call `preview_snapshot` for the returned tab. Verify the saved title and actual canvas, not just the URL or a successful open receipt. Include an image when canvas text is empty or incomplete. An empty iframe text result can still have a fully rendered canvas.
4. Read `preview_status` again to check `visible`. A rendered snapshot proves loading; it does not prove the user's Browser panel or native window is in front.
5. If supported native Computer Use is available, read its API guide, raise T3, and select this thread's Browser panel. Use current native state and a screenshot to verify the foreground result. Native controls must not bypass browser ownership or a human takeover.
6. Keep the tab open for review. Return the exact thread `link` from T3 and the verified visibility state. If it remains `visible:false` or native controls are absent, say: “The design loaded. Open this thread and select Browser.” Do not claim it is on screen.

Use `t3_thread_list` to find `currentThreadId` when needed, then `t3_thread_read` to obtain its exact link. Do not invent thread URLs.

If a preview step fails twice, quote the error and use an allowed installed fallback. A human ownership stop is not a tool failure and must not be bypassed. If no permitted route remains, report the concrete block.

## Check the Browser's account

When a saved link shows “not found”, compare accounts before anything else. The account menu shows the signed-in user. On a claude.ai page in your own tab, a same-origin read of `/api/account` also returns the account email and organizations; mask the email when reporting it. Do not read cookies or storage.

If the Browser's account differs from the one that owns the design, ask the user which to use. Signing out or switching accounts in their Browser is their decision.

## Create or revise

When the agent has the `Artifact` tool, create and revise through it (see [artifact-route.md](artifact-route.md)) and use T3 Browser only to show the result. The steps below are for agents without that tool.

Verify the live account through the visible account menu before creating anything. Use any account specified by the user. Do not sign out a different account to obtain it.

`https://claude.ai/design` can redirect to a product page. Follow its visible Start designing link. In the verified UI this led to Artifacts; the sidebar Design link opened `https://claude.ai/artifacts/design`. Follow current navigation rather than treating these routes as permanent.

The Design list can say new projects are artifacts. Use its Design card only when a new design was requested. Do not move old projects merely to show a review.

- Inspect the current prompt editor. A verified label was `Write your prompt to Claude`; it was contenteditable. Use current snapshot refs rather than saved refs or assumed selectors.
- Send the authorized brief or revision in the existing chat. Wait for the actual canvas change. A reply saying “done”, a new title, or a send receipt is insufficient.
- Inspect the canvas image and relevant controls. Treat sample values as sample data.
- Reopen the saved item from the Design list when persistence needs checking. Save its actual `/artifact/...` URL in the conversation or task handoff, not in this shared skill.
- Do not change sharing, publish, deploy or migrate projects to repair access. Report a login or access block without extracting session data.

## Observed limits

On Patrick's MacBook, `available:false` became `available:true` after opening a tab. The saved Design canvas loaded in the default profile while `visible:false` remained. These observations explain the separate load and display checks; they do not promise future authentication or visibility.
