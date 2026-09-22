import test from 'node:test';
import assert from 'node:assert/strict';

import {loadApiKey, resolveApiKey, triage} from '../src/triage.mjs';

const base = {
  taskType: 'implementation',
  size: 'small',
  recommendedPattern: 'triage_worker',
  worker: 'codex',
  reason: 'One bounded utility with explicit acceptance tests.',
  uncertainties: [],
  needsClarification: false,
};

const packet = {
  task: 'Create pilot/demo/slugify.mjs with one exported function.',
  contextSummary: 'Synthetic demonstration in the Orca triage pilot.',
  acceptance: ['The coordinator-owned node:test suite passes.'],
  allowedPaths: ['orca-setup/pilot/demo/slugify.mjs'],
  preferredWorker: null,
};

function response(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {'content-type': 'application/json'},
  });
}

test('sends an exact-model structured request and normalizes observability data', async () => {
  let sent;
  const fetchImpl = async (url, init) => {
    sent = {url, headers: init.headers, body: JSON.parse(init.body)};
    return response({
      id: 'fixture-generation',
      model: 'meta/muse-spark-1.3-contributor',
      choices: [{message: {content: JSON.stringify(base)}}],
      usage: {prompt_tokens: 100, completion_tokens: 40, cost: 0.000018},
    });
  };

  const result = await triage(packet, {apiKey: 'fixture-key', fetchImpl});

  assert.equal(sent.url, 'https://openrouter.ai/api/v1/chat/completions');
  assert.equal(sent.headers.Authorization, 'Bearer fixture-key');
  assert.equal(sent.body.model, 'meta/muse-spark-1.3-contributor');
  assert.equal(sent.body.max_tokens, 2000);
  assert.deepEqual(sent.body.reasoning, {effort: 'minimal', exclude: true});
  assert.equal(sent.body.provider.require_parameters, true);
  assert.equal(sent.body.response_format.json_schema.strict, true);
  assert.equal(sent.body.tools, undefined);
  assert.equal(JSON.parse(sent.body.messages[1].content).task, packet.task);
  assert.deepEqual(result.decision, base);
  assert.equal(result.requestId, 'fixture-generation');
  assert.equal(result.returnedModel, 'meta/muse-spark-1.3-contributor');
  assert.equal(result.reportedCost, 0.000018);
  assert.ok(result.durationMs >= 0);
});

test('keeps unavailable cost null instead of inventing zero', async () => {
  const fetchImpl = async () => response({
    id: 'no-cost',
    model: 'meta/muse-spark-1.3-contributor',
    choices: [{message: {content: JSON.stringify(base)}}],
    usage: {prompt_tokens: 5, completion_tokens: 4},
  });
  const result = await triage(packet, {apiKey: 'fixture-key', fetchImpl});
  assert.equal(result.reportedCost, null);
});

test('empty content reports only safe provider metadata', async () => {
  const fetchImpl = async () => response({
    id: 'empty-generation',
    model: 'meta/muse-spark-1.3-contributor',
    choices: [{finish_reason: 'length', message: {content: '', reasoning: 'hidden'}}],
    usage: {prompt_tokens: 100, completion_tokens: 1200},
  });
  await assert.rejects(
    triage(packet, {apiKey: 'fixture-key', fetchImpl}),
    error => error.code === 'response_empty'
      && error.details.responseId === 'empty-generation'
      && error.details.finishReason === 'length'
      && error.details.usage.completion_tokens === 1200
      && error.details.messageFields.includes('reasoning')
      && !JSON.stringify(error.details).includes('hidden'),
  );
});

test('rejects oversized input before network access', async () => {
  let calls = 0;
  const fetchImpl = async () => { calls += 1; return response({}); };
  await assert.rejects(
    triage({...packet, task: 'x'.repeat(24_001)}, {apiKey: 'fixture-key', fetchImpl}),
    error => error.code === 'input_too_large',
  );
  assert.equal(calls, 0);
});

test('rejects empty acceptance and path scopes before network access', async () => {
  let calls = 0;
  const fetchImpl = async () => { calls += 1; return response({}); };
  await assert.rejects(
    triage({...packet, acceptance: []}, {apiKey: 'fixture-key', fetchImpl}),
    error => error.code === 'packet_invalid',
  );
  await assert.rejects(
    triage({...packet, allowedPaths: []}, {apiKey: 'fixture-key', fetchImpl}),
    error => error.code === 'packet_invalid',
  );
  assert.equal(calls, 0);
});

test('rejects malformed, invalid, empty, and unexpected-model responses', async t => {
  const cases = [
    ['malformed JSON', '{broken', 'response_malformed'],
    ['schema-invalid JSON', JSON.stringify({...base, worker: 'opencode'}), 'response_invalid'],
    ['empty content', '', 'response_empty'],
  ];
  for (const [name, content, code] of cases) {
    await t.test(name, async () => {
      const fetchImpl = async () => response({
        id: name,
        model: 'meta/muse-spark-1.3-contributor',
        choices: [{message: {content}}],
      });
      await assert.rejects(
        triage(packet, {apiKey: 'fixture-key', fetchImpl}),
        error => error.code === code,
      );
    });
  }
  const unexpected = async () => response({
    id: 'wrong-model', model: 'some/fallback',
    choices: [{message: {content: JSON.stringify(base)}}],
  });
  await assert.rejects(
    triage(packet, {apiKey: 'fixture-key', fetchImpl: unexpected}),
    error => error.code === 'unexpected_model',
  );
});

test('turns HTTP and abort failures into typed errors without retrying', async () => {
  let calls = 0;
  const unauthorized = async () => { calls += 1; return response({error: {message: 'no'}}, 401); };
  await assert.rejects(
    triage(packet, {apiKey: 'fixture-key', fetchImpl: unauthorized}),
    error => error.code === 'openrouter_http_401',
  );
  assert.equal(calls, 1);

  const aborted = async () => { throw new DOMException('aborted', 'AbortError'); };
  await assert.rejects(
    triage(packet, {apiKey: 'fixture-key', fetchImpl: aborted}),
    error => error.code === 'openrouter_timeout',
  );
});

test('resolves an environment key and reports missing credentials without exposing values', () => {
  assert.equal(resolveApiKey({env: {OPENROUTER_API_KEY: 'secret'}}), 'secret');
  assert.throws(
    () => resolveApiKey({env: {}}),
    error => error.code === 'credential_missing' && !error.message.includes('secret'),
  );
});

test('loads only the OpenRouter key from the existing OpenCode credential shape', async () => {
  const calls = [];
  const key = await loadApiKey({
    env: {},
    authPath: '/fixture/opencode/auth.json',
    readFileImpl: async (path, encoding) => {
      calls.push({path, encoding});
      return JSON.stringify({openrouter: {type: 'api', key: 'stored-secret'}, unrelated: {key: 'ignore'}});
    },
  });
  assert.equal(key, 'stored-secret');
  assert.deepEqual(calls, [{path: '/fixture/opencode/auth.json', encoding: 'utf8'}]);
});

test('reports unusable OpenCode credential data as missing credentials', async () => {
  await assert.rejects(
    loadApiKey({env: {}, readFileImpl: async () => '{broken'}),
    error => error.code === 'credential_missing' && !error.message.includes('{broken'),
  );
});
