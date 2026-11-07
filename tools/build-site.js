#!/usr/bin/env node
/* 一条命令构建完整离线站点；_site 是唯一发布目录。 */
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { execFileSync } = require('node:child_process');
const { Resvg } = require('@resvg/resvg-js');
const pkg = require('../package.json');

const ROOT = path.resolve(__dirname, '..');
const SOURCE = path.join(ROOT, 'web-bank');
const OUT = path.join(ROOT, '_site');
const KATEX = path.dirname(require.resolve('katex/package.json'));

fs.rmSync(OUT, { recursive: true, force: true });
fs.cpSync(SOURCE, OUT, {
  recursive: true,
  filter: file => !['vendor', 'kb.bundle.js', 'entry.js'].includes(path.basename(file))
});
execFileSync(process.execPath, [path.join(__dirname, 'build-web.js'), path.join(OUT, 'kb.bundle.js')], {
  stdio: 'inherit'
});

const vendor = path.join(OUT, 'vendor', 'katex');
fs.mkdirSync(vendor, { recursive: true });
for (const file of ['katex.min.js', 'katex.min.css', 'fonts']) {
  fs.cpSync(path.join(KATEX, 'dist', file), path.join(vendor, file), { recursive: true });
}
fs.copyFileSync(path.join(KATEX, 'LICENSE'), path.join(vendor, 'LICENSE'));
fs.copyFileSync(path.join(ROOT, 'LICENSE'), path.join(OUT, 'LICENSE'));

// 源图标中的文字已转成路径，CI 不需要安装中文字体。
const svg = fs.readFileSync(path.join(SOURCE, 'icons', 'icon.svg'), 'utf8');
function png(source, size, file) {
  const image = new Resvg(source, {
    background: '#0e6b5c',
    fitTo: { mode: 'width', value: size },
    font: { loadSystemFonts: false }
  }).render();
  fs.writeFileSync(path.join(OUT, 'icons', file), image.asPng());
}
for (const size of [180, 192, 512]) png(svg, size, `icon-${size}.png`);
// 独立的 maskable 图标：满画布底色 + 25% 内缩，重要内容位于安全区。
const maskable = svg.replace(/<svg\b[^>]*>/,
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">' +
  '<rect width="512" height="512" fill="#0e6b5c"/><g transform="translate(64 64) scale(.75)">')
  .replace('</svg>', '</g></svg>');
png(maskable, 512, 'icon-maskable-512.png');
fs.writeFileSync(path.join(OUT, '.nojekyll'), '');

function filesIn(dir, prefix = '') {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const relative = prefix + entry.name;
    return entry.isDirectory()
      ? filesIn(path.join(dir, entry.name), relative + '/')
      : [relative];
  }).sort();
}

// 按路径与内容计算版本；不依赖时钟或 Git 环境，相同输入生成相同版本。
// 包括 sw.js 本身，修改缓存策略也会触发浏览器检测更新。
const files = filesIn(OUT);
const hash = crypto.createHash('sha256').update(pkg.version + '\0');
for (const file of files) {
  hash.update(file + '\0').update(fs.readFileSync(path.join(OUT, file))).update('\0');
}
const revision = hash.digest('hex').slice(0, 12);
// 为 HTML 的脚本/样式链接加构建指纹，避开旧 v4 Worker 的无版本 URL 缓存。
// 指纹由注入前的内容计算，避免循环哈希。
const linked = new Set();
for (const name of ['index.html', 'equation.html']) {
  const page = path.join(OUT, name);
  const html = fs.readFileSync(page, 'utf8').replace(/\b(src|href)="([^"]+\.(?:js|css))"/g,
    (_, attribute, file) => {
      linked.add('./' + file);
      return `${attribute}="${file}?v=${revision}"`;
    });
  fs.writeFileSync(page, html);
}
const info = {
  version: pkg.version,
  revision,
  assets: files.filter(file => file !== 'sw.js' && file !== '.nojekyll')
    .map(file => './' + file)
    .map(file => linked.has(file) ? file + '?v=' + revision : file)
    .concat('./build-info.js?v=' + revision, './build-info.json')
};
const json = JSON.stringify(info, null, 2);
fs.writeFileSync(path.join(OUT, 'build-info.json'), json + '\n');
fs.writeFileSync(path.join(OUT, 'build-info.js'),
  '/* 自动生成，请勿手改。 */\nself.KB_BUILD = Object.freeze(' + json + ');\n');
console.log(`完整站点：_site/ · v${info.version} · ${info.revision} · 离线资源 ${info.assets.length} 个`);
