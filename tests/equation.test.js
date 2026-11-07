'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const documentFrom = require('./helpers/workbench-dom.js');
const ROOT = path.join(__dirname, '..');

function loadEquation(random = Math.random, storage) {
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
    window: { print() {}, localStorage: storage }
  };
  sandbox.window.document = document;
  const script = fs.readFileSync(path.join(ROOT, 'web-bank/equation.js'), 'utf8');
  vm.runInNewContext(script, sandbox, { filename: 'web-bank/equation.js' });
  return { document, sandbox };
}

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
