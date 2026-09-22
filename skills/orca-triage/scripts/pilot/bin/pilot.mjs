#!/usr/bin/env node

import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {homedir} from 'node:os';
import {fileURLToPath} from 'node:url';
import {join, resolve} from 'node:path';

import {eligibility} from '../src/contract.mjs';
import {callOrca, startSelectedWorker} from '../src/orca.mjs';
import {createStore, validateAllowedPaths} from '../src/store.mjs';
import {loadApiKey, triage} from '../src/triage.mjs';

export function stateRunsDir(workspaceRoot, {env = process.env, home = homedir()} = {}) {
  const stateRoot = env.XDG_STATE_HOME || join(home, '.local', 'state');
  const workspaceKey = createHash('sha256').update(resolve(workspaceRoot)).digest('hex').slice(0, 16);
  return join(stateRoot, 'pm-orca-triage', workspaceKey, 'runs');
}

function typedError(code, message) {
  const error = new Error(message);
  error.code = code;
  return error;
}

function parseArgs(argv) {
  const [command, ...rest] = argv;
  const flags = {};
  for (let index = 0; index < rest.length; index += 2) {
    const flag = rest[index];
    const value = rest[index + 1];
    if (!flag?.startsWith('--') || value === undefined) {
      throw typedError('arguments_invalid', `Invalid arguments near ${flag ?? '<end>'}`);
    }
    flags[flag.slice(2)] = value;
  }
  return {command, flags};
}

function writeJson(writeOut, value) {
  writeOut(`${JSON.stringify(value, null, 2)}\n`);
  return value;
}

function validateEvidence(value) {
  if (!value || !['verified', 'failed'].includes(value.outcome)) {
    throw typedError('evidence_invalid', 'Evidence outcome must be verified or failed');
  }
  if (!Array.isArray(value.checks) || value.checks.length === 0) {
    throw typedError('evidence_invalid', 'Evidence must contain at least one check');
  }
  for (const check of value.checks) {
    if (!check || typeof check.name !== 'string' || typeof check.passed !== 'boolean' || typeof check.evidence !== 'string') {
      throw typedError('evidence_invalid', 'Every evidence check requires name, passed, and evidence');
    }
  }
  if (value.outcome === 'verified' && value.checks.some(check => !check.passed)) {
    throw typedError('evidence_invalid', 'Verified evidence cannot contain failed checks');
  }
  if (!Array.isArray(value.artifactPaths) || !value.artifactPaths.every(path => typeof path === 'string')) {
    throw typedError('evidence_invalid', 'artifactPaths must be an array of strings');
  }
  return value;
}

export async function main(
  argv,
  {
    env = process.env,
    store = null,
    readFileImpl = readFile,
    loadKeyFn = loadApiKey,
    triageFn = triage,
    startFn = (record, dependencies) => startSelectedWorker(record, dependencies),
    orca = args => callOrca(args),
    writeOut = value => process.stdout.write(value),
  } = {},
) {
  const workspaceRoot = env.ORCA_WORKSPACE_ROOT || process.cwd();
  const activeStore = store ?? createStore({runsDir: stateRunsDir(workspaceRoot, {env})});
  const {command, flags} = parseArgs(argv);
  if (command === 'triage') {
    if (!flags.input) throw typedError('arguments_invalid', 'triage requires --input');
    const packet = JSON.parse(await readFileImpl(flags.input, 'utf8'));
    const apiKey = await loadKeyFn({env});
    const triageReceipt = await triageFn(packet, {apiKey});
    const launchEligibility = eligibility(triageReceipt.decision, {
      preferredWorker: packet.preferredWorker,
    });
    const record = await activeStore.createRecord({
      state: launchEligibility.eligible ? 'triaged' : 'blocked',
      blockReason: launchEligibility.eligible ? null : launchEligibility.reason,
      packet,
      triage: triageReceipt,
      eligibility: launchEligibility,
      workspaceRoot,
      workspaceSelector: env.ORCA_WORKTREE_ID || null,
    });
    return writeJson(writeOut, record);
  }
  if (command === 'start') {
    if (!flags.record) throw typedError('arguments_invalid', 'start requires --record');
    const record = await activeStore.readRecord(flags.record);
    const result = await startFn(record, {orca, store: activeStore, env});
    return writeJson(writeOut, result);
  }
  if (command === 'inspect') {
    if (!flags.record) throw typedError('arguments_invalid', 'inspect requires --record');
    const record = await activeStore.readRecord(flags.record);
    let live = null;
    if (record.orca?.dispatchId) {
      live = await orca(['orchestration', 'worker-show', '--dispatch', record.orca.dispatchId, '--json']);
    }
    return writeJson(writeOut, {record, live});
  }
  if (command === 'finish') {
    if (!flags.record || !flags.evidence) {
      throw typedError('arguments_invalid', 'finish requires --record and --evidence');
    }
    const record = await activeStore.readRecord(flags.record);
    const evidence = validateEvidence(JSON.parse(await readFileImpl(flags.evidence, 'utf8')));
    await validateAllowedPaths(record.workspaceRoot, evidence.artifactPaths);
    if (!record.orca?.runId || !record.orca?.dispatchId) {
      throw typedError('cleanup_not_proven', 'Record has no launched worker to finish');
    }
    const workers = await orca(['orchestration', 'worker-list', '--run', record.orca.runId, '--json']);
    const worker = (workers.result?.workers ?? []).find(item => item.dispatchId === record.orca.dispatchId);
    const released = worker?.terminalState === 'released'
      || worker?.resource?.ownershipState === 'released'
      || worker?.projection?.resource?.state === 'released';
    if (!released) throw typedError('cleanup_not_proven', 'Worker release is not proven; preserve the pilot lock');
    const result = await activeStore.updateRecord(record.id, current => ({
      ...current,
      state: evidence.outcome,
      evidence,
      cleanup: {terminalState: worker.terminalState ?? null, proven: true},
    }));
    await activeStore.releaseLock(record.id);
    return writeJson(writeOut, result);
  }
  throw typedError('arguments_invalid', 'Command must be triage, start, inspect, or finish');
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main(process.argv.slice(2)).catch(error => {
    process.stderr.write(`${JSON.stringify({ok: false, error: {
      code: error.code ?? 'pilot_error',
      message: error.message,
      ...(error.details ? {details: error.details} : {}),
    }})}\n`);
    process.exitCode = 1;
  });
}
