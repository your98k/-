'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const vm = require('node:vm');
const Schema = require('../core/schema.js');
const Registry = require('../core/registry.js');
const RNG = require('../core/rng.js');

function fresh() {
  const file = require.resolve('../web-bank/ai.js');
  delete require.cache[file];
  return require(file);
}
const config = { baseUrl: 'https://api.example.com/v1/', model: 'test-model', apiKey: 'test-secret' };
function blueprint(extra = {}) {
  return { subject: 'math', stage: 'primary', grade: 1, term: 1, seed: 'test-seed',
    sections: [{ title: '一、选择', type: 'choice', count: 2, score: 3, diff: [2, 2] }], ...extra };
}
function response(content, extra = {}) {
  return { ok: true, status: 200, text: async () => JSON.stringify({ choices: [
    { finish_reason: 'stop', message: { content: typeof content === 'string' ? content : JSON.stringify(content) } }
  ], ...extra }) };
}
function fake(mutate) {
  const calls = [];
  const fetch = async (url, init) => {
    const body = JSON.parse(init.body);
    const request = JSON.parse(body.messages[1].content);
    const questions = request.slots.map((s, i) => ({ kp: s.kp, type: s.type, diff: s.diff,
      stem: '第' + (calls.length * 5 + i + 1) + '道原创题，求 1 + 2 的值。',
      opts: ['choice', 'multi', 'cloze'].includes(s.type) ? ['A. 3', 'B、4', 'C) 5', 'D．6'] : null,
      answer: s.type === 'judge' ? '√' : ['choice', 'cloze'].includes(s.type) ? 'A' : s.type === 'multi' ? 'AC' : '3',
      analysis: '逐项计算得到 3。' }));
    calls.push({ url, init, body, request });
    return mutate ? mutate({ questions }, calls) : response({ questions });
  };
  return { fetch, calls };
}

for (const stem of ['填空：1 + 2 = ____。', '填空：____ + ____ = 5。', 'The ____ is ____ .']) {
  test('fill-in-the-blank underscores remain valid plain text: ' + stem, async () => {
    const ai = fresh();
    const transport = fake(data => {
      data.questions[0].stem = stem;
      return response(data);
    });
    const paper = await ai.generatePaper(blueprint({
      sections: [{ type: 'fill', count: 1, score: 3, diff: [2, 2] }]
    }), config, { fetch: transport.fetch });
    assert.equal(paper.questions[0].stem, stem);
  });
}

for (const field of ['stem', 'answer', 'analysis', 'opts']) {
  test('successful response cannot echo credentials into ' + field, async () => {
    const ai = fresh();
    const transport = fake(data => {
      if (field === 'opts') data.questions[0].opts[0] = config.apiKey;
      else data.questions[0][field] = config.apiKey;
      return response(data);
    });
    await assert.rejects(ai.generatePaper(blueprint(), config, { fetch: transport.fetch }), failure =>
      failure.message.includes('敏感凭据') && !failure.message.includes(config.apiKey));
    assert.equal(transport.calls.length, 1, 'credential reflection must never auto-retry');
  });
}

for (const change of [
  { baseUrl: 'https://api.example.com/' + config.apiKey + '/v1' },
  { baseUrl: 'https://api.example.com/' + [...config.apiKey].map(c => '%' + c.charCodeAt(0).toString(16)).join('') + '/v1' },
  { model: config.apiKey }
]) {
  test('rejects credential in persistent URL or model fields', () => {
    assert.throws(() => fresh().validateConfig({ ...config, ...change }), failure =>
      failure.message.includes('不可包含 API Key') && !failure.message.includes(config.apiKey));
  });
}

test('generates slots, safe transport and code-owned paper metadata', async () => {
  const ai = fresh();
  const transport = fake((data) => {
    for (const q of data.questions) Object.assign(q, { id: 'untrusted', score: 999, grade: 12, source: 'real', model: 'evil' });
    return response(data);
  });
  const progress = [];
  const paper = await ai.generatePaper(blueprint(), config, { fetch: transport.fetch, onProgress: p => progress.push(p) });
  assert.equal(paper.questions.length, 2);
  assert.equal(paper.totalScore, 6);
  assert.equal(paper.meta.source, 'ai');
  assert.equal(paper.meta.requested, 2);
  assert.equal(paper.meta.generated, 2);
  assert.deepEqual(paper.meta.byType, { choice: 2 });
  assert.deepEqual(paper.meta.byDiff, { 2: 2 });
  assert.match(paper.meta.validation, /结构.*不保证/);
  assert.deepEqual(paper.meta.failures, []);
  for (const [i, q] of paper.questions.entries()) {
    assert.equal(q.no, i + 1); assert.equal(q.sectionIndex, 0); assert.equal(q.sectionTitle, '一、选择');
    assert.equal(q.grade, 1); assert.equal(q.score, 3); assert.equal(q.source, 'ai'); assert.equal(q.model, 'test-model');
    assert.notEqual(q.id, 'untrusted'); assert.ok(Number.isFinite(Date.parse(q.generatedAt)));
    assert.deepEqual(q.opts, ['A. 3', 'B. 4', 'C. 5', 'D. 6']);
  }
  const call = transport.calls[0];
  assert.equal(call.url, 'https://api.example.com/v1/chat/completions');
  assert.equal(call.init.method, 'POST'); assert.equal(call.init.headers.Authorization, 'Bearer test-secret');
  assert.equal(call.init.redirect, 'error'); assert.equal(call.init.credentials, 'omit');
  assert.equal(call.init.cache, 'no-store'); assert.equal(call.init.referrerPolicy, 'no-referrer');
  assert.equal(call.body.model, 'test-model'); assert.equal(call.body.stream, false);
  assert.equal(call.body.response_format, undefined); assert.equal(call.body.tools, undefined);
  assert.deepEqual(progress.at(-1), { completed: 2, total: 2, requests: 1 });
});

test('validateConfig normalizes bases and complete endpoints without doing I/O', () => {
  const ai = fresh();
  assert.deepEqual(ai.validateConfig(config), {
    baseUrl: 'https://api.example.com/v1', endpoint: 'https://api.example.com/v1/chat/completions',
    model: 'test-model', apiKey: 'test-secret'
  });
  assert.equal(ai.validateConfig({ ...config, baseUrl: 'https://api.example.com/v1/chat/completions/' }).baseUrl,
    'https://api.example.com/v1');
  for (const baseUrl of ['http://localhost:8000/v1', 'http://127.0.0.1/v1', 'http://[::1]:8000/v1']) {
    assert.equal(ai.validateConfig({ ...config, baseUrl }).endpoint, baseUrl + '/chat/completions');
  }
});

const unsafeBases = [
  'http://api.example.com/v1', 'http://localhost.evil.test/v1', 'http://127.0.0.2/v1',
  'http://127.1/v1', 'http://2130706433/v1', 'http://0x7f000001/v1', 'http://[::ffff:127.0.0.1]/v1',
  'https://user:password@api.example.com/v1', 'https://@api.example.com/v1',
  'https://api.example.com/v1?key=test-secret', 'https://api.example.com/v1?',
  'https://api.example.com/v1#test-secret', 'https://api.example.com/v1#',
  'https://api.example.com\\@evil.test', 'https://api.example.com/\npath',
  'https:///api.example.com', 'https://api.example.com/%ZZ', 'file:///etc/passwd', 'not-a-url', ''
];
for (const baseUrl of unsafeBases) {
  test('rejects unsafe URL: ' + JSON.stringify(baseUrl).replace(/test-secret/g, 'REDACTED'), () => {
    assert.throws(() => fresh().validateConfig({ ...config, baseUrl }), e => {
      assert.ok(e instanceof Error); assert.match(e.message, /[\u4e00-\u9fff]/);
      assert.ok(!e.message.includes('test-secret')); assert.ok(!e.message.includes('password')); return true;
    });
  });
}
for (const [label, change] of [
  ['blank model', { model: '  ' }], ['model control', { model: 'model\nsecret' }],
  ['blank key', { apiKey: '' }], ['key CRLF', { apiKey: 'test-secret\r\nX: evil' }],
  ['key unicode', { apiKey: '密钥' }], ['oversize key', { apiKey: 'x'.repeat(8193) }]
]) test('sanitizes invalid configuration: ' + label, () => {
  assert.throws(() => fresh().validateConfig({ ...config, ...change }), e => !e.message.includes('test-secret'));
});

test('browser exposure performs no fetch and never accesses storage', () => {
  let fetches = 0;
  const sandbox = { KB: { Schema, Registry, RNG }, URL, AbortController, setTimeout, clearTimeout,
    fetch: () => { fetches++; throw Error('network forbidden'); } };
  Object.defineProperty(sandbox, 'localStorage', { get() { throw Error('storage forbidden'); } });
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../web-bank/ai.js'), 'utf8'), sandbox);
  assert.equal(typeof sandbox.KB.AI.generatePaper, 'function');
  sandbox.KB.AI.validateConfig(config);
  assert.equal(fetches, 0);
});

test('batches at most five sequentially and reports cumulative progress across sections', async () => {
  const ai = fresh(); let active = 0, maximum = 0;
  const transport = fake(async data => {
    active++; maximum = Math.max(maximum, active);
    await Promise.resolve(); active--; return response(data);
  });
  const bp = blueprint({ version: 'bsb', title: '原创测试', sections: [
    { title: '选择', type: 'choice', count: 4, score: 2, diff: [1, 1], kps: ['intAddSub'] },
    { title: '填空', type: 'fill', count: 3, score: 5, diffMix: [0, 0, 0, 0, 1], kps: ['time'] }
  ] });
  const events = [];
  const before = JSON.stringify(bp);
  const paper = await ai.generatePaper(bp, config, { fetch: transport.fetch, onProgress: p => events.push(p) });
  assert.deepEqual(transport.calls.map(c => c.request.slots.length), [5, 2]);
  assert.equal(maximum, 1); assert.equal(JSON.stringify(bp), before);
  assert.deepEqual(paper.questions.map(q => q.sectionIndex), [0, 0, 0, 0, 1, 1, 1]);
  assert.deepEqual(paper.questions.map(q => q.diff), [1, 1, 1, 1, 5, 5, 5]);
  assert.equal(paper.totalScore, 23); assert.equal(paper.meta.kpCount, 2);
  assert.deepEqual(paper.meta.byType, { choice: 4, fill: 3 });
  assert.deepEqual(paper.meta.byDiff, { 1: 4, 5: 3 });
  for (const [i, event] of events.entries()) {
    assert.equal(event.total, 7);
    if (i) { assert.ok(event.completed >= events[i - 1].completed); assert.ok(event.requests >= events[i - 1].requests); }
  }
  assert.deepEqual(events.at(-1), { completed: 7, total: 7, requests: 2 });
  assert.equal(paper.version, 'bsb'); assert.ok(paper.questions.every(q => q.version === 'bsb'));
});

test('defaults only to selected grade/term curriculum, including unsupported local generator KPs', async () => {
  const transport = fake();
  const bp = blueprint({ subject: 'math', grade: 6, term: 2, sections: [{ type: 'fill', count: 30 }] });
  const paper = await fresh().generatePaper(bp, config, { fetch: transport.fetch });
  const selected = Registry.curriculum('math', 'primary', 6, 2);
  assert.deepEqual(selected, ['negative', 'observe', 'stat3']);
  assert.ok(paper.questions.every(q => selected.includes(q.kp)));
  assert.ok(paper.questions.some(q => q.kp === 'stat3'));
  const call = transport.calls[0];
  assert.equal(call.request.grade, '6年级'); assert.equal(call.request.term, '下学期');
  assert.equal(call.request.subject, '数学'); assert.match(call.request.age, /岁/);
  assert.ok(call.request.slots.every(s => s.kpName && s.typeName && s.diffName));
  assert.match(call.body.messages[0].content, /核验答案/);
  assert.match(call.body.messages[0].content, /不使用外部浏览/);
  assert.match(call.body.messages[0].content, /非|不是真题/);
  assert.ok(call.request.nonce);
  assert.notEqual(call.request.nonce, transport.calls[1].request.nonce);
  assert.ok(!call.init.body.includes(config.apiKey));
});

test('empty curriculum does not use another grade as fallback', async () => {
  const transport = fake();
  await assert.rejects(fresh().generatePaper(blueprint({ subject: 'english', grade: 1 }), config,
    { fetch: transport.fetch }), /不会跨年级/);
  assert.equal(transport.calls.length, 0);
});

test('explicit knowledge points can override curriculum without needing a local generator', async () => {
  const transport = fake();
  const paper = await fresh().generatePaper(blueprint({ subject: 'english', grade: 1, kps: ['eng.p.read'] }), config,
    { fetch: transport.fetch });
  assert.ok(paper.questions.every(q => q.kp === 'eng.p.read' && q.grade === 1));
});

for (const [label, modify] of [
  ['zero count', bp => { bp.sections[0].count = 0; }],
  ['fractional count', bp => { bp.sections[0].count = 1.5; }],
  ['negative count', bp => { bp.sections[0].count = -1; }],
  ['string count', bp => { bp.sections[0].count = '2'; }],
  ['over cap', bp => { bp.sections = [{ count: 21 }, { count: 20 }]; }],
  ['missing sections', bp => { bp.sections = []; }],
  ['wrong grade', bp => { bp.grade = 10; }],
  ['invalid term', bp => { bp.term = 3; }],
  ['unknown type', bp => { bp.sections[0].type = '__proto__'; }],
  ['unknown kp', bp => { bp.kps = ['not-a-kp']; }],
  ['wrong subject kp', bp => { bp.kps = ['eng.p.word']; }],
  ['inverted difficulty', bp => { bp.sections[0].diff = [5, 2]; }],
  ['fractional difficulty', bp => { bp.sections[0].diff = [1.5, 2]; }],
  ['invalid mix', bp => { delete bp.sections[0].diff; bp.sections[0].diffMix = [0, 0, 0, 0, 0]; }],
  ['negative mix', bp => { delete bp.sections[0].diff; bp.sections[0].diffMix = [-1, 1, 1, 1, 1]; }],
  ['invalid score', bp => { bp.sections[0].score = -1; }]
]) test('invalid blueprint makes zero requests: ' + label, async () => {
  const bp = blueprint(); modify(bp); const transport = fake();
  await assert.rejects(fresh().generatePaper(bp, config, { fetch: transport.fetch }), /[\u4e00-\u9fff]/);
  assert.equal(transport.calls.length, 0);
});

for (const [label, mutate] of [
  ['wrong count', data => { data.questions.pop(); }],
  ['wrong kp', data => { data.questions[0].kp = 'time'; }],
  ['wrong type', data => { data.questions[0].type = 'fill'; }],
  ['wrong diff', data => { data.questions[0].diff = 3; }],
  ['string diff', data => { data.questions[0].diff = '2'; }],
  ['empty stem', data => { data.questions[0].stem = ' '; }],
  ['stem object', data => { data.questions[0].stem = { html: '<b>bad</b>' }; }],
  ['long stem', data => { data.questions[0].stem = '题'.repeat(1201); }],
  ['empty answer', data => { data.questions[0].answer = ''; }],
  ['long answer', data => { data.questions[0].answer = 'A'.repeat(1201); }],
  ['missing analysis', data => { delete data.questions[0].analysis; }],
  ['long analysis', data => { data.questions[0].analysis = '解'.repeat(3001); }],
  ['numeric option', data => { data.questions[0].opts[0] = 3; }],
  ['long option', data => { data.questions[0].opts[0] = 'x'.repeat(501); }],
  ['empty option', data => { data.questions[0].opts[0] = 'A. '; }],
  ['duplicate option', data => { data.questions[0].opts[1] = 'B. 3'; }],
  ['too few options', data => { data.questions[0].opts = ['3']; }],
  ['too many options', data => { data.questions[0].opts = ['1', '2', '3', '4', '5', '6', '7']; }],
  ['outside answer', data => { data.questions[0].answer = 'F'; }],
  ['multi answer for choice', data => { data.questions[0].answer = 'AB'; }],
  ['lowercase answer', data => { data.questions[0].answer = 'a'; }],
  ['HTML', data => { data.questions[0].stem = '<img src=x onerror=alert(1)>'; }],
  ['Markdown', data => { data.questions[0].analysis = '**正确**'; }],
  ['LaTeX', data => { data.questions[0].stem = '\\frac{1}{2}'; }],
  ['same stem different answer', data => { data.questions[1].stem = data.questions[0].stem; data.questions[1].answer = 'B'; }],
  ['whitespace normalized duplicate', data => { data.questions[1].stem = '  ' + data.questions[0].stem.split('').join(' ') + '  '; }]
]) test('rejects invalid question without hidden retry: ' + label, async () => {
  const transport = fake(data => { mutate(data); return response(data); });
  await assert.rejects(fresh().generatePaper(blueprint(), config, { fetch: transport.fetch }));
  assert.equal(transport.calls.length, 1);
});

test('all registered types produce Schema-compatible questions with proper scores', async () => {
  const transport = fake();
  const sections = Object.keys(Schema.TYPES).map(type => ({ type, count: 1, diff: [2, 2] }));
  const paper = await fresh().generatePaper(blueprint({ sections }), config, { fetch: transport.fetch });
  for (const q of paper.questions) {
    assert.equal(Schema.normalize(q).ok, true);
    assert.equal(q.score, Schema.defaultScore(q.type));
  }
  assert.equal(paper.questions.find(q => q.type === 'multi').answer, 'AC');
  assert.equal(paper.questions.find(q => q.type === 'judge').answer, '√');
});

for (const [type, answer, opts] of [
  ['judge', 'yes', null], ['multi', 'AA', ['3', '4']], ['multi', 'CA', ['3', '4', '5']],
  ['multi', 'AZ', ['3', '4']], ['cloze', 'AB', ['3', '4']], ['fill', '3', ['3', '4']]
]) test('rejects type-specific invalid answer/options: ' + type + '/' + answer, async () => {
  const transport = fake(data => { Object.assign(data.questions[0], { answer, opts }); return response(data); });
  await assert.rejects(fresh().generatePaper(blueprint({ sections: [{ type, count: 1, diff: [2, 2] }] }), config,
    { fetch: transport.fetch }));
});

test('accepts raw JSON and one complete JSON fence, but no commentary or trailing junk', async () => {
  const fenced = fake(data => response('```json\n' + JSON.stringify(data) + '\n```'));
  assert.equal((await fresh().generatePaper(blueprint(), config, { fetch: fenced.fetch })).questions.length, 2);
  for (const wrap of [s => '先思考一下\n' + s, s => s + '\n完成', s => '```json\n' + s + '\n```\n说明',
    s => '```javascript\n' + s + '\n```', s => s.slice(0, -3), s => '<think>推理</think>' + s]) {
    const transport = fake(data => response(wrap(JSON.stringify(data))));
    await assert.rejects(fresh().generatePaper(blueprint(), config, { fetch: transport.fetch }));
    assert.equal(transport.calls.length, 1);
  }
});

for (const reason of ['length', 'content_filter', 'tool_calls']) test('rejects unfinished model response: ' + reason, async () => {
  const transport = fake(data => response(data, { choices: [{ finish_reason: reason,
    message: { content: JSON.stringify(data) } }] }));
  await assert.rejects(fresh().generatePaper(blueprint(), config, { fetch: transport.fetch }), /截断|拒绝|结束/);
});

test('rejects explicit refusal, content array, non-JSON envelopes and extra root fields', async () => {
  const transports = [
    fake(data => response(data, { choices: [{ finish_reason: 'stop', message: { refusal: 'secret refusal', content: JSON.stringify(data) } }] })),
    fake(data => response(data, { choices: [{ message: { content: [{ text: JSON.stringify(data) }] } }] })),
    fake(() => ({ ok: true, text: async () => 'test-secret from provider is not JSON' })),
    fake(data => response({ ...data, reasoning: 'secret reasoning' }))
  ];
  for (const transport of transports) await assert.rejects(fresh().generatePaper(blueprint(), config,
    { fetch: transport.fetch }), e => !e.message.includes('test-secret') && !e.message.includes('secret refusal'));
});

for (const [label, res] of [
  ['envelope over 1MB', { ok: true, text: async () => 'x'.repeat(1024 * 1024 + 1) }],
  ['model content over 100KB', response('x'.repeat(100 * 1024 + 1))]
]) test('limits response size: ' + label, async () => {
  await assert.rejects(fresh().generatePaper(blueprint(), config, { fetch: async () => res }), /过大/);
});

for (const status of [401, 403, 404, 429, 500, 503, 302, 400]) test('sanitizes HTTP ' + status + ' without reading response body or retrying', async () => {
  let calls = 0;
  await assert.rejects(fresh().generatePaper(blueprint(), config, { fetch: async () => {
    calls++; return { ok: false, status, text() { throw Error('test-secret body must not be read'); } };
  } }), e => {
    assert.ok(!e.message.includes('test-secret')); assert.match(e.message, /[\u4e00-\u9fff]/);
    if ([401, 403, 404, 429].includes(status)) assert.ok(e.message.includes(String(status)));
    if (status >= 500) assert.match(e.message, /5xx/);
    return true;
  });
  assert.equal(calls, 1);
});

test('network/CORS and body-read errors are sanitized rather than echoing configuration', async () => {
  for (const fetch of [async () => { throw new TypeError('test-secret https://private-host'); },
    async () => ({ ok: true, text: async () => { throw Error('test-secret body'); } })]) {
    await assert.rejects(fresh().generatePaper(blueprint(), config, { fetch }), e => {
      assert.match(e.message, /CORS/); assert.ok(!e.message.includes('test-secret')); assert.ok(!e.message.includes('private-host')); return true;
    });
  }
});

test('pre-aborted signal causes zero requests', async () => {
  const controller = new AbortController(); controller.abort('test-secret'); const transport = fake();
  await assert.rejects(fresh().generatePaper(blueprint(), config, { signal: controller.signal, fetch: transport.fetch }), /取消/);
  assert.equal(transport.calls.length, 0);
});

function trackedSignal(controller) {
  let added = 0, removed = 0;
  return { signal: { get aborted() { return controller.signal.aborted; },
    addEventListener(...args) { added++; controller.signal.addEventListener(...args); },
    removeEventListener(...args) { removed++; controller.signal.removeEventListener(...args); } },
    get added() { return added; }, get removed() { return removed; } };
}

test('external abort interrupts even an injected fetch that ignores AbortSignal and cleans listener', async () => {
  const controller = new AbortController(), tracked = trackedSignal(controller);
  let internalSignal;
  const pending = fresh().generatePaper(blueprint(), config, { signal: tracked.signal, fetch: async (_, init) => {
    internalSignal = init.signal; return new Promise(() => {});
  } });
  await Promise.resolve(); controller.abort('test-secret');
  await assert.rejects(pending, e => /取消/.test(e.message) && !e.message.includes('test-secret'));
  assert.equal(internalSignal.aborted, true); assert.equal(tracked.added, 1); assert.equal(tracked.removed, 1);
});

test('cancel between batches stops billing and does not return a partial paper', async () => {
  const controller = new AbortController(), transport = fake();
  await assert.rejects(fresh().generatePaper(blueprint({ sections: [{ type: 'choice', count: 6 }] }), config,
    { signal: controller.signal, fetch: transport.fetch, onProgress(p) { if (p.completed === 5) controller.abort(); } }), /取消/);
  assert.equal(transport.calls.length, 1);
});

test('90-second batch timeout aborts even uncooperative fetch and cleans timer/listener', async () => {
  let timerCallback, cleared = 0, internalSignal;
  const controller = new AbortController(), tracked = trackedSignal(controller);
  const sandbox = { KB: { Schema, Registry, RNG }, URL, AbortController,
    setTimeout(fn, ms) { assert.equal(ms, 90000); timerCallback = fn; return 7; },
    clearTimeout(id) { assert.equal(id, 7); cleared++; } };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../web-bank/ai.js'), 'utf8'), sandbox);
  const pending = sandbox.KB.AI.generatePaper(blueprint(), config, { signal: tracked.signal,
    fetch: async (_, init) => { internalSignal = init.signal; return new Promise(() => {}); } });
  await Promise.resolve(); timerCallback();
  await assert.rejects(pending, /超时/);
  assert.equal(internalSignal.aborted, true); assert.equal(cleared, 1);
  assert.equal(tracked.added, 1); assert.equal(tracked.removed, 1);
});

test('timeout covers response body reading, not only response headers', async () => {
  let timerCallback, internalSignal;
  const sandbox = { KB: { Schema, Registry, RNG }, URL, AbortController,
    setTimeout(fn) { timerCallback = fn; return 1; }, clearTimeout() {} };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../web-bank/ai.js'), 'utf8'), sandbox);
  const pending = sandbox.KB.AI.generatePaper(blueprint(), config, { fetch: async (_, init) => {
    internalSignal = init.signal; return { ok: true, text: () => new Promise(() => {}) };
  } });
  await Promise.resolve(); await Promise.resolve(); timerCallback();
  await assert.rejects(pending, /超时/); assert.equal(internalSignal.aborted, true);
});

test('success and HTTP failure remove external listeners', async () => {
  for (const fail of [false, true]) {
    const tracked = trackedSignal(new AbortController());
    const transport = fake(data => fail ? { ok: false, status: 500 } : response(data));
    const pending = fresh().generatePaper(blueprint(), config, { signal: tracked.signal, fetch: transport.fetch });
    if (fail) await assert.rejects(pending); else await pending;
    assert.equal(tracked.added, 1); assert.equal(tracked.removed, 1);
  }
});

test('failed multi-batch paper does not poison recent stem history', async () => {
  const ai = fresh();
  const failing = fake((data, calls) => { if (calls.length === 2) data.questions.pop(); return response(data); });
  const bp = blueprint({ sections: [{ type: 'choice', count: 6 }] });
  await assert.rejects(ai.generatePaper(bp, config, { fetch: failing.fetch }), /题量/);
  const retry = fake();
  const paper = await ai.generatePaper(bp, config, { fetch: retry.fetch });
  assert.equal(paper.questions.length, 6);
  const repeat = fake();
  await assert.rejects(ai.generatePaper(bp, config, { fetch: repeat.fetch }), /重复/);
  assert.equal(repeat.calls.length, 1);
});

test('recent history is capped around 300 stems and accepts evicted stems', async () => {
  const ai = fresh(); const bp = blueprint({ sections: [{ type: 'choice', count: 40 }] });
  for (let run = 0; run < 8; run++) {
    const transport = fake(data => {
      data.questions.forEach(q => { q.stem = '第' + run + '份试卷。' + q.stem; }); return response(data);
    });
    const paper = await ai.generatePaper(bp, config, { fetch: transport.fetch });
    assert.equal(paper.questions.length, 40); assert.equal(transport.calls.length, 8);
  }
  const oldest = fake(data => { data.questions.forEach(q => { q.stem = '第0份试卷。' + q.stem; }); return response(data); });
  assert.equal((await ai.generatePaper(blueprint(), config, { fetch: oldest.fetch })).questions.length, 2);
});

test('overlapping generations cannot both commit the same stems', async () => {
  const ai = fresh(), one = fake(), two = fake();
  const settled = await Promise.allSettled([
    ai.generatePaper(blueprint(), config, { fetch: one.fetch }), ai.generatePaper(blueprint(), config, { fetch: two.fetch })
  ]);
  assert.equal(settled.filter(s => s.status === 'fulfilled').length, 1);
  assert.equal(settled.filter(s => s.status === 'rejected').length, 1);
});

test('default difficulty mix is deterministic from blueprint seed and not fixed to medium', async () => {
  const transport = fake();
  const bp = blueprint({ kps: ['intAddSub'], sections: [{ type: 'fill', count: 40 }] });
  const paper = await fresh().generatePaper(bp, config, { fetch: transport.fetch });
  assert.deepEqual(new Set(paper.questions.map(q => q.diff)), new Set([1, 2, 3, 4, 5]));
  const again = await fresh().generatePaper(bp, config, { fetch: fake().fetch });
  assert.deepEqual(again.questions.map(q => q.diff), paper.questions.map(q => q.diff));
  assert.deepEqual(paper.meta.byDiff, { 1: 8, 2: 16, 3: 10, 4: 5, 5: 1 });
});

test('progress callback exceptions are sanitized and stop before any request', async () => {
  const transport = fake();
  await assert.rejects(fresh().generatePaper(blueprint(), config, { fetch: transport.fetch,
    onProgress() { throw Error('test-secret'); } }), e => /回调/.test(e.message) && !e.message.includes('test-secret'));
  assert.equal(transport.calls.length, 0);
});

test('single-question replacement preserves exact assigned metadata and rejects excluded normalized stems', async () => {
  const bp = blueprint({ version: 'bsb', kps: ['time'], sections: [{ type: 'fill', count: 1, score: 7, diff: [4, 4] }] });
  const transport = fake();
  const paper = await fresh().generatePaper(bp, config, { fetch: transport.fetch });
  const q = paper.questions[0];
  assert.equal(q.type, 'fill'); assert.equal(q.diff, 4); assert.equal(q.kp, 'time'); assert.equal(q.score, 7);
  assert.equal(q.source, 'ai'); assert.equal(q.model, config.model); assert.ok(Date.parse(q.generatedAt));
  const blocked = fake();
  await assert.rejects(fresh().generatePaper(bp, config, { fetch: blocked.fetch,
    excludeStems: [' ' + q.stem.split('').join(' ') + ' '] }), /重复/);
  assert.equal(blocked.calls.length, 1);
});

test('excludeStems keeps latest 200 entries and prompts with at most ten examples', async () => {
  const excludes = Array.from({ length: 205 }, (_, i) => '已有题干' + i);
  const transport = fake();
  await fresh().generatePaper(blueprint(), config, { fetch: transport.fetch, excludeStems: excludes });
  assert.deepEqual(transport.calls[0].request.avoidStems, excludes.slice(-10));
  assert.equal(excludes.length, 205);
  const evicted = fake(data => { data.questions[0].stem = excludes[0]; return response(data); });
  await fresh().generatePaper(blueprint(), config, { fetch: evicted.fetch, excludeStems: excludes });
  const retained = fake(data => { data.questions[0].stem = excludes[5]; return response(data); });
  await assert.rejects(fresh().generatePaper(blueprint(), config, { fetch: retained.fetch, excludeStems: excludes }), /重复/);
});
