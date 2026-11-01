#!/usr/bin/env node
/* =========================================================
 * 极简 CommonJS 打包器：把 core/ + generators/ + utils/bank.js
 * 打成一个浏览器可直接 <script> 引入的 kb.bundle.js
 * 用法：node tools/build-web.js
 * ======================================================= */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const ENTRY = path.join(ROOT, 'web-bank', 'entry.js');
const OUT = process.argv[2]
  ? path.resolve(process.argv[2])
  : path.join(ROOT, 'web-bank', 'kb.bundle.js');

const modules = new Map(); // id -> {code, deps}

function idOf(file) {
  return path.relative(ROOT, file).replace(/\\/g, '/');
}

function resolveRequire(fromFile, req) {
  if (!req.startsWith('.')) throw new Error('不支持外部依赖：' + req + ' (来自 ' + fromFile + ')');
  let p = path.resolve(path.dirname(fromFile), req);
  if (!p.endsWith('.js')) p += '.js';
  if (!fs.existsSync(p)) throw new Error('找不到模块：' + req + ' (来自 ' + fromFile + ')');
  return p;
}

function add(file) {
  const id = idOf(file);
  if (modules.has(id)) return id;
  const code = fs.readFileSync(file, 'utf8');
  const deps = {};
  const re = /require\(\s*['"]([^'"]+)['"]\s*\)/g;
  let m;
  const entry = { code, deps };
  modules.set(id, entry); // 先占位，避免循环引用
  while ((m = re.exec(code)) !== null) {
    const abs = resolveRequire(file, m[1]);
    deps[m[1]] = idOf(abs);
    add(abs);
  }
  return id;
}

add(ENTRY);

let out = '/* 自动生成，请勿手改。源：core/ generators/ utils/ */\n';
out += '(function(){\n"use strict";\n';
out += 'var __defs = {\n';
const parts = [];
for (const [id, mod] of modules) {
  parts.push(
    JSON.stringify(id) + ': function(module, exports, require){\n' + mod.code + '\n}'
  );
}
out += parts.join(',\n');
out += '\n};\n';
out += 'var __deps = ' + JSON.stringify(
  Object.fromEntries([...modules].map(([id, m]) => [id, m.deps]))
) + ';\n';
out += `
var __cache = {};
function __load(id){
  if (__cache[id]) return __cache[id].exports;
  var m = { exports: {} };
  __cache[id] = m;
  var deps = __deps[id] || {};
  __defs[id](m, m.exports, function(p){ return __load(deps[p]); });
  return m.exports;
}
window.KB = window.KB || {};
__load(${JSON.stringify(idOf(ENTRY))});
if (typeof console !== 'undefined') console.log('[题库内核] 已加载，模块数 ' + Object.keys(__defs).length);
})();
`;

fs.writeFileSync(OUT, out, 'utf8');
console.log('已生成 ' + path.relative(ROOT, OUT) + '（' + modules.size + ' 个模块，' + (out.length / 1024).toFixed(1) + ' KB）');
