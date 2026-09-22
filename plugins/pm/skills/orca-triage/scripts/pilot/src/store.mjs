import {randomUUID} from 'node:crypto';
import {mkdir, open, readFile, realpath, rename, unlink, writeFile} from 'node:fs/promises';
import {dirname, isAbsolute, join, relative, resolve, sep} from 'node:path';

function typedError(code, message, cause) {
  const error = new Error(message, cause ? {cause} : undefined);
  error.code = code;
  return error;
}

function assertRecordId(id) {
  if (!/^[0-9a-f-]{36}$/i.test(id)) {
    throw typedError('record_invalid', 'Record identifier is invalid');
  }
}

async function atomicJson(path, value) {
  const temporary = `${path}.${randomUUID()}.tmp`;
  await writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`, {mode: 0o600});
  await rename(temporary, path);
}

export function createStore({runsDir}) {
  if (!isAbsolute(runsDir)) throw typedError('runs_dir_invalid', 'Runs directory must be absolute');
  const lockPath = join(runsDir, '.active-worker.lock');
  return {
    runsDir,
    async createRecord(seed) {
      await mkdir(runsDir, {recursive: true});
      const record = {
        ...structuredClone(seed),
        id: randomUUID(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      const directory = join(runsDir, record.id);
      await mkdir(directory, {recursive: false});
      await atomicJson(join(directory, 'record.json'), record);
      return record;
    },
    async readRecord(id) {
      assertRecordId(id);
      return JSON.parse(await readFile(join(runsDir, id, 'record.json'), 'utf8'));
    },
    async updateRecord(id, updater) {
      assertRecordId(id);
      const current = await this.readRecord(id);
      const next = {
        ...await updater(structuredClone(current)),
        id: current.id,
        createdAt: current.createdAt,
        updatedAt: new Date().toISOString(),
      };
      await atomicJson(join(runsDir, id, 'record.json'), next);
      return next;
    },
    async acquireLock(id) {
      await mkdir(runsDir, {recursive: true});
      try {
        const handle = await open(lockPath, 'wx', 0o600);
        await handle.writeFile(`${JSON.stringify({recordId: id, acquiredAt: new Date().toISOString()})}\n`);
        await handle.close();
      } catch (error) {
        if (error.code === 'EEXIST') throw typedError('worker_busy', 'Another pilot worker owns the active lock');
        throw error;
      }
    },
    async releaseLock(id) {
      let lock;
      try {
        lock = JSON.parse(await readFile(lockPath, 'utf8'));
      } catch (error) {
        throw typedError('lock_not_owned', 'Pilot worker lock is unavailable', error);
      }
      if (lock.recordId !== id) throw typedError('lock_not_owned', 'Pilot worker lock belongs to another record');
      await unlink(lockPath);
    },
  };
}

async function resolveThroughExistingAncestor(path) {
  let cursor = path;
  const missing = [];
  while (true) {
    try {
      const resolvedAncestor = await realpath(cursor);
      return join(resolvedAncestor, ...missing.reverse());
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
      const parent = dirname(cursor);
      if (parent === cursor) throw error;
      missing.push(cursor.slice(parent.length + (parent.endsWith(sep) ? 0 : 1)));
      cursor = parent;
    }
  }
}

function isInside(root, path) {
  const rel = relative(root, path);
  return rel === '' || (!rel.startsWith(`..${sep}`) && rel !== '..' && !isAbsolute(rel));
}

export async function validateAllowedPaths(workspaceRoot, allowedPaths) {
  const canonicalRoot = await realpath(workspaceRoot);
  const validated = [];
  for (const supplied of allowedPaths) {
    if (typeof supplied !== 'string' || supplied.length === 0 || isAbsolute(supplied)) {
      throw typedError('path_outside_workspace', 'Allowed paths must be nonempty workspace-relative paths');
    }
    const lexical = resolve(canonicalRoot, supplied);
    if (!isInside(canonicalRoot, lexical)) {
      throw typedError('path_outside_workspace', `Path escapes workspace: ${supplied}`);
    }
    const canonical = await resolveThroughExistingAncestor(lexical);
    if (!isInside(canonicalRoot, canonical)) {
      throw typedError('path_outside_workspace', `Path resolves outside workspace: ${supplied}`);
    }
    validated.push(canonical);
  }
  return validated;
}
