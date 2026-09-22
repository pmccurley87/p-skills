import {execFile} from 'node:child_process';
import {promisify} from 'node:util';

import {validateAllowedPaths} from './store.mjs';

const execFilePromise = promisify(execFile);

function typedError(code, message, cause) {
  const error = new Error(message, cause ? {cause} : undefined);
  error.code = code;
  return error;
}

export async function callOrca(
  args,
  {
    executable = process.env.ORCA_CLI_COMMAND || 'orca',
    execFileImpl = execFilePromise,
  } = {},
) {
  let output;
  try {
    output = await execFileImpl(executable, args, {
      shell: false,
      encoding: 'utf8',
      maxBuffer: 8 * 1024 * 1024,
    });
  } catch (error) {
    const wrapped = typedError('orca_command_failed', `Orca command failed: ${args.slice(0, 2).join(' ')}`, error);
    wrapped.stdout = error.stdout ?? '';
    wrapped.stderr = error.stderr ?? '';
    throw wrapped;
  }
  try {
    return JSON.parse(output.stdout);
  } catch (error) {
    throw typedError('orca_response_invalid', `Orca returned invalid JSON for ${args.slice(0, 2).join(' ')}`, error);
  }
}

export function buildWorkerSpec(record) {
  const {packet} = record;
  return [
    `Target: ${packet.allowedPaths.join(', ')}`,
    `Change: ${packet.task}`,
    `Context: ${packet.contextSummary}`,
    `Acceptance: ${packet.acceptance.join(' | ')}`,
    `Ownership: You may edit only these workspace-relative paths: ${packet.allowedPaths.join(', ')}.`,
    'Constraints: Do not modify acceptance tests. Do not edit other files, start agents, change accounts, commit, push, deploy, or broaden the task.',
    'Completion: Run the stated acceptance checks, inspect your coordinator inbox immediately before completion, then follow the injected Orca worker_done protocol exactly. Report files modified and concise evidence.',
  ].join('\n');
}

function isLiveWorker(worker) {
  return worker.dispatchStatus === 'dispatched'
    || worker.workerState === 'ready'
    || worker.workerState === 'running'
    || worker.projection?.outcome === 'in_progress';
}

async function block(record, store, reason, releaseLock = false) {
  const updated = await store.updateRecord(record.id, current => ({
    ...current,
    state: 'blocked',
    blockReason: reason,
  }));
  if (releaseLock) await store.releaseLock(record.id);
  return updated;
}

export async function startSelectedWorker(
  record,
  {
    orca = args => callOrca(args),
    store,
    env = process.env,
  },
) {
  if (['active', 'launch_unknown', 'verified', 'released'].includes(record.state)) return record;
  if (!record.eligibility?.eligible) {
    return block(record, store, record.eligibility?.reason ?? 'not_eligible');
  }
  if (env.ORCA_WORKTREE_ID !== record.workspaceSelector) {
    return block(record, store, 'workspace_mismatch');
  }
  await validateAllowedPaths(record.workspaceRoot, record.packet.allowedPaths);
  await store.acquireLock(record.id);

  let status;
  try {
    status = await orca(['status', '--json']);
  } catch (error) {
    const updated = await block(record, store, 'runtime_unavailable', true);
    updated.error = {code: error.code ?? 'runtime_unavailable', message: error.message};
    return updated;
  }
  if (!status.ok || status.result?.runtime?.state !== 'ready' || status.result?.graph?.state !== 'ready') {
    return block(record, store, 'runtime_unavailable', true);
  }

  const runsReceipt = await orca(['orchestration', 'run-list', '--json']);
  const coordinatorRuns = (runsReceipt.result?.runs ?? [])
    .filter(run => env.ORCA_TERMINAL_HANDLE && run.coordinator_handle === env.ORCA_TERMINAL_HANDLE);
  for (const run of coordinatorRuns) {
    const workersReceipt = await orca(['orchestration', 'worker-list', '--run', run.id, '--json']);
    if ((workersReceipt.result?.workers ?? []).some(isLiveWorker)) {
      return block(record, store, 'coordinator_busy', true);
    }
  }

  let runReceipt;
  try {
    runReceipt = await orca([
      'orchestration', 'run-create',
      '--objective', `Pilot: ${record.packet.task}`,
      '--json',
    ]);
  } catch (error) {
    return block(record, store, 'run_create_failed', true);
  }
  const runId = runReceipt.result?.run?.id;
  if (!runReceipt.ok || !runId) return block(record, store, 'run_create_failed', true);

  let attempted = await store.updateRecord(record.id, current => ({
    ...current,
    state: 'launch_attempted',
    orca: {...current.orca, runId, runReceipt},
  }));
  const args = [
    'orchestration', 'worker-start',
    '--run', runId,
    '--spec', buildWorkerSpec(attempted),
    '--task-title', 'Muse-selected pilot task',
    '--worktree', record.workspaceSelector,
    '--agent', record.eligibility.worker,
    '--timeout-ms', '45000',
    '--json',
  ];
  let workerReceipt;
  try {
    workerReceipt = await orca(args);
  } catch (error) {
    return store.updateRecord(record.id, current => ({
      ...current,
      state: 'launch_unknown',
      error: {code: error.code ?? 'worker_start_unknown', message: error.message},
    }));
  }
  if (!workerReceipt.ok || workerReceipt.result?.state !== 'ready') {
    return store.updateRecord(record.id, current => ({
      ...current,
      state: 'launch_unknown',
      orca: {...current.orca, workerReceipt},
    }));
  }
  return store.updateRecord(record.id, current => ({
    ...current,
    state: 'active',
    orca: {
      ...current.orca,
      workerReceipt,
      taskId: workerReceipt.result.taskId,
      dispatchId: workerReceipt.result.dispatchId,
      requestId: workerReceipt.result.mutation?.requestId ?? null,
    },
  }));
}
