const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const vm = require('node:vm');
const { execFileSync } = require('node:child_process');
const katex = require('katex');

const ROOT = path.resolve(__dirname, '..');
let fixture;
function read(file) { return fs.readFileSync(path.join(fixture, '_site', file)); }
function info() { return JSON.parse(read('build-info.json')); }
function build() {
  execFileSync(process.execPath, [path.join(fixture, 'tools', 'build-site.js')], { stdio: 'pipe' });
}

test.before(() => {
  // 在独立副本里验证内容变更，不修改开发者工作区或 node_modules。
  fixture = fs.mkdtempSync(path.join(os.tmpdir(), 'k12-build-test-'));
  for (const dir of ['tools', 'web-bank', 'core', 'generators', 'utils']) {
    fs.cpSync(path.join(ROOT, dir), path.join(fixture, dir), {
      recursive: true,
      filter: file => !['vendor', 'kb.bundle.js'].includes(path.basename(file))
    });
  }
  for (const file of ['package.json', 'LICENSE']) {
    fs.copyFileSync(path.join(ROOT, file), path.join(fixture, file));
  }
  fs.symlinkSync(path.join(ROOT, 'node_modules'), path.join(fixture, 'node_modules'),
    process.platform === 'win32' ? 'junction' : 'dir');
  build();
});
test.after(() => {
  if (fixture) fs.rmSync(fixture, { recursive: true, force: true });
});

test('构建输出真实 PNG 尺寸、安装清单和无字体依赖的源图标', () => {
  for (const [file, size] of [
    ['icon-180.png', 180], ['icon-192.png', 192],
    ['icon-512.png', 512], ['icon-maskable-512.png', 512]
  ]) {
    const png = read('icons/' + file);
    assert.deepEqual(png.subarray(0, 8), Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
    assert.equal(png.readUInt32BE(16), size);
    assert.equal(png.readUInt32BE(20), size);
  }
  const manifest = JSON.parse(read('manifest.webmanifest'));
  assert.ok(manifest.icons.some(icon => icon.sizes === '192x192' && icon.type === 'image/png'));
  assert.ok(manifest.icons.some(icon => icon.sizes === '512x512' && icon.purpose === 'maskable'));
  for (const icon of manifest.icons) assert.ok(read(icon.src).length > 0);
  assert.match(read('index.html').toString(), /apple-touch-icon[^>]+icons\/icon-180\.png/);
  assert.doesNotMatch(read('icons/icon.svg').toString(), /<text\b|font-family=/);
});

test('离线清单包含 HTML 实际引用的指纹资源和全部 KaTeX 字体', () => {
  const metadata = info();
  const assets = new Set(metadata.assets);
  const base = 'https://example.test/k12-ai-question-bank/';
  for (const asset of assets) {
    const url = new URL(asset, base);
    assert.ok(url.href.startsWith(base));
    assert.ok(read(decodeURIComponent(url.pathname.slice(new URL(base).pathname.length))).length > 0);
  }
  const html = read('index.html').toString();
  const urls = [...html.matchAll(/(?:src|href)="([^"]+\.(?:js|css)(?:\?[^"]*)?)"/g)]
    .map(match => match[1]);
  assert.ok(urls.length >= 7);
  for (const url of urls) {
    assert.ok(assets.has('./' + url), '漏缓存页面资源：' + url);
    assert.equal(new URL(url, base).searchParams.get('v'), metadata.revision);
  }
  const fonts = fs.readdirSync(path.join(fixture, '_site/vendor/katex/fonts'));
  assert.ok(fonts.length > 10);
  for (const font of fonts) assert.ok(assets.has('./vendor/katex/fonts/' + font));
  const css = read('vendor/katex/katex.min.css').toString();
  for (const match of css.matchAll(/url\(([^)]+)\)/g)) {
    const font = match[1].replace(/["']/g, '');
    assert.ok(assets.has('./vendor/katex/' + font), '漏缓存 CSS 字体：' + font);
  }
});

test('方程专项页面及其样式和脚本都包含在离线构建中', () => {
  const base = 'https://example.test/k12-ai-question-bank/equation.html';
  const assets = new Set(info().assets.map(url => new URL(url, base).href));
  assert.ok(assets.has(base), '漏缓存方程专项页面');
  const html = read('equation.html').toString();
  const urls = [...html.matchAll(/(?:src|href)="([^"]+\.(?:js|css)(?:\?[^"]*)?)"/g)]
    .map(match => match[1]);
  assert.ok(urls.some(url => /\.css(?:\?|$)/.test(url)), '方程页面缺少样式');
  assert.ok(urls.some(url => /\.js(?:\?|$)/.test(url)), '方程页面缺少脚本');
  for (const url of urls) assert.ok(assets.has(new URL(url, base).href), '漏缓存方程页面资源：' + url);
});

test('相同内容重复构建的版本与发布文件完全一致', () => {
  const before = info();
  const bundle = read('kb.bundle.js');
  const html = read('index.html');
  const icon = read('icons/icon-512.png');
  build();
  assert.deepEqual(info(), before);
  assert.deepEqual(read('kb.bundle.js'), bundle);
  assert.deepEqual(read('index.html'), html);
  assert.deepEqual(read('icons/icon-512.png'), icon);
});

test('修改样式、缓存策略或出题代码都会自动改变构建版本', () => {
  const originalRevision = info().revision;
  for (const file of ['web-bank/style.css', 'web-bank/sw.js', 'core/rng.js']) {
    const target = path.join(fixture, file);
    const original = fs.readFileSync(target);
    try {
      fs.appendFileSync(target, '\n/* content-change regression */\n');
      build();
      assert.notEqual(info().revision, originalRevision, file + ' 未触发更新');
    } finally {
      fs.writeFileSync(target, original);
    }
  }
  build();
  assert.equal(info().revision, originalRevision);
});

test('页面、内核使用同一个 package 版本；KaTeX 常见公式仍能严格渲染', () => {
  const context = {};
  context.self = context;
  context.window = context;
  vm.runInNewContext(read('build-info.js').toString(), context);
  vm.runInNewContext(read('kb.bundle.js').toString(), context);
  assert.equal(context.KB.version, require('../package.json').version);
  assert.equal(context.KB_BUILD.revision, info().revision);
  assert.equal(context.KB.ready, true);
  assert.equal(typeof context.KB.Paper.generatePaper, 'function');
  for (const formula of ['\\frac{1}{2}', 'x^2+2x+1', '\\sqrt{3}',
    '\\mathrm{H_2O}', '\\sin\\theta=\\frac{1}{2}']) {
    assert.doesNotThrow(() => katex.renderToString(formula, { throwOnError: true }));
  }
});
