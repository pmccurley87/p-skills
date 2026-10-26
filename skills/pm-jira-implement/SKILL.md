---
name: pm-jira-implement
description: Review a Jira link or issue key against the relevant code, confirm what actually needs changing, and explain the work in plain English. Use when a user sends a Jira ticket for review, planning or implementation. A link alone starts a read-only review; implement only when the user asks.
---

# Jira changes in plain English

Read carefully, investigate properly, then give the user an explanation they can understand on the first read. Works in Codex and Claude Code; use the Jira connector and repository tools available in the current environment.

## Review and confirm the work

- Read the ticket description and comments. Follow linked tickets only when they affect scope or a dependency. If access fails, say what could not be read; do not invent the ticket's contents.
- Apply the user's latest corrections. Do not bring removed requirements back through prerequisites, tests or rollout conditions. Flag contradictions with the ticket rather than silently choosing a new scope.
- Read repository instructions and check the working tree. Trace the relevant existing workflow or feature and its closest tests. Establish what it already does, what is missing, and which component or person owns each action.
- Prefer extending the existing path when it fits. Do not propose a second workflow, generator, service or accounting system merely to make a plan sound complete.
- Confirm the needed changes from evidence. Distinguish verified behavior from a ticket assertion, a recommendation and an unresolved decision. Do not imply runtime verification from code inspection.
- Ask only for decisions that materially change behavior and cannot be resolved from the ticket, code or conversation. Explain the choice in everyday terms. “Confirm” means verify the scope, not repeatedly ask permission for already-authorized work.

## Explain it to the user

Lead with what will happen after the change. Explain the trigger, what happens next, and the important failure cases in short sentences. Then say what needs changing in the existing system and what can stay as it is.

Aim for a short paragraph and three to six bullets, usually about 150–250 words. Use less for a simple change. Add detail only when it changes a decision or makes the plan actionable; do not compress a complex issue so far that an important uncertainty disappears.

Use concrete language: “start waiting when the claim is held,” “check the documents,” “keep waiting,” “try the courier start again.” Technical names are welcome when they help locate the change, but explain their purpose. For example: “Update EvidenceWindowWorkflow so the agent can wake it up when the documents are ready.”

Avoid stacked abstractions such as “durable concurrency-safe activation boundary,” repeated acceptance lists, and long tables of implementation details. Translate them: “Save the change once, even if two requests arrive together.” Do not describe every internal step just because you investigated it.

Keep supporting code links to a few useful references after the explanation. Do not make the user read source paths to understand the answer. Put substantial technical detail in a separate plan only when requested or needed for implementation.

Before sending, check:
- Can the user tell what happens, who does it, and what changes?
- Have I clearly separated existing behavior from new work?
- Have I kept the user's exclusions out of the plan?
- Can any sentence be removed without losing a useful fact or decision?

## Act within the request

A Jira link or a request to review/plan authorizes investigation and explanation, not source edits, Jira edits, status transitions, publishing or production actions. If implementation is requested, explain the intended behavior briefly, then carry out the authorized changes and relevant checks without asking for redundant approval. Finish by stating what changed, what was tested and any remaining limitation in the same plain language.

When asked to update Jira, put the plain-English explanation first and retain useful technical detail below it. Remove conflicting old requirements throughout the description; do not merely prepend a correction to a contradictory plan. Read the saved ticket back to verify it. Only change other tickets or their statuses when requested.
