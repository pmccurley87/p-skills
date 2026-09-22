import test from 'node:test';
import assert from 'node:assert/strict';

import {main, stateRunsDir} from '../bin/pilot.mjs';

const packet = {
  task: 'Create one bounded file.',
  contextSummary: 'Synthetic.',
  acceptance: ['Test passes.'],
  allowedPaths: ['orca-setup/pilot/demo/result.mjs'],
  preferredWorker: null,
};
const decision = {
  taskType: 'implementation', size: 'small', recommendedPattern: 'triage_worker',
  worker: 'codex', reason: 'bounded', uncertainties: [], needsClarification: false,
};

function memoryStore(seed = null) {
  let record = seed;
  return {
    released: 0,
    async createRecord(value) { record = {id: '11111111-1111-4111-8111-111111111111', ...value}; return record; },
    async readRecord() { return structuredClone(record); },
    async updateRecord(_id, fn) { record = await fn(structuredClone(record)); return record; },
    async releaseLock() { this.released += 1; },
  };
}

test('portable state lives outside the installed skill and is scoped per workspace', () => {
  const first = stateRunsDir('/workspace/one', {env: {XDG_STATE_HOME: '/state'}, home: '/home/test'});
  const second = stateRunsDir('/workspace/two', {env: {XDG_STATE_HOME: '/state'}, home: '/home/test'});
  assert.match(first, /^\/state\/pm-orca-triage\/[0-9a-f]{16}\/runs$/);
  assert.notEqual(first, second);
});

test('triage command records a decision without starting a worker', async () => {
  const store = memoryStore();
  let starts = 0;
  const outputs = [];
  const result = await main(['triage', '--input', '/fixture/task.json'], {
    store,
    readFileImpl: async () => JSON.stringify(packet),
    loadKeyFn: async () => 'key',
    triageFn: async () => ({decision, requestedModel: 'meta/muse-spark-1.3-contributor'}),
    startFn: async () => { starts += 1; },
    writeOut: value => outputs.push(value),
    env: {ORCA_WORKTREE_ID: 'folder:expected'},
  });
  assert.equal(result.state, 'triaged');
  assert.equal(result.eligibility.eligible, true);
  assert.equal(starts, 0);
  assert.match(outputs[0], /triaged/);
});

test('start command delegates exactly once through the guarded start function', async () => {
  const seed = {id: '11111111-1111-4111-8111-111111111111', state: 'triaged'};
  const store = memoryStore(seed);
  let starts = 0;
  const result = await main(['start', '--record', seed.id], {
    store,
    startFn: async record => { starts += 1; return {...record, state: 'active'}; },
    writeOut: () => {},
  });
  assert.equal(result.state, 'active');
  assert.equal(starts, 1);
});

test('finish requires passing evidence and proven released worker cleanup', async () => {
  const seed = {
    id: '11111111-1111-4111-8111-111111111111', state: 'active',
    workspaceRoot: process.cwd(), orca: {runId: 'run-1', dispatchId: 'ctx-1'},
  };
  const store = memoryStore(seed);
  const evidenceFiles = new Map([
    ['/bad.json', JSON.stringify({outcome: 'verified', checks: [], artifactPaths: []})],
    ['/good.json', JSON.stringify({
      outcome: 'verified',
      checks: [{name: 'tests', passed: true, evidence: '4 tests passed'}],
      artifactPaths: ['orca-setup/pilot/demo/result.mjs'],
    })],
  ]);
  await assert.rejects(
    main(['finish', '--record', seed.id, '--evidence', '/bad.json'], {
      store, readFileImpl: async path => evidenceFiles.get(path), writeOut: () => {},
      orca: async () => ({ok: true, result: {workers: []}}),
    }),
    error => error.code === 'evidence_invalid',
  );
  const result = await main(['finish', '--record', seed.id, '--evidence', '/good.json'], {
    store, readFileImpl: async path => evidenceFiles.get(path), writeOut: () => {},
    orca: async () => ({ok: true, result: {workers: [{dispatchId: 'ctx-1', terminalState: 'released'}]}}),
  });
  assert.equal(result.state, 'verified');
  assert.equal(store.released, 1);
});

test('finish preserves ownership when worker cleanup is not proven', async () => {
  const seed = {
    id: '11111111-1111-4111-8111-111111111111', state: 'active',
    workspaceRoot: process.cwd(), orca: {runId: 'run-1', dispatchId: 'ctx-1'},
  };
  const store = memoryStore(seed);
  const evidence = JSON.stringify({
    outcome: 'failed',
    checks: [{name: 'tests', passed: false, evidence: 'failed'}],
    artifactPaths: [],
  });
  await assert.rejects(
    main(['finish', '--record', seed.id, '--evidence', '/evidence.json'], {
      store, readFileImpl: async () => evidence, writeOut: () => {},
      orca: async () => ({ok: true, result: {workers: [{dispatchId: 'ctx-1', terminalState: 'active'}]}}),
    }),
    error => error.code === 'cleanup_not_proven',
  );
  assert.equal(store.released, 0);
});
