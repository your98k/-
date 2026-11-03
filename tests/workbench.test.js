'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const documentFrom = require('./helpers/workbench-dom.js');
const ROOT = path.join(__dirname, '..');
const Registry = require('../core/registry.js');
const Schema = require('../core/schema.js');
const Generators = require('../generators/index.js');
const Adapter = require('../web-bank/adapter.js');

function workbench() {
  const document = documentFrom(fs.readFileSync(path.join(ROOT, 'web-bank/index.html'), 'utf8'));
  const motionCalls = [], copied = [], downloads = [];
  class TestURL extends URL {
    static createObjectURL(blob) { downloads.push(blob); return 'blob:workbench-test'; }
    static revokeObjectURL() {}
  }
  const Motion = Object.fromEntries(['wheel', 'snapRail', 'setRing', 'reveal', 'celebrate', 'stack'].map(k => [k, (...args) => { motionCalls.push(k); return {}; }]));
  Motion.reduced = () => true; Motion.roll = () => ({ set() {} });
  const sandbox = { document, console, URL: TestURL, URLSearchParams, Blob, AbortController,
    location: { search: '', hash: '', href: 'https://example.invalid/' }, matchMedia: () => ({ matches: true }),
    localStorage: { getItem: () => null, setItem() {} }, navigator: { clipboard: {
      writeText: text => { copied.push(text); return Promise.resolve(); }
    } },
    setTimeout: () => 0, clearTimeout() {}, setInterval: () => 0, clearInterval() {},
    KB: { Registry, Schema, Generators, Adapter, Motion, RNG: require('../core/rng.js'),
      Paper: require('../core/paper.js'), MathRender: require('../web-bank/mathrender.js') } };
  sandbox.window = sandbox;
  // The ONLY application rewrite is replacing its final boot invocation with an
  // observation hook. Every renderer, event handler and generator stays real.
  const app = fs.readFileSync(path.join(ROOT, 'web-bank/app.js'), 'utf8');
  const end = /\bboot\(\);\s*\}\)\(\);\s*$/;
  assert.match(app, end, 'app boot boundary must remain explicit');
  const exposed = 'globalThis.workbench = { state, renderAll, renderKp, renderRail, bind, setSubject, setMode, buildPaper, blueprint, setWorkspacePane: typeof setWorkspacePane === "function" ? setWorkspacePane : null }; state.sections = clonePreset();';
  vm.runInNewContext(app.replace(end, exposed + '\n})();'), sandbox, { filename: 'web-bank/app.js', timeout: 3000 });
  const api = sandbox.workbench;
  api.renderAll(); api.bind();
  const $ = s => { const n = document.querySelector(s); assert.ok(n, 'missing real UI node: ' + s); return n; };
  const input = (s, value, type = 'input') => { const n = $(s); n.value = String(value); n.dispatchEvent({ type }); };
  const choose = (s, text) => { const n = document.querySelectorAll(s).find(n => n.textContent.trim() === text); assert.ok(n, 'missing choice ' + text); n.click(); };
  return { api, state: api.state, document, $, input, choose, motionCalls, copied, downloads };
}
function dirty(h) {
  // Simulate the stale-search bug through the application's actual listeners.
  const cb = h.document.querySelectorAll('#kpList .kp-row input').find(n => !n.disabled);
  assert.ok(cb, 'fixture needs a locally supported topic'); cb.checked = true; cb.dispatchEvent({ type: 'change' });
  h.$('#kpList .kp-ch-title button').click();
  h.input('#kpSearch', '不存在的历史筛选');
  assert.ok(Object.keys(h.state.kps).length); assert.equal(h.$('#kpSearchClear').hidden, false);
}
function cleared(h) {
  assert.equal(h.state.kpSearch, '', 'course switch clears search state');
  assert.equal(h.$('#kpSearch').value, '', 'course switch clears visible input');
  assert.equal(h.$('#kpSearchClear').hidden, true, 'clear affordance is hidden');
  assert.equal(Object.keys(h.state.kps).length, 0, 'old selected topics are discarded');
  assert.equal(Object.keys(h.state.collapsed).length, 0, 'old chapter folds are discarded');
  assert.ok(h.document.querySelectorAll('#kpList .kp-row').length, 'new course topics are actually rendered');
}
function visibleCurriculum(h) {
  const d = Registry.SUBJECTS[h.state.subject].stages[h.state.stage];
  const expected = Object.values(d.chapters).filter(ch => ch.grade === h.state.grade && (!h.state.term || ch.term === h.state.term));
  const actual = h.document.querySelectorAll('#kpList .kp-ch').map(n => n.id);
  assert.deepEqual(actual.sort(), expected.map(ch => 'ch-' + ch.id).sort());
  for (const ch of expected) for (const id of ch.kps) assert.ok(h.$('#kpList').textContent.includes(d.kpMap[id].name), 'missing topic ' + id);
}

for (const [stage, label, grades] of [['primary', '小学', [1, 2, 3, 4, 5, 6]], ['junior', '初中', [7, 8, 9]], ['senior', '高中', [10, 11, 12]]]) {
  for (const grade of grades) test('one direct grade click selects ' + grade + ', clears stale filters and renders its own curriculum', () => {
    const h = workbench(); h.choose('#stageChips button', label);
    h.$('#gradeButtons [data-grade="' + grades[grade === grades[0] ? 1 : 0] + '"]').click(); dirty(h);
    const button = h.$('#gradeButtons [data-grade="' + grade + '"]');
    assert.equal(button.tagName, 'BUTTON'); button.click();
    assert.equal(h.state.stage, stage); assert.equal(h.state.grade, grade); cleared(h); visibleCurriculum(h);
    assert.equal(h.$('#gradeButtons [data-grade="' + grade + '"]').getAttribute('aria-pressed'), 'true');
    assert.equal(h.document.querySelectorAll('#gradeButtons [aria-pressed="true"]').length, 1);
  });
}
for (const [name, action] of [
  ['subject', h => h.choose('#subjectChips button', '物理')],
  ['stage', h => h.choose('#stageChips button', '小学')],
  ['term', h => h.input('#termSel', 2, 'change')]
]) test(name + ' event clears stale topic selections, folds and search before rendering', () => {
  const h = workbench(); dirty(h); action(h); cleared(h); visibleCurriculum(h);
  if (name === 'subject') assert.equal(h.state.subject, 'physics');
  if (name === 'stage') assert.equal(h.state.stage, 'primary');
  if (name === 'term') assert.equal(h.state.term, 2);
});

test('search reveals a matching topic inside a previously collapsed chapter', () => {
  const h = workbench();
  const row = h.document.querySelectorAll('#kpList .kp-row').find(n => n.textContent.includes('内角和'));
  assert.ok(row); const chapter = row.closest('.kp-ch');
  chapter.querySelector('.kp-ch-title button').click();
  assert.equal(h.$('#' + chapter.id).querySelectorAll('.kp-row').length, 0, 'fixture chapter is collapsed');
  h.input('#kpSearch', '内角和');
  const matches = h.document.querySelectorAll('#kpList .kp-row');
  assert.ok(matches.length > 0, 'search must expand matching folded chapters');
  assert.ok(matches.every(n => n.textContent.includes('内角和')));
});
test('search clear button restores curriculum and clears its own state', () => {
  const h = workbench(); h.input('#kpSearch', '肯定不存在的知识点');
  assert.equal(h.document.querySelectorAll('#kpList .kp-row').length, 0);
  assert.equal(h.$('#kpSearchClear').hidden, false); h.$('#kpSearchClear').click();
  assert.equal(h.state.kpSearch, ''); assert.equal(h.$('#kpSearch').value, '');
  assert.equal(h.$('#kpSearchClear').hidden, true); visibleCurriculum(h);
});
test('select-all under search selects only matching supported topics, and clear deselects them', () => {
  const h = workbench(); h.input('#kpSearch', '内角和'); h.$('#kpAll').click();
  const selected = Object.keys(h.state.kps); assert.deepEqual(selected, ['tri.angle']);
  const d = Registry.SUBJECTS.math.stages.junior;
  selected.forEach(id => { assert.match(d.kpMap[id].name, /内角和/); assert.ok(Generators.support('math', 'junior').includes(id)); });
  h.$('#kpNone').click(); assert.equal(Object.keys(h.state.kps).length, 0);
});
test('real local generation after switching grades never leaks the previous grade topic pool', () => {
  const h = workbench(); h.state.sections = [{ type: 'choice', count: 2, score: 3 }];
  for (const grade of [7, 8, 9]) {
    h.$('#gradeButtons [data-grade="' + grade + '"]').click(); h.$('#btnBuild').click();
    const p = h.state.paper; assert.ok(p, 'real generator must commit a paper'); assert.equal(p.grade, grade);
    assert.equal(p.questions.length, 2);
    p.questions.forEach(q => { const kp = Registry.SUBJECTS.math.stages.junior.kpMap[q.kp]; assert.equal(kp.grade, grade); assert.equal(kp.term, 1); });
  }
});
test('an actually empty curriculum cannot trigger Paper fallback to out-of-grade questions', () => {
  const h = workbench(); h.state.sections = [{ type: 'choice', count: 1, score: 3 }]; h.$('#btnBuild').click();
  const previous = h.state.paper; assert.ok(previous);
  h.choose('#subjectChips button', '英语'); h.choose('#stageChips button', '高中'); h.input('#termSel', 2, 'change');
  assert.equal(h.document.querySelectorAll('#kpList .kp-row').length, 0, 'registry has no English grade 10 term 2');
  assert.ok(h.$('#kpList').textContent.trim(), 'empty curriculum has an explicit message');
  assert.equal(h.api.blueprint('empty').kps.length, 0);
  h.$('#btnBuild').click(); assert.equal(h.state.paper, previous, 'no replacement paper from a different curriculum');
  assert.match(h.$('#toasts').textContent, /没有|暂无|无可|不能/);
});
test('chapter context rendering is static and does not install an animated snap rail', () => {
  const h = workbench(); h.motionCalls.length = 0; h.api.renderRail();
  assert.ok(!h.motionCalls.includes('snapRail'), 'context must not install Motion.snapRail or its selection side effects');
  assert.ok(h.$('#chapterRail').textContent.trim(), 'current course still has readable static context');
});
test('workspace navigation changes pane state/body/pressed state, never the paper view mode', () => {
  const h = workbench(); assert.equal(typeof h.api.setWorkspacePane, 'function');
  assert.equal(h.state.workspacePane, 'setup');
  h.$('[data-workspace-pane="preview"]').click();
  assert.equal(h.state.workspacePane, 'preview'); assert.equal(h.document.body.dataset.workspace, 'preview'); assert.equal(h.state.mode, 'paper');
  assert.equal(h.$('[data-workspace-pane="preview"]').getAttribute('aria-pressed'), 'true');
  h.$('[data-mode="sheet"]').click(); assert.equal(h.state.mode, 'sheet');
  h.$('[data-workspace-pane="setup"]').click();
  assert.equal(h.state.workspacePane, 'setup'); assert.equal(h.document.body.dataset.workspace, 'setup'); assert.equal(h.state.mode, 'sheet');
  assert.equal(h.$('[data-workspace-pane="preview"]').getAttribute('aria-pressed'), 'false');
  assert.equal(h.$('[data-workspace-pane="setup"]').getAttribute('aria-pressed'), 'true');
});
test('mobile preview action opens preview without conflating workspace and answer-sheet mode', () => {
  const h = workbench(); h.$('[data-mode="sheet"]').click(); h.$('#btnJumpPaper').click();
  assert.equal(h.state.workspacePane, 'preview'); assert.equal(h.document.body.dataset.workspace, 'preview');
  assert.equal(h.state.mode, 'sheet'); assert.ok(h.$('#mainPreview').scrolls.length > 0);
  h.$('#btnJumpPaper').click(); assert.equal(h.state.workspacePane, 'setup');
  assert.equal(h.document.body.dataset.workspace, 'setup'); assert.equal(h.state.mode, 'sheet');
});
test('workspace checkbox toggles actual compact-paper rendering and leaves answer visibility independent', () => {
  const h = workbench(); h.state.sections = [{ type: 'calc', count: 1, score: 5 }]; h.$('#btnBuild').click();
  assert.ok(h.state.paper); assert.equal(h.state.showWorkspace, false);
  assert.equal(h.$('#viewPaper .a4').classList.contains('show-workspace'), false);
  const checkbox = h.$('#chkWorkspace'); checkbox.checked = true; checkbox.dispatchEvent({ type: 'change' });
  assert.equal(h.state.showWorkspace, true); assert.equal(h.$('#viewPaper .a4').classList.contains('show-workspace'), true);
  assert.equal(h.state.showAnswer, true);
  checkbox.checked = false; checkbox.dispatchEvent({ type: 'change' });
  assert.equal(h.state.showWorkspace, false); assert.equal(h.$('#viewPaper .a4').classList.contains('show-workspace'), false);
});

test('closing cross-grade mode removes invisible selected topics before generating', () => {
  const h = workbench();
  const cross = h.$('#chkCross'); cross.checked = true; cross.dispatchEvent({ type: 'change' });
  const oldId = 'rat.num';
  const row = h.document.querySelectorAll('#kpList .kp-row').find(n => n.textContent.includes('有理数'));
  assert.ok(row); const cb = row.querySelector('input'); cb.checked = true; cb.dispatchEvent({ type: 'change' });
  assert.ok(Object.keys(h.state.kps).length);
  cross.checked = false; cross.dispatchEvent({ type: 'change' });
  const allowed = Registry.curriculum('math', 'junior', 8, 1);
  assert.ok(!Object.keys(h.state.kps).includes(oldId));
  Array.from(h.api.blueprint().kps).forEach(id => assert.ok(allowed.includes(id)));
});

test('copy full paper preserves options, scores and visible answer analyses', async () => {
  const h = workbench(); h.state.sections = [{ type: 'choice', count: 1, score: 3 }]; h.$('#btnBuild').click();
  const q = h.state.paper.questions[0]; q.analysis = '导出解析回归检查';
  h.$('#btnTxt').click(); await Promise.resolve();
  assert.equal(h.copied.length, 1);
  q.opts.forEach(option => assert.ok(h.copied[0].includes(require('../web-bank/mathrender.js').plain(option))));
  assert.ok(h.copied[0].includes('（3 分）'));
  assert.ok(h.copied[0].includes('导出解析回归检查'));
  h.state.showAnswer = false; h.$('#btnTxt').click(); await Promise.resolve();
  assert.ok(!h.copied[1].includes('导出解析回归检查'));
});

test('Word export preserves reference analyses and worksheet answer space', async () => {
  const h = workbench(); h.state.sections = [{ type: 'calc', count: 1, score: 5 }]; h.$('#btnBuild').click();
  h.state.paper.questions[0].analysis = 'Word解析不能丢失';
  h.$('#btnWord').click();
  assert.equal(h.downloads.length, 1);
  const html = await h.downloads[0].text();
  assert.ok(html.includes('Word解析不能丢失'));
  assert.ok(html.includes('height:90px'), 'compact screen does not remove Word answer space');
});

test('AI progress and cancel live outside mobile-hidden workspace panels', () => {
  const h = workbench();
  const progress = h.$('#aiProgress');
  assert.equal(progress.closest('.main'), null);
  assert.equal(progress.closest('.sidebar'), null);
  assert.ok(progress.querySelector('#btnAICancel'));
});

test('grade activation retains the existing focusable button instead of replacing its DOM', () => {
  const h = workbench(); const button = h.$('#gradeButtons [data-grade="9"]');
  button.click();
  assert.equal(h.$('#gradeButtons [data-grade="9"]'), button);
  assert.ok(button.parentNode);
  assert.equal(button.getAttribute('aria-pressed'), 'true');
});

test('term options show per-term topic counts and mark empty terms as 未收录', () => {
  const h = workbench();
  const d = Registry.SUBJECTS.math.stages.junior;
  const expect = term => Object.values(d.chapters).filter(c => c.grade === 8 && c.term === term)
    .reduce((n, c) => n + c.kps.length, 0);
  const option = v => h.document.querySelector('#termSel option[value="' + v + '"]').textContent;
  assert.match(option('1'), new RegExp(expect(1) + ' 个考点'));
  assert.match(option('2'), new RegExp(expect(2) + ' 个考点'));
  assert.match(option('0'), new RegExp((expect(1) + expect(2)) + ' 个考点'));
  h.choose('#subjectChips button', '英语');
  h.choose('#stageChips button', '小学');
  h.$('#gradeButtons [data-grade="5"]').click();
  h.input('#termSel', 2, 'change');
  assert.equal(h.$('#kpList').querySelectorAll('.kp-row').length, 0);
  assert.match(h.$('#kpList').textContent, /暂未收录/);
  assert.match(option('2'), /未收录/);
  assert.match(option('1'), /个考点/);
});

test('empty term offers a one-tap switch to the sibling term inside the same grade', () => {
  const h = workbench();
  h.choose('#subjectChips button', '英语');
  h.choose('#stageChips button', '小学');
  h.$('#gradeButtons [data-grade="5"]').click();
  h.input('#termSel', 2, 'change');
  const button = h.document.querySelectorAll('#kpList .kp-empty button')
    .find(b => b.textContent.includes('切到上学期'));
  assert.ok(button, 'empty state must offer the sibling term');
  button.click();
  assert.equal(h.state.term, 1);
  assert.equal(h.state.grade, 5);
  assert.equal(h.$('#kpList').querySelectorAll('.kp-row').length, 1);
  assert.equal(h.$('#termSel').value, '1');
});

test('changing grade while the selected term is empty auto-picks the sibling term and explains', () => {
  const h = workbench();
  h.choose('#subjectChips button', '英语');
  h.choose('#stageChips button', '小学');
  h.input('#termSel', 2, 'change');
  h.$('#gradeButtons [data-grade="5"]').click();
  assert.equal(h.state.grade, 5);
  assert.equal(h.state.term, 1, 'grade change settles to a term that has content');
  assert.equal(h.$('#kpList').querySelectorAll('.kp-row').length, 1);
  assert.match(h.$('#toasts').textContent, /已自动切换/);
});

test('empty curriculum copy never offers silent cross-grade fallback', () => {
  const h = workbench();
  h.choose('#subjectChips button', '英语');
  h.choose('#stageChips button', '高中');
  h.$('#gradeButtons [data-grade="10"]').click();
  h.input('#termSel', 2, 'change');
  assert.equal(h.state.grade, 10);
  assert.ok(!h.$('#kpList').textContent.includes('七年级'));
  assert.ok(!h.$('#kpList').textContent.includes('八年级'));
  assert.match(h.$('#kpList').textContent, /暂未收录/);
});
