# ensure-closed-loop — Baseline (RED) findings

Three baseline agents (general-purpose, superpowers environment) were asked to lay
out their concrete approach to a task **without** the ensure-closed-loop skill.
Because the superpowers skills are loaded, baseline behavior is already strong —
which sharpens what this skill must uniquely add.

## What baseline agents already do well
- Reproduce / run the thing before editing (all three).
- Observe results — console, network, manual job runs, screenshots.
- Form a hypothesis from a signal rather than guessing.
- Scenario C defines success criteria before coding (vague-task instinct).
- Scenario B correctly **drops UI/auth** for a backend job and reaches for
  scheduler logs — the "adapt, don't obey" instinct exists naturally.

## Gaps the skill must close (verbatim-grounded)
1. **Logging is not a deliberate prerequisite.** No agent set up a queryable log
   channel (none mentioned victorialogs or "confirm I can query logs") as a
   setup step before looping. They reach for logs reactively, not as a
   pre-established observability channel.
2. **No explicit readiness gate.** None stated "confirm all channels are working,
   and STOP if any required one isn't, before I start iterating."
3. **Auth channel absent.** No agent treated getting-past-login (or attaching to
   a browser with existing cookies) as a setup channel.
4. **No formal goal anchor.** "Done" is defined informally; none invoke a `/goal`
   skill to pin observable exit criteria as an artifact.

## Implication for the skill
The skill's value over the strong baseline is *systematizing the preflight*:
logging as a first-class channel (prefer victorialogs), the explicit readiness
gate before the loop starts, the auth channel, and the `/goal` anchor — while
preserving the already-good run/observe/investigate/iterate behavior and the
adapt-don't-obey instinct.
