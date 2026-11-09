'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
const assets = require('../tools/build-android-assets.js');

function runtime() {
  const scope = {};
  vm.runInNewContext(assets.buildQuestionBundle(), scope);
  vm.runInNewContext(assets.buildEquationBundle(), scope);
  return scope;
}
const base = { subject: 'math', stage: 'primary', grade: 5, term: 1, count: 5, type: 'choice', diffMin: 2, diffMax: 3, kps: [], equation: false, ai: false };

test('Android 声明转换保留属性名、题干文本、模板表达式和块作用域', () => {
  const source = [
    'const text = "const a = 题干";',
    'const object = { const: "const", read() { return this.const; } };',
    'function pick(n) { switch(n) { case 1: { const a = 1; return a; } case 2: { const a = 2; return a; } } }',
    'const closures = []; for (const n of [1, 2]) closures.push(() => n);',
    'const template = `const ${(() => { const a = 3; return a; })()}`;',
    'JSON.stringify([text, object.read(), /const/.source, pick(2), closures.map(f => f()), template]);'
  ].join('\n');
  const lowered = assets.blockScopedDeclarations(source);
  assert.equal(vm.runInNewContext(lowered), vm.runInNewContext(source));
  // The runtime regression in QuestionEngineTest exercises the generated assets
  // in Rhino; this fixture additionally protects text and identifier fidelity.
  assert.match(lowered, /case 2: \{ let a = 2/);
});

test('Android 题库只暴露 JSON 计算接口，不依赖页面全局对象', () => {
  const s = runtime();
  const topics = JSON.parse(s.NativeQuestionBank.topicsJson(JSON.stringify(base)));
  assert.ok(topics.some(t => t.id === 'equation'));
  const paper = JSON.parse(s.NativeQuestionBank.generateJson(JSON.stringify(base)));
  assert.equal(paper.questions.length, 5);
  assert.equal(paper.source, 'local');
  assert.equal(typeof s.window, 'undefined');
  assert.equal(typeof s.document, 'undefined');
});

test('Android 题库构建期降级 Rhino 未支持的 spread 语法', () => {
  const bundle = assets.buildQuestionBundle();
  assert.doesNotMatch(bundle, /\.\.\.\s*(?:[A-Za-z_$]|\[)/);
  assert.match(bundle, /Math\.max\.apply\(null, arr\)/);
});

test('Android AI 知识点保留本年级尚无本地生成器的课程', () => {
  const s = runtime();
  const spec = { ...base, subject: 'english', grade: 6, term: 2 };
  assert.deepEqual(JSON.parse(s.NativeQuestionBank.topicsJson(JSON.stringify(spec))), []);
  const aiTopics = JSON.parse(s.NativeQuestionBank.topicsJson(JSON.stringify({ ...spec, ai: true })));
  assert.ok(aiTopics.some(t => t.id === 'eng.p.read'));
});

test('Android 题库不使用原内核的跨年级兜底知识点', () => {
  const s = runtime();
  const spec = { ...base, subject: 'english', grade: 1 };
  assert.deepEqual(JSON.parse(s.NativeQuestionBank.topicsJson(JSON.stringify(spec))), []);
  assert.throws(() => s.NativeQuestionBank.generateJson(JSON.stringify(spec)), /暂无本地/);
  assert.throws(() => s.NativeQuestionBank.generateJson(JSON.stringify({ ...base, kps: ['intAddSub'] })), /当前年级/);
});

test('Android 方程资产支持三个学段，题目为原生文本', () => {
  const s = runtime();
  for (const [stage, grade] of [['primary', 5], ['junior', 8], ['senior', 10]]) {
    const paper = JSON.parse(s.NativeEquationBank.generateJson(JSON.stringify({ ...base, stage, grade, equation: true })));
    assert.equal(paper.questions.length, 5);
    assert.equal(new Set(paper.questions.map(q => q.stem)).size, 5);
    assert.ok(paper.questions.every(q => q.stem && q.answer && !/<br>/.test(q.stem)));
  }
});

test('公开 Android 源码与计算资产不内置个人服务地址或访问口令', () => {
  const sourceRoot = path.join(__dirname, '../android/app/src/main');
  const files = [];
  function visit(directory) {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const file = path.join(directory, entry.name);
      if (entry.isDirectory()) visit(file);
      else if (/\.(?:kt|xml|js|json)$/i.test(entry.name)) files.push(file);
    }
  }
  visit(sourceRoot);
  const content = files.map(file => fs.readFileSync(file, 'utf8')).concat(assets.buildQuestionBundle(), assets.buildEquationBundle()).join('\n');
  // These identify the owner's private deployment, not generic setup help.
  assert.equal(/us\.1029\.indevs\.in|zuiaimy(?:\.workers\.dev)?|k12-ai-private-proxy/i.test(content), false,
    'The public app must start without the owner’s private service configuration');
  assert.equal(/(?:val|var)\s+(?:apiKey|accessToken)\s*(?::\s*String)?\s*=\s*"[^"\s][^"]*"/.test(content), false,
    'API credentials must not have nonempty source defaults');
  assert.equal(/(?:ACCESS_TOKEN|UPSTREAM_KEY)\s*(?:=|to|:)\s*["'][^"'\s][^"']*["']/.test(content), false,
    'Generic ACCESS_TOKEN setup instructions are allowed; embedded values are not');
});

test('Android 运行时代码不包含网页渲染或 JavaScript 界面桥接', () => {
  const javaRoot = path.join(__dirname, '../android/app/src/main/java');
  const text = fs.readdirSync(path.join(javaRoot, 'io/github/your98k/questionbank'))
    .filter(name => name.endsWith('.kt'))
    .map(name => fs.readFileSync(path.join(javaRoot, 'io/github/your98k/questionbank', name), 'utf8')).join('\n');
  assert.equal(/import\s+(?:android\.webkit\.(?:WebView|WebViewClient|WebChromeClient)|androidx\.webkit\.|com\.getcapacitor\.)|\baddJavascriptInterface\s*\(|\bWebView\s*\(/.test(text), false,
    'Compose must render the interface; Rhino may only compute question data');
  const manifest = fs.readFileSync(path.join(sourceRootForManifest(), 'AndroidManifest.xml'), 'utf8');
  assert.match(manifest, /android:usesCleartextTraffic="false"/);
  assert.match(manifest, /android:allowBackup="false"/);
});

function sourceRootForManifest() { return path.join(__dirname, '../android/app/src/main'); }
