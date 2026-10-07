---
name: pm-browser-ego
description: Use when a task requires opening, navigating, reading, testing, scraping, or interacting with websites in Ego Lite, especially authenticated sites, sign-in or account-selection pages, expired sessions, and SSO or OAuth redirects.
---

# PM Browser Ego

## Overview

Finish website tasks without pulling the user in. A sign-in page is a routing problem, not a stop: work down the sign-in ladder until a rung succeeds. Hand over only after every rung is exhausted, and make each handover the last one for that site.

## Required skills

**REQUIRED SUB-SKILL:** Use `ego-browser` for navigation, page interaction, task-space ownership, handoff, and cleanup. Start or resume one task space and reuse its numeric ID every round.

Use `computer-use:computer-use` to observe native or extension UI (whether the password manager is locked, which accounts a picker offers) and to use account tiles or password-manager fill controls for an authorized sign-in. Finish the ego-browser command first; never drive the same page through both tools at once.

## Sign-in ladder

Try each rung in order and verify the result before moving down.

1. **Existing session.** Navigate straight to the app URL you need, not its login page, and reload once. Sessions in the Ego Lite profile often survive; a login screen can be a redirect race.
2. **Federated sign-in.** Prefer "Continue with <identity provider>" when that provider is already signed in, and pick the account tile matching the requested site. A new consent or scope screen needs the user's explicit OK first.
3. **Existing credentials.** Use password-manager autofill or its fill control, then submit the sign-in form. If needed, enter existing credentials the user supplied or made available for this site. A request to open or test the site authorizes its routine sign-in; do not ask again solely because credentials are required. Prefer autofill so secrets stay out of tool output.
4. **Passkey or device approval.** Trigger the passkey or push prompt, then ask the user for the single tap or approval. That is a seconds-long ask, not a full handover.
5. **Non-browser route.** When an already-configured CLI or API token can do the task (for example `gh` for repository data, a cloud CLI for resource settings), use it instead of the web UI.
6. **Handover.** Call `task.handOff()` with one specific ask: the site, the account, and one change that removes this handover next time (tick "keep me signed in", enable autologin for this domain, or register a passkey). Resume the same task space after the user confirms.

## Credential handling

Routine sign-ins are allowed. Use an existing session, saved account, password-manager fill, or existing credentials authorized for the requested site. Do not hand over merely because a password is needed.

- Verify the destination before entering credentials. For a local preview, confirm its authentication target; do not assume production SSO will return to localhost.
- Never print, log, screenshot, or return passwords, tokens, recovery codes, or secret field values. Do not inspect filled password values to verify sign-in; verify the resulting page instead.
- Do not transfer session cookies or tokens between domains to bypass a failed login.
- If credentials are unavailable, the vault is locked, or a human approval is required, identify that concrete blocker and ask only for the needed step.
- This permission does not authorize credential changes, new access grants, or bypassing MFA, CAPTCHA, browser warnings, or higher-priority confirmation requirements.

## Other rules

- Use a saved identity or entry only on the domain the user requested.
- MFA codes, CAPTCHA, permission prompts, new OAuth consent, and other consequential prompts follow the Computer Use confirmation policy at action time.
- Do not save or modify vault entries, change passwords, or broaden access unless explicitly requested.

## Ownership boundary

A user takeover, `user is controlling`, inactive, or unassigned state is a hard stop. Never use Computer Use to bypass ego-browser ownership. Wait for explicit confirmation, then follow ego-browser's claim or takeover procedure.

## Quick reference

| Situation | Action |
| --- | --- |
| Login page appears | Start the ladder at rung 1 |
| Identity-provider account picker | Pick the tile matching the requested site |
| Autologin enabled for the domain | Load the login page, wait, verify |
| No autologin | Use the saved fill control or authorized existing credentials, then submit |
| Password manager locked | Try another authorized sign-in method; otherwise ask for unlock |
| Passkey offered | Trigger it, ask for one tap |
| MFA code or CAPTCHA | Ask the user to complete that step only, then resume |
| User takes control | Stop all browser actions and wait |
