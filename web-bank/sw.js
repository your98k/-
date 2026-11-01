/* PWA 缓存版本由 npm run build 生成，不需要手动 bump。
 * importScripts 的内容变化也参与 Service Worker 更新检测。
 */
importScripts('./build-info.js');

const SCOPE = self.registration.scope;
const PREFIX = 'k12-question-bank:' + new URL(SCOPE).pathname + ':';
const VERSION = PREFIX + self.KB_BUILD.revision;
const CORE = self.KB_BUILD.assets.map(file => new URL(file, SCOPE).href);
const ASSETS = new Set(CORE);
const INDEX = new URL('./index.html', SCOPE).href;

self.addEventListener('install', event => {
  // 整批资源缓存成功才算安装成功，包括 KaTeX 所有字体。
  // 不自动 skipWaiting：有用户正在出卷时，不接管或刷新页面。
  event.waitUntil(caches.open(VERSION).then(cache => cache.addAll(
    CORE.map(url => new Request(url, { cache: 'reload', redirect: 'error' }))
  )));
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys
        .filter(key => key.startsWith(PREFIX) && key !== VERSION)
        .map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    event.waitUntil(self.skipWaiting());
  }
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const scope = new URL(SCOPE);
  if (url.origin !== scope.origin || !url.pathname.startsWith(scope.pathname)) return;

  // 每一代页面与资源均从同一个版本缓存读取，避免新 HTML 搭配旧脚本。
  // 仅处理本站首页和构建清单里的资源，其他 URL 交给网络。
  let key = url.href;
  if (req.mode === 'navigate') {
    if (url.pathname !== scope.pathname && url.pathname !== new URL(INDEX).pathname) return;
    key = INDEX;
  } else if (!ASSETS.has(key)) {
    return;
  }
  event.respondWith(caches.open(VERSION).then(async cache => {
    const hit = await cache.match(key);
    return hit || fetch(req);
  }));
});
