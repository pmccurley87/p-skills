import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp, readFile, realpath, symlink, writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';

import {createStore, validateAllowedPaths} from '../src/store.mjs';

test('creates and atomically updates a durable record', async () => {
  const runsDir = await mkdtemp(join(tmpdir(), 'orca-pilot-store-'));
  const store = createStore({runsDir});
  const created = await store.createRecord({state: 'triaged', packet: {task: 'safe'}});
  assert.match(created.id, /^[0-9a-f-]{36}$/);
  assert.equal((await store.readRecord(created.id)).state, 'triaged');
  await store.updateRecord(created.id, current => ({...current, state: 'active'}));
  assert.equal((await store.readRecord(created.id)).state, 'active');
  assert.doesNotMatch(await readFile(join(runsDir, created.id, 'record.json'), 'utf8'), /\.tmp/);
});

test('allows one active record and refuses a competing lock', async () => {
  const runsDir = await mkdtemp(join(tmpdir(), 'orca-pilot-lock-'));
  const first = createStore({runsDir});
  const second = createStore({runsDir});
  await first.acquireLock('record-a');
  await assert.rejects(second.acquireLock('record-b'), error => error.code === 'worker_busy');
  await assert.rejects(second.releaseLock('record-b'), error => error.code === 'lock_not_owned');
  await first.releaseLock('record-a');
  await second.acquireLock('record-b');
});

test('validates allowed paths and rejects traversal and symlink escape', async () => {
  const root = await mkdtemp(join(tmpdir(), 'orca-pilot-root-'));
  const outside = await mkdtemp(join(tmpdir(), 'orca-pilot-outside-'));
  await writeFile(join(outside, 'secret.txt'), 'x');
  await symlink(outside, join(root, 'escape'));
  const canonicalRoot = await realpath(root);

  assert.deepEqual(
    await validateAllowedPaths(root, ['new/file.mjs']),
    [join(canonicalRoot, 'new/file.mjs')],
  );
  await assert.rejects(
    validateAllowedPaths(root, ['../outside.txt']),
    error => error.code === 'path_outside_workspace',
  );
  await assert.rejects(
    validateAllowedPaths(root, ['escape/secret.txt']),
    error => error.code === 'path_outside_workspace',
  );
});

test('rejects record identifiers that could escape the runs directory', async () => {
  const runsDir = await mkdtemp(join(tmpdir(), 'orca-pilot-id-'));
  const store = createStore({runsDir});
  await assert.rejects(store.readRecord('../outside'), error => error.code === 'record_invalid');
});
