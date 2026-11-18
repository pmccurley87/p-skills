# Design artifacts through the Artifact tool

## Create

1. Call the Artifact tool with `action: "quickstart"` and `intent: "design"`. It names the current Design type and its `type_url`, and lists design systems. Use the type it returns; do not hard-code a type URL.
2. Publish with that `type_url`, a short `title` naming the design, and `auto_open: "after_first_write"`. Keep the returned artifact `url` for every later call.
3. Follow the instructions the create result carries. They define the canvas index file, one file per artboard, and the publish order. They are the authority on format; this page does not repeat them.
4. Put each option in its own artboard and give each a clear title. Mark artboards with working controls as interactive.
5. Give the user the link once it is published. The type's own instructions say not to re-render or screenshot to verify; check the result only when the user asked to see it or reported a problem.

## Revise

Edit only the artboard files that change and publish them to the same `url`. Send the canvas index only when artboards are added, removed, moved or retitled. If a publish is refused because someone edited the canvas, re-read what the refusal names and redo the edit on that.

## Moving an old Claude Design project

1. Open the project in a browser signed in to its owner account.
2. Use Share › Export › Project archive. It is instant and does not use model credits. A standalone export uses Claude and counts toward usage limits.
3. Unzip into a fresh folder in the scratchpad. The archive holds the project's `.dc.html` design file(s), a `support.js` runtime, and uploads.
4. The `.dc.html` format matches the Design artifact's artboard format. If one file holds several options on one page, split each option into its own artboard file: keep the head and `<helmet>` styles, keep the shared `<script type="text/x-dc" data-dc-script>` block, and drop page-only wrappers and section labels. The Design type supplies `support.js`; do not upload the exported copy.
5. Check that each split file still balances its tags, then publish as in Create. The old project stays where it was; delete it only if the user asks.

## Account

The Artifact tool creates artifacts in the account it is connected to. A browser signed in to a different account sees “not found”. Compare accounts before assuming anything is broken.
