'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const source = fs.readFileSync(path.join(__dirname, '../web-bank/wrongbook.js'), 'utf8');
function fixture(seed = {}) {
  const storage = new Map(Object.entries(seed));
  const root = {};
  vm.runInNewContext(source, { window: root, localStorage: {
    getItem: key => storage.get(key) || null,
    setItem: (key, value) => storage.set(key, value)
  } });
  return { wb: root.KB.WrongBook, storage };
}
function question(extra = {}) {
  return { subject: 'math', stage: 'junior', grade: 8, term: 1, kp: 'test-kp',
    type: 'solve', diff: 3, stem: '计算 1+2。', answer: '3', analysis: '计算得到 3。', ...extra };
}

test('legacy local keys and existing marks remain unchanged', () => {
  const q = question({ stem: '原题材料'.repeat(40) });
  const key = ['math', 'junior', 'test-kp', 'solve', q.stem.slice(0, 120)].join('|');
  const old = { v: 1, items: { [key]: { ...q, key, seen: 2, wrong: 1, right: 0, result: 'wrong' } } };
  const { wb } = fixture({ 'kb.wrongbook.v1': JSON.stringify(old) });
  assert.equal(wb.keyOf(q), key);
  wb.recordPaper({ questions: [q] });
  assert.equal(wb.all().length, 1);
  assert.equal(wb.all()[0].seen, 3);
  assert.equal(wb.all()[0].result, 'wrong');
});

test('AI questions sharing a long passage remain distinct and retain provenance', () => {
  const { wb } = fixture();
  const passage = '两位同学一起阅读材料并解决问题。'.repeat(12);
  const first = question({ source: 'ai', model: 'example-model', generatedAt: '2026-11-01T00:00:00Z', stem: passage + '问题一：求总数。' });
  const second = { ...first, stem: passage + '问题二：求差值。' };
  assert.equal(first.stem.slice(0, 120), second.stem.slice(0, 120));
  assert.notEqual(wb.keyOf(first), wb.keyOf(second));
  wb.recordPaper({ questions: [first, second] });
  assert.equal(wb.all().length, 2);
  assert.ok(wb.all().every(q => q.source === 'ai' && q.model === 'example-model'));
  assert.equal(wb.mark(wb.keyOf(first), true), true);
  assert.equal(wb.wrongList().length, 1);
  assert.equal(wb.wrongList()[0].stem, first.stem);
});

test('AI and local question attribution cannot collide even for an identical stem', () => {
  const { wb } = fixture();
  const local = question();
  const ai = question({ source: 'ai', model: 'example-model' });
  assert.notEqual(wb.keyOf(local), wb.keyOf(ai));
  wb.recordPaper({ questions: [local, ai] });
  assert.equal(wb.all().length, 2);
  assert.deepEqual(Array.from(wb.all(), q => q.source).sort(), ['ai', 'local']);
});

test('wrongbook persists only allowed question fields, never API configuration', () => {
  const { wb, storage } = fixture();
  const fixtureKey = 'fixture-only-not-a-real-key';
  const q = question({ source: 'ai', apiKey: fixtureKey, endpoint: 'https://example.invalid' });
  wb.recordPaper({ questions: [q], config: { apiKey: fixtureKey } });
  const raw = storage.get('kb.wrongbook.v1');
  assert.ok(!raw.includes(fixtureKey));
  assert.ok(!raw.includes('apiKey'));
  assert.ok(!raw.includes('example.invalid'));
});
