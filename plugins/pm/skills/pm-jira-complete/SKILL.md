---
name: pm-jira-complete
description: "Announce that a Jira ticket is complete with one plain-English release line in the team's Slack channel, posted through ego-browser as the signed-in user. Use when the user says a ticket is done, shipped or complete and wants it announced (e.g. 'announce PROJ-123 is done', 'post that OPS-45 shipped'). Closing the ticket in Jira is opt-in."
---

# Announce a completed Jira ticket

Post one release line for a finished ticket. Default scope is the Slack post only. Change the Jira ticket (comment, transition) only when the user asks in this request.

## 0. Load workspace config

Workspace values live outside this skill, in `~/.claude/pm-jira-complete.json`, so they never ship with it:

```json
{
  "slackChannelName": "#release-notes",
  "slackChannelUrl": "https://app.slack.com/client/<TEAM_ID>/<CHANNEL_ID>",
  "jiraSite": "example.atlassian.net"
}
```

If the file is missing or a value is empty, ask the user for it once, then write the file. Never guess a channel. If the user names a different channel in the request, use that for this run only.

## 1. Read the ticket

- Take the ticket key from the user's request or URL. Never guess or search for a key.
- Fetch it with the Atlassian MCP `getJiraIssue`, passing `jiraSite` as `cloudId` if no cloudId is cached.
- Use the summary, description and acceptance criteria to learn the user or business outcome.
- If the user or the session already says what actually shipped, prefer that over the ticket's planned scope. Do not announce scope the ticket lists but the work did not deliver.

## 2. Write the line

With a ticket (two spaces before the URL):

```
:white_check_mark: <KEY>: <sentence>  https://<jiraSite>/browse/<KEY>
```

Without one: `:white_check_mark: <sentence>`

The sentence must be:

- Plain English for a non-technical reader, present tense, at most 25 words.
- About the outcome for users or the business, not the implementation.
- Free of code names, file paths, commit hashes, PR numbers, test counts, secrets and customer data.

Varied examples of good sentences:

- "Support staff can export the weekly report again, with a clear error when a filter returns nothing."
- "Duplicate reminder emails are switched off, so customers get one notice per order."

## 3. Post with ego-browser

Load the `ego-browser` skill and follow its guide. Use one TaskSpace.

1. Open `slackChannelUrl`.
2. If Slack asks to sign in, reuse the existing session or choose the work account tile. Never type a password. Hand off to the user for passwords, MFA codes or new consent screens.
3. Read the last ~15 messages (`[data-qa="message_container"]`) and check the page text for the ticket key. If it is already announced, skip the post and say so.
4. Click the composer (`[data-qa="message_input"] [contenteditable="true"]`), insert the line with `page.keyboard.insertText(line)`, press `Enter`.
5. Wait until a message containing the ticket key appears, then take one screenshot to confirm the emoji rendered. Slack converts the `:white_check_mark:` shortcode to ✅ on insert, so the composer text reading back with a leading space is expected.
6. `await task.finish({ keep: [] })`.

If Slack is unreachable or the post fails, give the user the exact line to paste.

If ego-browser prints an `[ego-browser:notice]` about an update, mention it after finishing and ask before running `ego-browser upgrade`.

## 4. Jira (only when asked)

When the user asks to close the ticket too: add a one-line comment saying what shipped (with the PR link if known), then apply the `Done` transition unless it is already `Done`. If the transition is unavailable, report the ticket's current status.

## Report

One or two lines: posted (or skipped and why), the exact line, and the Jira state if touched.
