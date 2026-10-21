---
name: pm-text-explain
description: Use when writing anything a person will read rather than a machine, such as a Slack post, a thread reply, an email, a handover note, a status update, or an explanation of a change for a colleague, and especially when the draft is turning into dense paragraphs or a reader asks for something simpler.
allowed-tools:
  - Read
  - Write
  - Edit
---

# Text Explain

Write for someone who will scan the message in ten seconds, on a phone, while doing something else. They need the state of the world and their next action before they lose interest. Everything else is a link.

## The shape

Every message is exactly these lines, in this order. At most 7 lines after the headline.

1. **Headline.** One bold line, at most 12 words, stating the outcome or status. Must stand alone.
2. **Three to five bullets.** One idea each, at most 15 words each, in this order: what broke or changed; why, in the reader's words; what is different now; where it stands.
3. **Action bullet.** Starts with who does what, or "Nothing for you to do."
4. **More line.** One ticket, PR or doc reference. Not the detail itself.

Caps, headline to last line: 80 words for Slack, threads and spoken explanations; 120 for email, plus a subject line that repeats the headline. Email keeps "Hi <name>," and your name, nothing else.

## Reader level

Pick one before writing. Same shape, different vocabulary.

| Reader | Vocabulary |
| --- | --- |
| Non-technical (customer success, ops, management) | Products, screens, buttons, people. No file, function, table or branch names. |
| Technical colleague | Plain English first; at most one code name per bullet, in backticks. |
| Handover to another engineer or agent | As technical; the More line points at the ticket or PR that holds the rest. |

## Compression rules

- More than three named things becomes a count plus one example: "8 Royal Mail forms, e.g. James & James".
- Numbers and dates appear only when they change what the reader does.
- One verb per bullet. A bullet that needs "and" is two bullets or half a bullet.
- Only facts present in the source. Reassurance you cannot point to in the source is left out, including "no customer impact".
- Sequence of events, root-cause chains, test counts and review history live behind the More line.
- No greetings, thanks, sign-offs or apologies beyond what the email rule allows.

## Example

Reader: non-technical manager, Slack.

**Invoice uploads are working again.**
- Uploads over 10 MB failed silently since Tuesday's release.
- The upload gateway's size limit was lower than the app's.
- Both limits now come from one setting, raised to 25 MB.
- Live since 14:10; the 6 failed uploads re-ran on their own.
- Nothing for you to do.
- Details: INV-412.

Same fix, reader: engineer, thread reply.

**Gateway capped bodies at 8 MB; app allowed 25 MB.**
- Nginx returned 413 before the app saw the request, so no app log.
- Raised `client_max_body_size` and moved both limits to one config value.
- Added a 20 MB upload to the smoke suite.
- Retried the 6 stuck uploads by hand.
- Diff and log excerpt: PR #412.

## Self-check before sending

- Headline alone tells the reader the state of the world?
- Action findable without reading the middle?
- Any bullet with a comma-chained second idea? Split it.
- Any name, number or claim this reader will not recognise or you cannot source? Cut it.
- Line count and word cap met?

Tone: **REQUIRED SUB-SKILL** pm-humanizer when the result still sounds generated.
