---
name: jira-create
description: Use when the user asks to raise, create, open or log a Jira ticket for the work in the current session ("raise a ticket for this", "put this on Jira", "create a ticket and name the thread after it"), including when a ticket exists but sits in the backlog or the wrong status.
---

# Raise a Jira ticket for the work in hand

The ticket is done only when all three are true, each confirmed by a read made after the write:

1. It exists, describes the work, and is assigned to the user.
2. Its status is the board's in-progress status.
3. It is on the board, not in the backlog.

Then the session is named after it.

Status and backlog are separate things. A ticket can read "In Progress" and still sit in the backlog where nobody sees it, and a create or a transition that succeeds says nothing about either. Never report the ticket as raised from the create call alone.

## 1. Work out what the ticket is for

Use the conversation first, then the branch name, the diff and any open pull request. If the session holds no clear piece of work, ask what the ticket is for.

## 2. Find the site and project

- Site: `getAccessibleAtlassianResources`. With several sites, pick the one the repo's ticket links use; ask if unclear.
- Project: the ticket key prefix most used in recent commit subjects, branch names and pull request titles of this repo. Ask when the repo shows none or several.
- Conventions: read three or four recent tickets in that project on similar work and copy their issue type, summary style and labels. Do not invent labels.

## 3. Look for an existing ticket

Check the branch name and conversation for a key, then search the project by the main nouns of the work. If one already covers this work, use it: skip to step 5 and say you reused it.

## 4. Create it

- **Summary:** the outcome in one line, in the project's style.
- **Description**, plain English a non-developer can follow:
  - `Problem`: what is wrong or missing today, and who it affects.
  - `What we want`: the outcome, as short bullets.
  - `Status`: branch, pull request, what is built and what is not.
  - `Open decisions`: only if there are any.
- Leave out secrets, connection strings and customer data.
- Assign it to the user (`atlassianUserInfo` gives the account id).

## 5. Put it in progress, on the board

Board operations named below that are not in your tool list run through the Atlassian MCP's `discover`, then `executeRead`.

1. **Find the board:** `listJiraBoards` for the project, then `getJiraBoardConfig` for its columns. With several boards, use the one the project's recent tickets sit on; ask if unclear.
2. **Name the in-progress status:** the status mapped to the column called "In Progress", or the column whose name means work in hand ("Doing", "In development"). The config does not flag it and a status's category does not tell you, because several columns often share one category. If no column clearly means work in hand, ask the user which column to use.
3. **Set the status:** `listJiraIssueTransitions`, pick the transition whose *target status* is that status (a transition's name can differ from where it leads), then `transitionJiraIssue`.
4. **Get it out of the backlog.** `listJiraBoardSprints` tells you which kind of board this is: an error saying the board does not support sprints means it has none.
   - Board with sprints: move the ticket into the active sprint (`transitionJiraIssue` with `sprintId`). If there is no active sprint, stop and tell the user.
   - Board without sprints: call `getJiraBoardIssueData` with `dataset: "backlog"` and `jql: "key = <KEY>"`. If the ticket comes back, move it with the Jira Agile REST call `POST /rest/agile/1.0/board/<boardId>/issue`, body `{"issues":["<KEY>"]}`. The Atlassian MCP has no operation for this move. Send it from a signed-in browser session on the Jira site (the `pm-browser-ego` skill, `page.fetch`) or with an API token that is already configured. A 204 means accepted.
5. **Verify with two reads:** `getJiraIssue` shows the in-progress status and the user as assignee, and the backlog read from step 4 no longer returns the ticket (on a sprint board, the ticket lists the active sprint). The backlog read can lag by a few seconds, so read again once before treating it as a failure.

If the move cannot be made (no browser session, no token), say exactly that: the ticket is in progress but still in the backlog, with its link, so the user can drag it across. Do not call it done.

## 6. Name the session after the ticket

Rename the current thread or session to `<KEY> <short title>`, using the host's own rename tool (in T3 Code, `t3_thread_update` with `action: "rename"`). Leave the branch and worktree folder alone unless the user asks. If the host has no rename tool, say so.

## Report

Three lines at most: the ticket link, its status and that it is on the board (or what is still wrong), and the new session name.

## Common mistakes

| Mistake | What to do instead |
|---|---|
| Stopping after create | A new ticket lands in the workflow's first status, usually in the backlog. Run step 5. |
| Trusting the status category | Match the status by the board's column config. |
| Choosing a transition by its name | Match on the status it leads to. |
| Treating "In Progress" as "on the board" | Run the backlog read in step 5. |
| Creating a second ticket for the same work | Search first (step 3). |
