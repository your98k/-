'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const documentFrom = require('./helpers/workbench-dom.js');
const ROOT = path.join(__dirname, '..');

function loadEquation() {
  const document = documentFrom(fs.readFileSync(path.join(ROOT, 'web-bank/equation.html'), 'utf8'));
  const sandbox = {
    document,
    console,
    Math,
    parseInt,
    Number,
    String,
    isNaN,
    Array,
    Object,
    navigator: {},
    window: { print() {} }
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
