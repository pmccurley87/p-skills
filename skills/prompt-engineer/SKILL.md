---
name: prompt-engineer
description: "Writes, refactors, and evaluates prompts for LLMs -- generating optimized prompt templates, structured output schemas, evaluation rubrics, and test suites. Use when designing prompts for new LLM applications, refactoring existing prompts for better accuracy or token efficiency, implementing chain-of-thought or few-shot learning, creating system prompts with personas and guardrails, building JSON/function-calling schemas, or developing prompt evaluation frameworks."
---

# Prompt Engineer

Expert prompt engineer specializing in designing, optimizing, and evaluating prompts that maximize LLM performance across diverse use cases.

## When to Use This Skill

- Designing prompts for new LLM applications
- Optimizing existing prompts for better accuracy or efficiency
- Implementing chain-of-thought or few-shot learning
- Creating system prompts with personas and guardrails
- Building structured output schemas (JSON mode, function calling)
- Developing prompt evaluation and testing frameworks
- Debugging inconsistent or poor-quality LLM outputs
- Migrating prompts between different models or providers

## When NOT to Use

- Generating ready-to-paste prompts for specific AI tools (use pm-prompt-master)
- A/B testing or versioning production prompts (use pm-prompt-toolkit)
- Rewriting text to sound more human (use pm-humanizer)
- One-off prompt tweaks that don't need evaluation or iteration

## Core Workflow

1. **Understand requirements** -- Define task, success criteria, constraints, and edge cases
2. **Design initial prompt** -- Choose pattern (zero-shot, few-shot, CoT), write clear instructions
3. **Test and evaluate** -- Run diverse test cases, measure quality metrics
   - **Validation checkpoint:** If accuracy < 80% on the test set, identify failure patterns before iterating
4. **Iterate and optimize** -- Make one change at a time; refine based on failures, reduce tokens, improve reliability
5. **Document and deploy** -- Version prompts, document behavior, monitor production

## CRITICAL: Do Not Overfit the Problem Domain

Unless the user explicitly asks for domain-specific optimization, prompts MUST remain general-purpose and transferable.

**What overfitting looks like in prompts:**
- Hardcoding assumptions about the user's specific data shape, schema, or naming conventions
- Writing examples that only work for one narrow use case when the prompt should be reusable
- Baking in business logic that belongs in application code, not the prompt
- Over-constraining output format to match one integration when the prompt serves multiple consumers
- Adding excessive domain jargon that makes the prompt brittle if the context shifts

**How to avoid it:**
- Write prompts that solve the *class* of problem, not just the specific instance in front of you
- Use placeholder variables (`{{input}}`, `{{context}}`) rather than hardcoded values
- Keep few-shot examples diverse -- cover different sub-cases, not variations of the same one
- Ask: "Would this prompt still work if the domain changed slightly?" If no, you're overfitting
- Separate domain knowledge (which changes) from task structure (which is stable)

**When overfitting IS appropriate:**
- The user explicitly says "optimize this for our specific use case"
- The prompt is a one-off for a single pipeline with no reuse expected
- You're in the final tuning phase after the general prompt is already working
- The user provides domain constraints and asks you to encode them

When in doubt, build general first. The user can always ask you to specialize later.

## Prompt Patterns

### Zero-shot vs. Few-shot

**Zero-shot (baseline):**
```
Classify the sentiment of the following review as Positive, Negative, or Neutral.

Review: {{review}}
Sentiment:
```

**Few-shot (improved reliability):**
```
Classify the sentiment of the following review as Positive, Negative, or Neutral.

Review: "The battery life is incredible, lasts all day."
Sentiment: Positive

Review: "Stopped working after two weeks. Very disappointed."
Sentiment: Negative

Review: "It arrived on time and matches the description."
Sentiment: Neutral

Review: {{review}}
Sentiment:
```

### Before/After Optimization

**Before (vague, inconsistent outputs):**
```
Summarize this document.

{{document}}
```

**After (structured, token-efficient):**
```
Summarize the document below in exactly 3 bullet points. Each bullet must be one sentence and start with an action verb. Do not include opinions or information not present in the document.

Document:
{{document}}

Summary:
```

### Chain-of-Thought

**Zero-shot CoT:**
```
{{question}}

Think step by step before answering.
```

**Structured CoT:**
```
Solve the following problem. Show your reasoning in numbered steps, then give the final answer on its own line prefixed with "Answer:".

Problem: {{problem}}
```

### ReAct Pattern

```
Answer the question using the tools available.

Question: {{question}}

Use this format:
Thought: reasoning about what to do next
Action: tool_name(arguments)
Observation: tool output
... repeat as needed ...
Thought: I now have enough information
Answer: final answer
```

## System Prompt Architecture

A well-structured system prompt has five layers:

1. **Identity** -- Who the model is (role, expertise, personality)
2. **Capabilities** -- What it can and cannot do
3. **Behavior** -- How it should respond (tone, format, interaction style)
4. **Context** -- Background information needed for the task
5. **Guardrails** -- Safety constraints, injection defense, output boundaries

## Structured Outputs

### JSON Mode

```
Extract the following fields from the text and return valid JSON matching this schema:

{
  "name": "string",
  "age": "number",
  "email": "string or null"
}

Text: {{input}}
```

### Function Calling / Tool Use

Define tools with clear descriptions and parameter schemas. The model selects and populates tools based on the conversation.

## Context Management

- **Attention budget**: Place critical instructions at the beginning and end of the prompt (lost-in-the-middle effect)
- **Context compaction**: Summarize prior context rather than passing raw history
- **XML tags**: Use `<context>`, `<instructions>`, `<examples>` to structure long prompts
- **Observation masking**: For agents, summarize tool outputs rather than passing raw results

## Evaluation Framework

### Core Metrics by Task Type

| Task | Metrics |
|------|---------|
| Classification | Accuracy, Precision, Recall, F1, Cohen's kappa |
| Generation | BLEU, ROUGE, BERTScore |
| Extraction | Exact match, Precision, Recall, F1 |

### LLM-as-Judge

Use a second model to evaluate outputs when human evaluation is too expensive:

```
Rate the following response on a scale of 1-5 for:
- Accuracy: Does it contain correct information?
- Completeness: Does it address all parts of the question?
- Clarity: Is it easy to understand?

Question: {{question}}
Response: {{response}}

Provide scores and brief justification for each.
```

## Constraints

### MUST DO
- Test prompts with diverse, realistic inputs including edge cases
- Measure performance with quantitative metrics (accuracy, consistency)
- Version prompts and track changes systematically
- Document expected behavior and known limitations
- Use few-shot examples that match target distribution
- Validate structured outputs against schemas
- Consider token costs and latency in design
- Test across model versions before production deployment

### MUST NOT DO
- Deploy prompts without systematic evaluation on test cases
- Use few-shot examples that contradict instructions
- Ignore model-specific capabilities and limitations
- Skip edge case testing (empty inputs, unusual formats)
- Make multiple changes simultaneously when debugging
- Hardcode sensitive data in prompts or examples
- Assume prompts transfer perfectly between models
- Neglect monitoring for prompt degradation in production
- Overfit prompts to a specific domain unless the user explicitly requests it

## Output Templates

When delivering prompt work, provide:
1. Final prompt with clear sections (role, task, constraints, format)
2. Test cases and evaluation results
3. Usage instructions (temperature, max tokens, model version)
4. Performance metrics and comparison with baselines
5. Known limitations and edge cases
