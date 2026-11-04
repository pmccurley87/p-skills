# Browser and native control

## Ego Lite

Use `pm-browser-ego` for the sign-in ladder and `ego-browser` for its installed API. Start with:

```sh
ego-browser skill
```

A first round can create one task space and inspect the app:

```sh
ego-browser nodejs <<'JS'
const task = await taskSpace("Claude Design review");
const page = task.page("p1");
await page.goto("https://claude.ai/design");
console.log({ spaceId: task.spaceId });
console.log(await page.snapshot());
JS
```

Treat that URL as an entry point, not a permanent promise about the product's navigation. If the site redirects or changes, follow the visible UI. Use current snapshot refs and documented selectors for its prompt editor, file input, send button, canvas, and review controls.

Retain the returned numeric space ID and reuse it on later rounds. Do not create another space to bypass a timeout, user takeover, or ownership error. Use the guide's recovery procedure for the existing space.

- While the task is active, use its documented control and handoff methods.
- On completion, retain the result page only when the user needs it for review: `await task.finish({ keep: [page.label] })`.
- `finish()` ends that handle's lifetime. If the user later explicitly asks to reopen the review, discover its current space ID and use the documented claim procedure before further browser automation.
- Native Computer Use may show a retained user-owned result when the user asks to see it. It must not bypass an active ownership stop.

## Native Computer Use in Codex

Discover the host's tool rather than assuming an API from another runtime. For `cua_repl`, the first invocation after initialization or reset must contain exactly one supported entry-point call, for example:

```js
await cua.getState();
```

Read its returned documentation. Select the app by the name, bundle ID or window ID observed in the inventory. Use that app's latest accessibility state for actions. Raise the window only with an exposed action; select the visible design space/project preview; then inspect the new state. Check a screenshot if the tree includes several spaces or hidden pages.

If clicking a label enters an editor, cancel it and open the preview instead. Do not type navigation commands into that editor. If the tool reports that the user changed apps, re-read the current state before sending more input.

For a direct browser tab, follow the returned browser documentation. Keep a requested result with `markDeliverable()` or `markHandoff()` as appropriate to that API. Marking a tab for retention does not prove the correct native window is in front.

## Before reporting success

- The current canvas shows the requested revision.
- The relevant review control works.
- When on-screen display was requested, the actual foreground window shows the design.
- The result remains available after the turn ends.

Stop after those observations establish the requested result. If a login, permission or human approval is needed, use the relevant browser policy and state the concrete remaining step.
