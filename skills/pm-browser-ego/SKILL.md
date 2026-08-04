---
name: pm-browser-ego
description: Use when a task requires opening, navigating, reading, testing, scraping, or interacting with websites in Ego Lite, especially authenticated sites, sign-in pages, expired sessions, and workflows where saved LastPass credentials may be available.
---

# PM Browser Ego

## Overview

Use ego-browser for web automation. When authentication UI appears, proactively operate LastPass through Computer Use while keeping secrets inside LastPass and preserving task-space ownership.

## Required skills

**REQUIRED SUB-SKILL:** Use `ego-browser` for navigation, page interaction, task-space ownership, handoff, and cleanup.

**REQUIRED SUB-SKILL:** Use `computer-use:computer-use` for LastPass and native Ego Lite UI.

Read and follow both skills before acting. This skill adds orchestration; it does not replace either skill's safety or confirmation rules.

## Workflow

1. Start or resume one ego-browser task space. Save its numeric ID for every later round.
2. Use ego-browser for normal page work and observe after meaningful actions.
3. When sign-in, account-selection, expired-session, or reauthentication UI appears, proactively switch to Computer Use. Check LastPass before asking the user to sign in.
4. Finish the ego-browser command first. Never drive the same page concurrently through both tools.
5. Inspect fresh Ego Lite UI, open LastPass, select the entry matching the requested domain, and invoke its fill or sign-in control.
6. Verify the result, resume the same ego-browser task space, verify authentication, and continue with ego-browser. Apply its cleanup rules when done.

## Authentication rules

- Keep secrets inside LastPass. Never reveal, extract, copy, print, log, return, or inspect passwords, one-time codes, recovery codes, or secret field values.
- Use LastPass fill controls. Do not read password fields through DOM, JavaScript, CDP, accessibility text, screenshots, or the clipboard.
- Treat a user-requested site as authorization to log into that destination. Do not use a saved entry on a different domain without explicit user approval.
- If LastPass is locked, requests its master password, lacks a matching entry, or needs manual input, hand off and state what the user must complete. Resume only after explicit confirmation.
- Follow the Computer Use confirmation policy at action time for MFA, CAPTCHA, permission prompts, sensitive-data transmission, credential saving, and other consequential actions.
- Do not save or modify vault entries, change passwords, or broaden access unless explicitly requested and confirmed as required.

## Ownership boundary

A user takeover, `user is controlling`, inactive, or unassigned state is a hard stop. Never use Computer Use to bypass ego-browser ownership. Wait for explicit confirmation, then follow ego-browser's claim or takeover procedure.

## Quick reference

| Situation | Action |
| --- | --- |
| Site is already authenticated | Continue with ego-browser |
| Sign-in UI appears | Proactively try LastPass through Computer Use |
| LastPass fills successfully | Verify, resume the same task space, continue |
| LastPass is locked or missing an entry | Hand off to the user |
| MFA, CAPTCHA, or consequential prompt | Apply Computer Use confirmation policy |
| User takes control | Stop all browser actions and wait |
