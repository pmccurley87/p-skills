---
name: smart-orchestration
description: Use when a task has separable work and the user wants to reduce expensive model tokens or finish faster through cost-aware sub-agent delegation.
---

# Smart Orchestration

Optimize total token cost and time to a correct result, including dispatch, retries, integration, and review. The current agent remains responsible for the user's goal; a capable host such as Astra or Sol may delegate bounded work to cheaper models.

## Decide whether to delegate

At each meaningful phase, identify work a fresh agent can finish independently with a clear deliverable and check. Delegate when that is likely to save capable-model context or wall time after coordination costs. Keep a short task local when the packet and review would cost as much as doing it. Do not create agents merely to meet a quota.

Good packets include focused repository discovery, source gathering, routine implementation with a fixed contract, targeted tests, and independent review. Keep ambiguous requirements, architecture, cross-cutting decisions, high-risk changes, and final acceptance with the host. Parallelize only independent packets; overlapping edits or shared mutable resources run serially.

## Choose a model per packet

Check the models and tools actually available at dispatch. Choose the least costly model likely to complete each packet correctly: a low-cost model for retrieval and mechanical work, a balanced model for bounded reasoning or implementation, and a stronger model only when the packet genuinely requires it. Do not assume that a model's price, speed, or availability is fixed. If explicit model selection is unavailable, use the available agent without claiming a saving.

When selecting a host or worker, set these minimum reasoning efforts explicitly: Luna at **high** or **max**; Terra at **medium** or higher; Sol at **medium** or higher. Choose higher effort when the packet needs it. If the dispatch tool cannot select or verify the required effort, do not dispatch that model for the packet; choose another available configuration or keep the work with the current host. Do not claim to have changed an already running host's settings.

Give workers only the necessary context, files, constraints, and expected output. Ask for a concise result with evidence rather than a transcript. Avoid duplicating the whole conversation in each agent. The host reviews outputs, resolves conflicts, verifies the integrated result, and owns any external action. If delegation fails or needs repeated repair, reassess the model or take the work back; do not keep paying for retries without a clear path to completion.

Follow explicit user choices about models, budget, delegation, and deadlines. Never invent token or cost savings; report measured figures only when available.
