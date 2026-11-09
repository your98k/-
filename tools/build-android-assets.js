#!/usr/bin/env node
'use strict';
// Android 只复用题库计算逻辑；输出不包含 HTML、DOM、网络或网页入口。
const fs = require('node:fs');
const path = require('node:path');
const ROOT = path.resolve(__dirname, '..');

function rhinoCompatible(source, id) {
  if (id !== 'utils/bank.js') return source;
  // Rhino 1.8.x does not implement every spread form. Only lower the known
  // static patterns in the legacy bank; fail if a new unhandled form appears.
  source = source
    .replace(/\[\.\.\.new Set\((\[[^\n]*\])\)\]/g, 'Array.from(new Set($1))')
    .replace(/\[\.\.\.(a|set|raw)\]/g, 'Array.from($1)')
    .replace(/Math\.(max|min)\(\.\.\.arr\)/g, 'Math.$1.apply(null, arr)')
    .replace(/\{ \.\.\.eqApp\(\), ws: 'l' \}/g, "Object.assign({}, eqApp(), { ws: 'l' })")
    .replace(/\{ \.\.\.r, ws: '([ml])' \}/g, "Object.assign({}, r, { ws: '$1' })");
  if (/\.\.\./.test(source)) throw Error('Android 题库中出现未处理的 spread 语法：' + id);
  return source;
}

function buildQuestionBundle() {
  const modules = new Map();
  function add(file) {
    const id = path.relative(ROOT, file).replace(/\\/g, '/');
    if (modules.has(id)) return id;
    const source = rhinoCompatible(fs.readFileSync(file, 'utf8'), id);
    const entry = { source, deps: {} };
    modules.set(id, entry);
    for (const match of source.matchAll(/require\(\s*['"]([^'"]+)['"]\s*\)/g)) {
      if (!match[1].startsWith('.')) throw Error('Android 题库不允许外部依赖：' + match[1]);
      let target = path.resolve(path.dirname(file), match[1]);
      if (!target.endsWith('.js')) target += '.js';
      entry.deps[match[1]] = add(target);
    }
    return id;
  }
  ['core/paper.js', 'core/registry.js', 'core/schema.js', 'generators/index.js'].forEach(file => add(path.join(ROOT, file)));
  const definitions = [...modules].map(([id, mod]) => JSON.stringify(id) + ': function(module, exports, require) {\n' + mod.source + '\n}').join(',\n');
  const dependencies = Object.fromEntries([...modules].map(([id, mod]) => [id, mod.deps]));
  return '/* Generated native calculation asset; no browser UI. */\nvar NativeQuestionBank = (function () {\n' +
    'var __defs = {' + definitions + '};\nvar __deps = ' + JSON.stringify(dependencies) + ';\n' +
    `var __cache = {};
function __load(id) {
  if (__cache[id]) return __cache[id].exports;
  var module = { exports: {} }; __cache[id] = module;
  __defs[id](module, module.exports, function (p) { return __load(__deps[id][p]); });
  return module.exports;
}
var Paper = __load('core/paper.js'), Registry = __load('core/registry.js');
var Schema = __load('core/schema.js'), Generators = __load('generators/index.js');
function valid(spec) {
  if (!spec || !Registry.SUBJECTS[spec.subject] || !Schema.STAGES[spec.stage] ||
      Schema.STAGES[spec.stage].grades.indexOf(spec.grade) < 0 || [0,1,2].indexOf(spec.term) < 0) throw Error('学科、学段、年级或学期无效');
}
function topicList(spec, forAI) {
  valid(spec);
  var ids = Registry.curriculum(spec.subject, spec.stage, spec.grade, spec.term === 0 ? 1 : spec.term).slice();
  if (spec.term === 0) Registry.curriculum(spec.subject, spec.stage, spec.grade, 2).forEach(function (id) { if (ids.indexOf(id) < 0) ids.push(id); });
  var supported = Generators.support(spec.subject, spec.stage) || [];
  return Registry.kps(spec.subject, spec.stage).filter(function (kp) { return ids.indexOf(kp.id) >= 0 && (forAI || (supported.indexOf(kp.id) >= 0 && kp.gen !== false)); })
    .map(function (kp) { return { id: kp.id, name: kp.name }; });
}
function generate(spec) {
  var topics = topicList(spec, false), allowed = topics.map(function (t) { return t.id; });
  if (!allowed.length) throw Error('本年级学期暂无本地题目，请调整学期或使用 AI 出题');
  var chosen = spec.kps && spec.kps.length ? spec.kps : allowed;
  if (!chosen.every(function (id) { return allowed.indexOf(id) >= 0; })) throw Error('知识点不属于当前年级学期');
  if (!Schema.TYPES[spec.type] || spec.count < 1 || spec.count > 100 || spec.count !== Math.floor(spec.count)) throw Error('题型或题量无效');
  if (spec.diffMin < 1 || spec.diffMax > 5 || spec.diffMin > spec.diffMax) throw Error('难度范围无效');
  var paper = Paper.generatePaper({ subject: spec.subject, stage: spec.stage, grade: spec.grade, term: spec.term,
    kps: chosen, seed: 'android-' + Date.now() + '-' + Math.random(), sections: [{ type: spec.type, count: spec.count, diff: [spec.diffMin, spec.diffMax] }] });
  return { title: paper.title, source: 'local', notice: paper.questions.length < spec.count ? '当前题型仅生成 ' + paper.questions.length + ' 题，请调整知识点或题型。' : '',
    questions: paper.questions.map(function (q) { return { id: q.id, stem: q.stem, answer: q.answer, analysis: q.analysis, opts: q.opts || [], kp: q.kp, source: 'local' }; }) };
}
return { topicsJson: function (json) { var spec = JSON.parse(json); return JSON.stringify(topicList(spec, spec.ai)); }, generateJson: function (json) { return JSON.stringify(generate(JSON.parse(json))); } };
})();\n`;
}

function buildEquationBundle() {
  const source = fs.readFileSync(path.join(ROOT, 'web-bank/equation.js'), 'utf8');
  const start = source.indexOf('  /* ---------------- 基础工具 ---------------- */');
  const end = source.indexOf('  /* ---------------- 生成 ---------------- */', start);
  if (start < 0 || end < 0) throw Error('未找到纯方程工厂边界，停止 Android 构建');
  const factories = source.slice(start, end);
  if (/\b(document|window|navigator|localStorage|fetch)\b/.test(factories)) throw Error('方程计算资产不可包含网页或网络依赖');
  return '/* Generated native equation calculation asset; no browser UI. */\nvar NativeEquationBank = (function () {\n' +
    `var state = {}, recent = [], serial = 0;
var DIFF_NAMES = ['易', '较易', '中', '较难', '难'];
` + factories + `
function generate(json) {
  var spec = JSON.parse(json), ranges = { primary: [1,6], junior: [7,9], senior: [10,12] };
  var range = ranges[spec.stage];
  if (!range || spec.grade < range[0] || spec.grade > range[1] || spec.count < 1 || spec.count > 100 || spec.count !== Math.floor(spec.count)) throw Error('学段、年级或题量无效');
  if (spec.diffMin < 1 || spec.diffMax > 5 || spec.diffMin > spec.diffMax) throw Error('难度范围无效');
  state = { stage: spec.stage, grade: spec.grade, term: spec.term, difficulty: 'custom', diffMin: spec.diffMin, diffMax: spec.diffMax };
  var questions = [], used = {}, reused = false;
  for (var pass = 0; pass < 2 && questions.length < spec.count; pass++) {
    for (var guard = 0; guard < spec.count * 80 && questions.length < spec.count; guard++) {
      var q = makeQuestion(pickDiff());
      if (!q) continue;
      var stem = q.text.replace(/<br\\s*\\/?>/gi, '\\n'), key = stem.replace(/\\s+/g, '');
      if (used[key] || (pass === 0 && recent.indexOf(key) >= 0)) continue;
      if (recent.indexOf(key) >= 0) reused = true;
      used[key] = true;
      questions.push({ id: 'equation-' + (++serial), stem: stem, answer: q.answer,
        analysis: (q.steps || []).concat(q.checkText ? [q.checkText] : []).join('\\n'), opts: [], kp: 'equation', source: 'local' });
    }
  }
  recent = recent.concat(Object.keys(used)).slice(-500);
  return JSON.stringify({ title: gradeLabel(spec.grade) + '方程专项练习', questions: questions, source: 'local',
    notice: questions.length < spec.count ? '未找到足量不同题目，本次生成 ' + questions.length + ' 题。' : reused ? '本次使用了部分近期题目。' : '' });
}
return { generateJson: generate };
})();\n`;
}

function writeAssets(destination = path.join(ROOT, 'android/app/src/main/assets')) {
  fs.mkdirSync(destination, { recursive: true });
  fs.writeFileSync(path.join(destination, 'question-bank.js'), buildQuestionBundle(), 'utf8');
  fs.writeFileSync(path.join(destination, 'equation-bank.js'), buildEquationBundle(), 'utf8');
  return destination;
}
if (require.main === module) console.log('已生成 Android 计算资产：' + writeAssets(process.argv[2]));
module.exports = { buildQuestionBundle, buildEquationBundle, writeAssets };
