import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';

import {buildWorkerSpec, callOrca, startSelectedWorker} from '../src/orca.mjs';

async function fixtureRecord(overrides = {}) {
  const workspaceRoot = await mkdtemp(join(tmpdir(), 'orca-pilot-workspace-'));
  return {
    id: '11111111-1111-4111-8111-111111111111',
    state: 'triaged',
    packet: {
      task: 'Create a bounded file with literal $(touch nope) and `also-nope` text.',
      contextSummary: 'Synthetic test.',
      acceptance: ['A test passes.'],
      allowedPaths: ['demo/result.mjs'],
      preferredWorker: null,
    },
    triage: {decision: {worker: 'codex'}},
    eligibility: {eligible: true, reason: 'eligible', worker: 'codex'},
    workspaceRoot,
    workspaceSelector: 'folder:expected',
    ...overrides,
  };
}

function fakeStore(record) {
  let current = structuredClone(record);
  return {
    locks: 0,
    releases: 0,
    async acquireLock() { this.locks += 1; },
    async releaseLock() { this.releases += 1; },
    async updateRecord(_id, updater) {
      current = {...await updater(structuredClone(current))};
      return current;
    },
    async readRecord() { return structuredClone(current); },
  };
}

test('callOrca passes literal argument arrays without a shell', async () => {
  let invocation;
  const execFileImpl = async (file, args, options) => {
    invocation = {file, args, options};
    return {stdout: '{"ok":true,"result":{}}', stderr: ''};
  };
  const dangerous = 'literal $(touch nope) `also-nope`\nnext';
  const result = await callOrca(['terminal', 'send', '--text', dangerous, '--json'], {
    execFileImpl,
    executable: '/fixture/orca',
  });
  assert.equal(result.ok, true);
  assert.deepEqual(invocation.args, ['terminal', 'send', '--text', dangerous, '--json']);
  assert.equal(invocation.options.shell, false);
});

test('builds a worker spec from original task and coordinator acceptance', async () => {
  const record = await fixtureRecord();
  const spec = buildWorkerSpec(record);
  assert.match(spec, /\$\(touch nope\)/);
  assert.match(spec, /A test passes/);
  assert.match(spec, /demo\/result\.mjs/);
  assert.match(spec, /Do not modify acceptance tests/);
});

test('blocked decisions and workspace mismatches launch nothing', async () => {
  for (const record of [
    await fixtureRecord({eligibility: {eligible: false, reason: 'pattern_not_enabled', worker: 'codex'}}),
    await fixtureRecord(),
  ]) {
    const calls = [];
    const store = fakeStore(record);
    const result = await startSelectedWorker(record, {
      orca: async args => { calls.push(args); return {}; },
      store,
      env: {ORCA_WORKTREE_ID: record.eligibility.eligible ? 'folder:wrong' : 'folder:expected'},
    });
    assert.equal(result.state, 'blocked');
    assert.equal(calls.length, 0);
    assert.equal(store.locks, 0);
  }
});

test('refuses to replace an existing coordinator run with live work', async () => {
  const record = await fixtureRecord();
  const calls = [];
  const store = fakeStore(record);
  const orca = async args => {
    calls.push(args);
    const command = args.slice(0, 2).join(' ');
    if (command === 'status --json') return {ok: true, result: {runtime: {state: 'ready'}, graph: {state: 'ready'}}};
    if (command === 'orchestration run-list') return {ok: true, result: {runs: [{id: 'existing', coordinator_handle: 'term-me'}]}};
    if (command === 'orchestration worker-list') return {ok: true, result: {workers: [{dispatchStatus: 'dispatched'}]}};
    throw new Error(`unexpected ${args.join(' ')}`);
  };
  const result = await startSelectedWorker(record, {
    orca, store, env: {ORCA_WORKTREE_ID: 'folder:expected', ORCA_TERMINAL_HANDLE: 'term-me'},
  });
  assert.equal(result.state, 'blocked');
  assert.equal(result.blockReason, 'coordinator_busy');
  assert.equal(calls.some(args => args[1] === 'worker-start'), false);
  assert.equal(store.releases, 1);
});

test('creates one run and starts exactly one selected worker', async () => {
  const record = await fixtureRecord();
  const calls = [];
  const store = fakeStore(record);
  const orca = async args => {
    calls.push(args);
    const command = args.slice(0, 2).join(' ');
    if (command === 'status --json') return {ok: true, result: {runtime: {state: 'ready'}, graph: {state: 'ready'}}};
    if (command === 'orchestration run-list') return {ok: true, result: {runs: []}};
    if (command === 'orchestration run-create') return {ok: true, result: {run: {id: 'run-new'}}};
    if (command === 'orchestration worker-start') return {
      ok: true,
      result: {state: 'ready', runId: 'run-new', taskId: 'task-new', dispatchId: 'ctx-new', mutation: {requestId: 'request-new'}},
    };
    throw new Error(`unexpected ${args.join(' ')}`);
  };
  const result = await startSelectedWorker(record, {
    orca, store, env: {ORCA_WORKTREE_ID: 'folder:expected', ORCA_TERMINAL_HANDLE: 'term-me'},
  });
  assert.equal(result.state, 'active');
  assert.equal(result.orca.dispatchId, 'ctx-new');
  const starts = calls.filter(args => args[0] === 'orchestration' && args[1] === 'worker-start');
  assert.equal(starts.length, 1);
  assert.equal(starts[0][starts[0].indexOf('--agent') + 1], 'codex');
  assert.equal(starts[0][starts[0].indexOf('--worktree') + 1], 'folder:expected');
});

test('preserves the lock and launch-attempt record after an ambiguous worker-start failure', async () => {
  const record = await fixtureRecord();
  const store = fakeStore(record);
  const orca = async args => {
    const command = args.slice(0, 2).join(' ');
    if (command === 'status --json') return {ok: true, result: {runtime: {state: 'ready'}, graph: {state: 'ready'}}};
    if (command === 'orchestration run-list') return {ok: true, result: {runs: []}};
    if (command === 'orchestration run-create') return {ok: true, result: {run: {id: 'run-new'}}};
    if (command === 'orchestration worker-start') {
      const error = new Error('connection lost');
      error.code = 'orca_command_failed';
      throw error;
    }
    throw new Error('unexpected');
  };
  const result = await startSelectedWorker(record, {
    orca, store, env: {ORCA_WORKTREE_ID: 'folder:expected', ORCA_TERMINAL_HANDLE: 'term-me'},
  });
  assert.equal(result.state, 'launch_unknown');
  assert.equal(result.orca.runId, 'run-new');
  assert.equal(store.releases, 0);
});

test('an already active record is idempotent and launches nothing', async () => {
  const record = await fixtureRecord({state: 'active'});
  let calls = 0;
  const result = await startSelectedWorker(record, {
    orca: async () => { calls += 1; }, store: fakeStore(record), env: {},
  });
  assert.equal(result.state, 'active');
  assert.equal(calls, 0);
});
