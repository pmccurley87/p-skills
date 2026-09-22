export const PATTERNS = Object.freeze({
  triage_worker: 'Cheap triage → selected worker',
  discovery_implement: 'Parallel discovery → one implementer',
  implement_review_repair: 'Implement → independent review → repair',
  parallel_implementation: 'Independent implementation tasks → integration',
  research_synthesis: 'Parallel research → synthesis',
});

export const TRIAGE_SCHEMA = Object.freeze({
  type: 'object',
  additionalProperties: false,
  required: [
    'taskType',
    'size',
    'recommendedPattern',
    'worker',
    'reason',
    'uncertainties',
    'needsClarification',
  ],
  properties: {
    taskType: {
      type: 'string',
      enum: ['implementation', 'investigation', 'review', 'research', 'documentation', 'other'],
    },
    size: {type: 'string', enum: ['small', 'medium', 'large', 'unknown']},
    recommendedPattern: {type: 'string', enum: Object.keys(PATTERNS)},
    worker: {type: 'string', enum: ['codex', 'claude']},
    reason: {type: 'string', minLength: 1, maxLength: 800},
    uncertainties: {type: 'array', items: {type: 'string', minLength: 1}, maxItems: 10},
    needsClarification: {type: 'boolean'},
  },
});

export function validateDecision(value) {
  const allowedKeys = new Set(TRIAGE_SCHEMA.required);
  const fail = message => { throw new Error(`Invalid triage decision: ${message}`); };
  if (!value || typeof value !== 'object' || Array.isArray(value)) fail('expected object');
  for (const key of Object.keys(value)) if (!allowedKeys.has(key)) fail(`unexpected field ${key}`);
  for (const key of allowedKeys) if (!(key in value)) fail(`missing field ${key}`);
  if (!TRIAGE_SCHEMA.properties.taskType.enum.includes(value.taskType)) fail('invalid taskType');
  if (!TRIAGE_SCHEMA.properties.size.enum.includes(value.size)) fail('invalid size');
  if (!TRIAGE_SCHEMA.properties.recommendedPattern.enum.includes(value.recommendedPattern)) fail('invalid recommendedPattern');
  if (!TRIAGE_SCHEMA.properties.worker.enum.includes(value.worker)) fail('invalid worker');
  if (typeof value.reason !== 'string' || value.reason.length < 1 || value.reason.length > 800) fail('invalid reason');
  if (!Array.isArray(value.uncertainties) || value.uncertainties.length > 10
    || !value.uncertainties.every(item => typeof item === 'string' && item.length > 0)) fail('invalid uncertainties');
  if (typeof value.needsClarification !== 'boolean') fail('invalid needsClarification');
  return value;
}

export function eligibility(decision, {preferredWorker = null} = {}) {
  const worker = preferredWorker ?? decision.worker;
  if (!['codex', 'claude'].includes(worker)) {
    return {eligible: false, reason: 'unsupported_worker', worker: null};
  }
  if (decision.recommendedPattern !== 'triage_worker') {
    return {eligible: false, reason: 'pattern_not_enabled', worker};
  }
  if (decision.size === 'large') {
    return {eligible: false, reason: 'scope_too_large', worker};
  }
  if (decision.size === 'unknown') {
    return {eligible: false, reason: 'scope_unknown', worker};
  }
  if (decision.needsClarification) {
    return {eligible: false, reason: 'needs_clarification', worker};
  }
  if (decision.uncertainties.length > 0) {
    return {eligible: false, reason: 'material_uncertainty', worker};
  }
  return {eligible: true, reason: 'eligible', worker};
}
