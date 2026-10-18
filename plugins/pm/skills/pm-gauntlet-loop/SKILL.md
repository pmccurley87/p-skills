---
name: pm-gauntlet-loop
description: Write or run a gauntlet loop that improves an artifact against a concrete reference using a builder and an independent critic. Use for requests to gauntlet a plan, prompt, design, implementation or analysis, or to loop until it beats a specified bar.
---

# Gauntlet Loop

Turn the user's goal into a short, paste-ready improvement prompt. If they explicitly ask to run it or continue an existing loop, execute it within the authorized scope instead of stopping at a prompt.

## Choose the bar

Use the user's reference when supplied. A bar must be named, obtainable and comparable: a specific artifact, implementation, live screen or current revision, not an imagined category such as “world-class design.” Obtain the actual reference before judging. For an existing system, its current behavior and contracts can be the baseline, with explicit desired improvements and regressions to avoid.

If there is no usable reference, offer two or three concrete options and wait for the choice. Do independent discovery while waiting if useful. Include a measurable criterion when relevant, such as first-audible latency, validity, comprehension or task completion. Do not silently lower the bar when a candidate loses.

## Write the prompt

Return one short block, normally about 120–180 words. Adapt the template to the task; do not add architecture, tools, file layouts, fixed round counts or a stack the user did not ask for. Include a budget only if the user specified one. Under the block, say “I can run this here.” Skip that offer when already asked to execute.

```text
Improve [GOAL] against [CONCRETE REFERENCE AND SUCCESS CRITERIA]. Obtain and inspect the actual reference first.

Break the work into pieces that can be improved and judged independently. Give a builder each piece and a separate critic fresh context. Have the critic inspect the actual result against the reference, choose which better meets the agreed bar, and identify the most consequential remaining gap. Strip labels and randomize order where a blind comparison is feasible; disclose when it is not.

Return evidence-backed gaps to the builder and repeat. Preserve failures and rejected versions. Do not stop merely because a fixed number of rounds has elapsed or the critic gives a flattering score. Finish when the result meets the bar without material regressions. If a missing capability, evidence or authorization prevents progress, report that limit rather than manufacturing a win.

Keep a concise progress record. Delegate builders and independent critics within the authorized scope.
```

## When running

The lead owns the bar, versioned artifacts and final judgment. The builder must not certify its own work. Critics need the actual candidate, reference, relevant contracts and evidence, but not the builder's persuasive rationale or earlier verdicts on their first pass. Omit secrets and unnecessary personal data.

Use fresh cases or held-out inputs where repeated improvement risks fitting only known examples. Keep comparison conditions matched. For prompts, include the full assembled request and tool/schema descriptions, not just one system string. For UI, compare matching viewports and states. Distinguish a source review from an executed test and from real user outcomes.

Adjudicate criticism against the artifact and evidence. “Harsh” means specific and demanding, not inventing defects, requiring needless complexity or rejecting useful behavior to satisfy an arbitrary checklist. Ask for the biggest material gap, not a quota of findings. Preserve accepted and rejected findings with reasons.

Continue while a concrete repair and meaningful recheck are available. Respect user limits and interruption; report an unresolved bar honestly when further work needs unavailable inputs or merely repeats speculative criticism. A reviewer preference alone does not prove improved correctness, learning or performance. Deployment, publication and destructive actions remain governed by the user's authorization.

Use the host's supported agent tools. This is an active work loop, not a request to create a recurring `/loop` automation or rely on an unavailable `ultracode` command.

## Compose with pm-adversary

When the user also requests `pm-adversary`, load [its instructions](../pm-adversary/SKILL.md). Gauntlet still owns the reference, builder and iteration. Adversary supplies Astra and Opus 5.5 as independent critics of the same candidate. Do not start a second nested improvement loop or assume the two agreeing replaces verification.
