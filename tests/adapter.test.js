'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const Registry = require('../core/registry.js');
const Adapter = require('../web-bank/adapter.js');

function juniorMath() {
  return Adapter.chaptersFromStage(Registry.SUBJECTS.math.stages.junior);
}

test('八年级上学期不混入七年级或八下章节', () => {
  const visible = Adapter.filterChapters(juniorMath(), { grade: 8, term: 1, crossGrade: false });
  const titles = visible.map(ch => ch.title);
  assert.ok(titles.some(t => t.indexOf('三角形') >= 0));
  assert.ok(titles.every(t => t.indexOf('七上') < 0 && t.indexOf('八下') < 0 && t.indexOf('九') < 0));
  visible.forEach(ch => {
    assert.equal(ch.grade, 8);
    assert.equal(ch.term, 1);
  });
});

test('全学年保留该年级上下册，跨年级才带回其他年级', () => {
  const year = Adapter.filterChapters(juniorMath(), { grade: 8, term: 0, crossGrade: false });
  assert.ok(year.some(ch => ch.term === 1 && ch.grade === 8));
  assert.ok(year.some(ch => ch.term === 2 && ch.grade === 8));
  assert.ok(year.every(ch => ch.grade === 8));
  const cross = Adapter.filterChapters(juniorMath(), { grade: 8, term: 1, crossGrade: true });
  assert.ok(cross.some(ch => ch.grade === 7));
  assert.ok(cross.some(ch => ch.grade === 9));
});

test('搜索只留下标题或考点命中的章节', () => {
  const all = Adapter.filterChapters(juniorMath(), { grade: 8, term: 1 });
  const hit = Adapter.searchChapters(all, '因式');
  assert.equal(hit.length, 1);
  assert.ok(hit[0].topics.some(t => t.name.indexOf('因式分解') >= 0));
});

test('难度预设与旧版区间一致，自定义比例才输出权重', () => {
  assert.deepEqual(Adapter.difficultySpec({ difficulty: 'basic' }).diff, [1, 2]);
  assert.deepEqual(Adapter.difficultySpec({ difficulty: 'medium' }).diff, [3, 3]);
  assert.deepEqual(Adapter.difficultySpec({ difficulty: 'advanced' }).diff, [4, 5]);
  assert.deepEqual(Adapter.difficultySpec({ difficulty: 'custom', diffMin: 2, diffMax: 4 }).diff, [2, 4]);
  const mix = Adapter.difficultySpec({ difficulty: 'mix' });
  assert.deepEqual(mix.diffMix, Adapter.DEFAULT_MIX);
  const custom = Adapter.difficultySpec({
    difficulty: 'custom', customKind: 'weights', weights: [0, 0, 50, 50, 0]
  });
  assert.ok(Math.abs(custom.diffMix[2] - 0.5) < 1e-9);
  assert.ok(Math.abs(custom.diffMix[3] - 0.5) < 1e-9);
  const view = Adapter.difficultyView({ difficulty: 'mix' });
  assert.equal(view.coef.word, '适中');
});

test('分值预设尽量压到目标满分', () => {
  const rows = Adapter.scaleToScore([
    { type: 'choice', count: 10, score: 3 },
    { type: 'fill', count: 8, score: 3 },
    { type: 'calc', count: 6, score: 5 },
    { type: 'solve', count: 4, score: 8 }
  ], 100);
  const total = rows.reduce((s, r) => s + r.count * r.score, 0);
  assert.ok(Math.abs(total - 100) <= 4, 'actual ' + total);
  assert.ok(rows.every(r => r.count >= 1 && r.score >= 1));
});

test('客观题比对忽略空格和全角，分享载荷可往返中文', () => {
  assert.equal(Adapter.answersMatch('choice', 'A', ' a '), true);
  assert.equal(Adapter.answersMatch('fill', '2(x+2)(x-2)', '２(x+2)(x-2)'), true);
  assert.equal(Adapter.answersMatch('judge', '√', '对'), true);
  assert.equal(Adapter.answersMatch('fill', 'x=1', 'x=2'), false);
  const payload = { title: '八年级 · 三角形', grade: 8, term: 1, seed: 'demo-seed-1' };
  assert.deepEqual(Adapter.decodeShare(Adapter.encodeShare(payload)), payload);
  assert.equal(Adapter.cognitiveOf({ diff: 5 }), '综合探究');
  assert.equal(Adapter.gradeLabel(8), '八年级');
  assert.equal(Adapter.gradeLabel(11), '高二');
  assert.equal(Adapter.termLabel(0), '全学年');
});
