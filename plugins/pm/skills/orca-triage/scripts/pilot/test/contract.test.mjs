import test from 'node:test';
import assert from 'node:assert/strict';

import {
  PATTERNS,
  TRIAGE_SCHEMA,
  eligibility,
  validateDecision,
} from '../src/contract.mjs';

const base = {
  taskType: 'implementation',
  size: 'small',
  recommendedPattern: 'triage_worker',
  worker: 'codex',
  reason: 'One bounded utility with explicit acceptance tests.',
  uncertainties: [],
  needsClarification: false,
};

test('accepts a complete executable triage decision', () => {
  assert.deepEqual(validateDecision(base), base);
  assert.deepEqual(eligibility(base), {
    eligible: true,
    reason: 'eligible',
    worker: 'codex',
  });
});

test('publishes the five stable orchestration patterns', () => {
  assert.deepEqual(Object.keys(PATTERNS), [
    'triage_worker',
    'discovery_implement',
    'implement_review_repair',
    'parallel_implementation',
    'research_synthesis',
  ]);
  assert.equal(TRIAGE_SCHEMA.additionalProperties, false);
});

test('blocks patterns that are recommendations only', () => {
  assert.equal(
    eligibility({...base, recommendedPattern: 'research_synthesis'}).reason,
    'pattern_not_enabled',
  );
});

test('blocks large, uncertain, and clarification-dependent work', () => {
  assert.equal(eligibility({...base, size: 'large'}).reason, 'scope_too_large');
  assert.equal(
    eligibility({...base, uncertainties: ['Unknown target']}).reason,
    'material_uncertainty',
  );
  assert.equal(
    eligibility({...base, needsClarification: true}).reason,
    'needs_clarification',
  );
});

test('rejects unknown workers and extra command fields', () => {
  assert.throws(() => validateDecision({...base, worker: 'opencode'}), /invalid triage decision/i);
  assert.throws(() => validateDecision({...base, command: 'touch unexpected'}), /invalid triage decision/i);
});

test('explicit supported worker preference overrides the recommendation', () => {
  assert.deepEqual(eligibility(base, {preferredWorker: 'claude'}), {
    eligible: true,
    reason: 'eligible',
    worker: 'claude',
  });
});

test('rejects unsupported preferred workers', () => {
  assert.deepEqual(eligibility(base, {preferredWorker: 'opencode'}), {
    eligible: false,
    reason: 'unsupported_worker',
    worker: null,
  });
});
