'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const documentFrom = require('./helpers/workbench-dom.js');
const ROOT = path.join(__dirname, '..');

function loadEquation(random = Math.random, storage, kb) {
  const document = documentFrom(fs.readFileSync(path.join(ROOT, 'web-bank/equation.html'), 'utf8'));
  const testMath = Object.create(Math);
  testMath.random = random;
  const sandbox = {
    document,
    console,
    Math: testMath,
    parseInt,
    Number,
    String,
    isNaN,
    Array,
    Object,
    navigator: {},
    AbortController,
    window: { print() {}, localStorage: storage, KB: kb }
  };
  sandbox.window.document = document;
  const script = fs.readFileSync(path.join(ROOT, 'web-bank/equation.js'), 'utf8');
  vm.runInNewContext(script, sandbox, { filename: 'web-bank/equation.js' });
  return { document, sandbox };
}

test('AI 方程生成使用当前设置，成功后显示题目与核验提示', async () => {
  const calls = [];
  const kb = { AISettings: { read: () => ({ baseUrl: 'https://example.com/v1', model: 'model', apiKey: 'private-token' }), open() {} },
    AI: { validateConfig: config => config, generateEquations: async (options, config) => {
      calls.push({ options, config });
      return { questions: [{ text: 'x + 2 = 5', answer: 'x = 3', steps: ['x = 5 - 2'] }] };
    } } };
  const { document } = loadEquation(Math.random, undefined, kb);
  document.getElementById('eqModeAI').click();
  document.getElementById('btnBuild').click();
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(calls.length, 1);
  assert.equal(calls[0].options.grade, 5);
  assert.equal(calls[0].options.count, 10);
  assert.equal(calls[0].config.apiKey, 'private-token');
  assert.ok(questionTexts(document).some(text => text.includes('x + 2 = 5')));
  assert.match(document.getElementById('eqHint').textContent, /核验/);
});

test('AI 生成失败时保留原试卷并提示原因', async () => {
  const kb = { AISettings: { read: () => ({ apiKey: 'test' }), open() {} },
    AI: { validateConfig: config => config, generateEquations: async () => { throw new Error('连接失败'); } } };
  const { document } = loadEquation(Math.random, undefined, kb);
  const before = questionTexts(document);
  document.getElementById('eqModeAI').click();
  document.getElementById('btnBuild').click();
  await new Promise(resolve => setImmediate(resolve));
  assert.deepEqual(questionTexts(document), before);
  assert.match(document.getElementById('eqAIStatus').textContent, /连接失败/);
});

test('取消 AI 出题后迟到的结果不能覆盖原试卷', async () => {
  let finish;
  const kb = { AISettings: { read: () => ({ apiKey: 'test' }), open() {} },
    AI: { validateConfig: config => config, generateEquations: () => new Promise(resolve => { finish = resolve; }) } };
  const { document } = loadEquation(Math.random, undefined, kb);
  const before = questionTexts(document);
  document.getElementById('eqModeAI').click();
  document.getElementById('btnBuild').click();
  assert.equal(document.getElementById('btnBuild').disabled, true);
  document.getElementById('eqAICancel').click();
  finish({ questions: [{ text: 'x = 123', answer: 'x = 123', steps: ['检查'] }] });
  await new Promise(resolve => setImmediate(resolve));
  assert.deepEqual(questionTexts(document), before);
  assert.match(document.getElementById('eqAIStatus').textContent, /取消/);
  assert.equal(document.getElementById('btnBuild').disabled, false);
});

test('AI 题目即使包含 HTML 也按文本显示', async () => {
  const kb = { AISettings: { read: () => ({ apiKey: 'test' }), open() {} },
    AI: { validateConfig: config => config, generateEquations: async () => ({ questions: [
      { text: 'x < 5 & x > 1', answer: '<img src=x>', steps: ['x < 5'] }
    ] }) } };
  const { document } = loadEquation(Math.random, undefined, kb);
  document.getElementById('eqModeAI').click();
  document.getElementById('btnBuild').click();
  await new Promise(resolve => setImmediate(resolve));
  document.getElementById('chkAnswer').checked = true;
  document.getElementById('chkAnswer').dispatchEvent({ type: 'change' });
  assert.equal(document.querySelectorAll('#eqPaper img').length, 0);
  assert.ok(document.getElementById('eqPaper').textContent.includes('<img src=x>'));
});

test('方程页复用 API 设置并通过真实 AI 模块生成题目', async () => {
  const ai = require('../web-bank/ai.js');
  const records = new Map([['kb.ai.settings.v1', JSON.stringify({ baseUrl: 'https://example.com/v1', model: 'model' })]]);
  const storage = { getItem: key => records.get(key) || null, setItem: (key, value) => records.set(key, value), removeItem: key => records.delete(key) };
  const calls = [];
  let sequence = 0;
  const transport = async (url, init) => {
    const payload = JSON.parse(init.body);
    const request = JSON.parse(payload.messages[1].content);
    calls.push({ url, request });
    const questions = Array.from({ length: request.count }, () => {
      sequence++;
      return { text: 'x + ' + sequence + ' = ' + (sequence + 3), answer: 'x = 3', analysis: '两边同时减去 ' + sequence };
    });
    return { ok: true, text: async () => JSON.stringify({ choices: [{ finish_reason: 'stop', message: { content: JSON.stringify({ questions }) } }] }) };
  };
  const wrappedAI = { ...ai, generateEquations: (spec, config, options) => ai.generateEquations(spec, config, { ...options, fetch: transport }) };
  const { document, sandbox } = loadEquation(Math.random, storage, { AI: wrappedAI });
  sandbox.localStorage = storage;
  vm.runInNewContext(fs.readFileSync(path.join(ROOT, 'web-bank/ai-settings.js'), 'utf8'), sandbox);
  document.getElementById('eqAISettings').click();
  assert.equal(document.getElementById('aiBaseUrl').value, 'https://example.com/v1');
  assert.equal(document.getElementById('aiModel').value, 'model');
  document.getElementById('aiKey').value = 'fixture-secret-token';
  document.getElementById('aiSettingsForm').dispatchEvent({ type: 'submit' });
  assert.equal(document.getElementById('aiKey').value, '');
  assert.ok(!records.get('kb.ai.settings.v1').includes('fixture-secret-token'));
  document.getElementById('eqModeAI').click();
  document.getElementById('btnBuild').click();
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(calls.length, 2);
  assert.equal(calls[0].url, 'https://example.com/v1/chat/completions');
  assert.equal(calls[0].request.grade, '5年级');
  assert.equal(questionTexts(document).length, 10);
  assert.ok(document.querySelector('#eqPaper .eq-meta').textContent.includes('AI 原创'));
});

test('复制 AI 试卷时保留来源与答案核验提示', async () => {
  const kb = { AISettings: { read: () => ({ apiKey: 'test' }), open() {} },
    AI: { validateConfig: config => config, generateEquations: async () => ({ questions: [
      { text: 'x + 1 = 2', answer: 'x = 1', steps: ['两边减 1'] }
    ] }) } };
  const { document, sandbox } = loadEquation(Math.random, undefined, kb);
  let copied = '';
  sandbox.navigator.clipboard = { writeText: async text => { copied = text; } };
  sandbox.alert = () => {};
  document.getElementById('eqModeAI').click();
  document.getElementById('btnBuild').click();
  await new Promise(resolve => setImmediate(resolve));
  document.getElementById('btnCopy').click();
  await new Promise(resolve => setImmediate(resolve));
  assert.match(copied, /AI 原创/);
  assert.match(copied, /核验/);
});

test('方程页提供离线版本更新入口', () => {
  const html = fs.readFileSync(path.join(ROOT, 'web-bank/equation.html'), 'utf8');
  const document = documentFrom(html);
  assert.ok(document.getElementById('pwaUpdate'));
  assert.ok(document.getElementById('pwaUpdateApply'));
  assert.match(html, /<script src="pwa\.js"><\/script>/);
});

test('equation.html 包含自定义题量选项和输入框', () => {
  const { document } = loadEquation();
  const sel = document.querySelector('#countSel');
  assert.ok(sel, '缺少 countSel 下拉框');
  const customOpt = sel.options.find(o => o.value === 'custom');
  assert.ok(customOpt, '缺少自定义选项');

  const input = document.querySelector('#countInput');
  assert.ok(input, '缺少 countInput 输入框');
  assert.equal(input.attributes.type, 'number');
});

function questionTexts(document) {
  return document.querySelectorAll('#eqPaper .eq-text').map(node =>
    node.textContent.replace(/^\s*\d+\.\s*★?\s*/, '').trim());
}

test('连续生成时优先避开近期出现过的题目', () => {
  let seed = 123456;
  const random = () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 0x100000000);
  const { document } = loadEquation(random);
  const seen = new Set(questionTexts(document));
  for (let i = 0; i < 9; i++) {
    document.getElementById('btnBuild').click();
    const current = questionTexts(document);
    assert.equal(current.length, 10);
    assert.equal(new Set(current).size, current.length, '同一张试卷不得重复');
    for (const question of current) {
      assert.ok(!seen.has(question), '近期题目重复：' + question);
      seen.add(question);
    }
  }
});

test('刷新后仍避开已保存的近期题目', () => {
  const records = new Map();
  const storage = { getItem: key => records.get(key) || null, setItem: (key, value) => records.set(key, value) };
  function seeded() {
    let seed = 123456;
    return () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 0x100000000);
  }
  const first = questionTexts(loadEquation(seeded(), storage).document);
  const second = questionTexts(loadEquation(seeded(), storage).document);
  assert.equal(second.length, 10);
  assert.ok(second.every(text => !first.includes(text)));
});

test('本地存储不可用时仍可生成并在当前页面避开近期题目', () => {
  const storage = { getItem() { throw new Error('blocked'); }, setItem() { throw new Error('blocked'); } };
  let seed = 123456;
  const random = () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 0x100000000);
  const { document } = loadEquation(random, storage);
  const first = questionTexts(document);
  document.getElementById('btnBuild').click();
  const second = questionTexts(document);
  assert.equal(second.length, 10);
  assert.ok(second.every(text => !first.includes(text)));
});

test('无法生成足量不同题目时不以其他难度补题并提示不足', () => {
  // 恒定随机源模拟反复抽到同一题，检验重试达到上限的行为。
  const { document } = loadEquation(() => 0.5);
  const custom = document.querySelectorAll('#diffChips button').find(button => button.textContent === '自定义');
  custom.click();
  const min = document.getElementById('diffMin');
  const max = document.getElementById('diffMax');
  min.value = '3';
  min.dispatchEvent({ type: 'change' });
  max.value = '3';
  max.dispatchEvent({ type: 'change' });
  document.getElementById('btnBuild').click();

  const questions = questionTexts(document);
  assert.ok(questions.length > 0 && questions.length < 10);
  assert.equal(new Set(questions).size, questions.length);
  for (const question of questions) {
    assert.match(question, /^\d+x [+-] \d+ = \d+$/, '不能用简单题替代中等难度：' + question);
  }
  assert.match(document.getElementById('eqHint').textContent, /不足/);
  assert.ok(document.querySelector('#eqPaper .eq-meta').textContent.includes('共 ' + questions.length + ' 题'));
});

test('选择自定义题量时显示输入框并按输入题量生成题目', () => {
  const { document } = loadEquation();
  const sel = document.querySelector('#countSel');
  const input = document.querySelector('#countInput');

  // 初始状态默认为 10 题，输入框隐藏
  assert.equal(sel.value, '10');
  assert.equal(input.style.display, 'none');
  let cards = document.querySelectorAll('#eqPaper .eq-card');
  assert.equal(cards.length, 10);

  // 切换为自定义题量
  sel.value = 'custom';
  sel.dispatchEvent({ type: 'change' });
  assert.equal(input.style.display, '');

  // 输入 15 题并触发 change
  input.value = '15';
  input.dispatchEvent({ type: 'change' });
  cards = document.querySelectorAll('#eqPaper .eq-card');
  assert.equal(cards.length, 15);
  assert.ok(document.querySelector('#eqHint').textContent.includes('15 题'));
  assert.ok(document.querySelector('#eqPaper .eq-meta').textContent.includes('共 15 题'));
});

test('自定义题量输入超过 100 时截断为 100，小于 1 时截断为 1', () => {
  const { document } = loadEquation();
  const sel = document.querySelector('#countSel');
  const input = document.querySelector('#countInput');

  sel.value = 'custom';
  sel.dispatchEvent({ type: 'change' });

  // 输入 150 -> 应该被限制为 100
  input.value = '150';
  input.dispatchEvent({ type: 'change' });
  let cards = document.querySelectorAll('#eqPaper .eq-card');
  assert.equal(cards.length, 100);
  assert.equal(input.value, '100');

  // 输入 0 -> 限制为 1
  input.value = '0';
  input.dispatchEvent({ type: 'change' });
  cards = document.querySelectorAll('#eqPaper .eq-card');
  assert.equal(cards.length, 1);
  assert.equal(input.value, '1');
});

test('从自定义切回固定选项（如 20 题）时隐藏输入框并重新出题', () => {
  const { document } = loadEquation();
  const sel = document.querySelector('#countSel');
  const input = document.querySelector('#countInput');

  sel.value = 'custom';
  sel.dispatchEvent({ type: 'change' });
  input.value = '35';
  input.dispatchEvent({ type: 'change' });
  assert.equal(document.querySelectorAll('#eqPaper .eq-card').length, 35);

  // 切回 20 题
  sel.value = '20';
  sel.dispatchEvent({ type: 'change' });
  assert.equal(input.style.display, 'none');
  const cards = document.querySelectorAll('#eqPaper .eq-card');
  assert.equal(cards.length, 20);
});
