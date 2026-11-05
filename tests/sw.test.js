'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '../web-bank/sw.js'), 'utf8');
const SCOPE = 'https://example.test/school/bank/';
const CURRENT = 'k12-question-bank:/school/bank/:abc123def456';
// importScripts supplies this build-info fixture, including nested font assets.
const BUILD = {
  revision: 'abc123def456',
  assets: [
    './index.html', './style.css?v=abc123def456', './kb.bundle.js?v=abc123def456',
    './pwa.js?v=abc123def456', './manifest.webmanifest', './icons/icon-192.png',
    './icons/icon-maskable-512.png', './equation.html', './equation.css', './equation.js',
    './vendor/katex/katex.min.css?v=abc123def456',
    './vendor/katex/katex.min.js?v=abc123def456',
    './vendor/katex/fonts/KaTeX_Main-Regular.woff2',
    './vendor/katex/fonts/KaTeX_Main-Regular.woff',
    './vendor/katex/fonts/KaTeX_Math-Italic.ttf',
    './build-info.js?v=abc123def456', './build-info.json'
  ]
};
const assetURLs = BUILD.assets.map(file => new URL(file, SCOPE).href);
const INDEX = SCOPE + 'index.html';

function cacheStorage(seed = {}, addError) {
  const stores = new Map(Object.entries(seed).map(([name, entries]) =>
    [name, new Map(Object.entries(entries))]));
  const calls = { opens: [], batches: [], matches: [], deletes: [], globalMatches: 0 };
  return {
    calls,
    async open(name) {
      calls.opens.push(name);
      if (!stores.has(name)) stores.set(name, new Map());
      const entries = stores.get(name);
      return {
        async addAll(input) {
          const requests = Array.from(input);
          calls.batches.push({ name, requests });
          if (addError) throw addError;
          for (const request of requests) entries.set(request.url, 'precache:' + request.url);
        },
        async match(input) {
          const url = typeof input === 'string' ? input : input.url;
          calls.matches.push({ name, url });
          return entries.has(url) ? new Response(entries.get(url)) : undefined;
        }
      };
    },
    async keys() { return Array.from(stores.keys()); },
    async delete(name) {
      calls.deletes.push(name);
      return stores.delete(name);
    },
    async match() {
      calls.globalMatches++;
      throw new Error('CacheStorage.match can leak another application/version');
    }
  };
}

function worker({ caches = cacheStorage(), network = async () => new Response('network') } = {}) {
  const listeners = new Map();
  const calls = { skips: 0, claims: 0, network: [] };
  const self = {
    registration: { scope: SCOPE },
    clients: { async claim() { calls.claims++; } },
    async skipWaiting() { calls.skips++; },
    addEventListener(type, callback) {
      if (!listeners.has(type)) listeners.set(type, []);
      listeners.get(type).push(callback);
    }
  };
  vm.runInNewContext(source, {
    self, caches, URL, Request,
    importScripts(file) {
      assert.equal(new URL(file, SCOPE).href, SCOPE + 'build-info.js');
      self.KB_BUILD = structuredClone(BUILD);
    },
    fetch(request) {
      calls.network.push(request);
      return network(request);
    }
  }, { filename: 'sw.js' });
  return {
    calls, caches,
    dispatch(type, fields = {}) {
      const pending = [];
      let response;
      let responses = 0;
      const event = {
        ...fields,
        waitUntil(promise) { pending.push(Promise.resolve(promise)); },
        respondWith(promise) {
          assert.equal(++responses, 1, 'respondWith may only be called once');
          response = Promise.resolve(promise);
        }
      };
      for (const listener of listeners.get(type) || []) listener(event);
      return { done: Promise.all(pending), response, waits: pending.length };
    }
  };
}

function request(url, options = {}) {
  // Navigation mode cannot be constructed with Node's native Request.
  return { url, method: 'GET', mode: 'cors', ...options };
}

const offline = async () => { throw new Error('offline'); };

test('install precaches every build-info asset, including fonts, with safe Request options', async () => {
  const sw = worker();
  const install = sw.dispatch('install');
  assert.equal(install.waits, 1);
  await install.done;
  assert.equal(sw.caches.calls.batches.length, 1);
  const batch = sw.caches.calls.batches[0];
  assert.equal(batch.name, CURRENT);
  assert.deepEqual(batch.requests.map(item => item.url).sort(), [...assetURLs].sort());
  for (const item of batch.requests) {
    assert.ok(item instanceof Request);
    assert.equal(item.cache, 'reload', item.url);
    assert.equal(item.redirect, 'error', item.url);
  }
  assert.equal(sw.calls.skips, 0, 'install must wait for explicit user approval');
});

test('activate deletes only older k12 caches in this exact scope', async () => {
  const old = 'k12-question-bank:/school/bank/:old';
  const preserved = [
    CURRENT, 'mathbank-v4', 'other-app:/school/bank/:old',
    'k12-question-bank:/school/other/:old',
    'k12-question-bank:/school/bank-other/:old',
    'k12-question-bank:/school/bank/nested/:old'
  ];
  const caches = cacheStorage(Object.fromEntries([...preserved, old].map(name => [name, {}])));
  const sw = worker({ caches });
  await sw.dispatch('activate').done;
  assert.deepEqual(caches.calls.deletes, [old]);
  assert.deepEqual((await caches.keys()).sort(), [...preserved].sort());
  assert.equal(sw.calls.claims, 1);
});

test('every precached asset is served offline from this version, never another cache', async () => {
  const entries = Object.fromEntries(assetURLs.map(url => [url, 'own:' + url]));
  const foreign = Object.fromEntries(assetURLs.map(url => [url, 'foreign']));
  const caches = cacheStorage({ 'mathbank-v4': foreign, [CURRENT]: entries });
  const sw = worker({ caches, network: offline });
  for (const url of assetURLs) {
    const event = sw.dispatch('fetch', { request: request(url) });
    assert.ok(event.response, url);
    assert.equal(await (await event.response).text(), 'own:' + url);
  }
  assert.equal(caches.calls.globalMatches, 0);
  assert.ok(caches.calls.matches.every(call => call.name === CURRENT));
  assert.equal(sw.calls.network.length, 0);
});

test('offline index navigation ignores query parameters and uses the scoped index', async () => {
  const caches = cacheStorage({
    'mathbank-v4': { [INDEX]: 'foreign index' },
    [CURRENT]: { [INDEX]: 'own index' }
  });
  const sw = worker({ caches, network: offline });
  for (const url of [SCOPE, SCOPE + '?paper=42', INDEX + '?subject=math&grade=7']) {
    const event = sw.dispatch('fetch', { request: request(url, { mode: 'navigate' }) });
    assert.ok(event.response, url);
    assert.equal(await (await event.response).text(), 'own index');
  }
  assert.deepEqual(caches.calls.matches.map(call => call.url), [INDEX, INDEX, INDEX]);
  assert.equal(caches.calls.globalMatches, 0);
  assert.equal(sw.calls.network.length, 0);
});

test('offline equation navigation and its assets use the current precache', async () => {
  const page = SCOPE + 'equation.html';
  const styles = SCOPE + 'equation.css';
  const script = SCOPE + 'equation.js';
  const caches = cacheStorage({ 'mathbank-v4': { [page]: 'old equation page' } });
  const sw = worker({ caches, network: offline });
  await sw.dispatch('install').done;

  for (const [url, mode, cachedURL] of [
    [page, 'navigate', page],
    [page + '?grade=5', 'navigate', page],
    [styles, 'cors', styles],
    [script, 'cors', script]
  ]) {
    const event = sw.dispatch('fetch', { request: request(url, { mode }) });
    assert.ok(event.response, url);
    assert.equal(await (await event.response).text(), 'precache:' + cachedURL);
  }
  assert.ok(caches.calls.matches.every(call => call.name === CURRENT));
  assert.equal(caches.calls.globalMatches, 0);
  assert.equal(sw.calls.network.length, 0);
});

test('a miss in the current cache goes to the network, not another app or version', async () => {
  const url = assetURLs[1];
  const caches = cacheStorage({
    'mathbank-v4': { [url]: 'old app' },
    'k12-question-bank:/school/bank/:old': { [url]: 'old version' }
  });
  const sw = worker({ caches });
  const req = request(url);
  const response = await sw.dispatch('fetch', { request: req }).response;
  assert.equal(await response.text(), 'network');
  assert.deepEqual(sw.calls.network, [req]);
  assert.equal(caches.calls.globalMatches, 0);
});

test('an equation navigation missing from the current cache falls back to the original request', async () => {
  const page = SCOPE + 'equation.html';
  const caches = cacheStorage({ 'mathbank-v4': { [page]: 'old equation page' } });
  const sw = worker({ caches });
  const req = request(page + '?grade=5', { mode: 'navigate' });
  const event = sw.dispatch('fetch', { request: req });
  assert.ok(event.response);
  assert.equal(await (await event.response).text(), 'network');
  assert.deepEqual(sw.calls.network, [req]);
  assert.deepEqual(caches.calls.matches, [{ name: CURRENT, url: page }]);
  assert.equal(caches.calls.globalMatches, 0);
});

test('other origins, sibling paths, unknown URLs and non-GET requests are untouched', () => {
  const sw = worker();
  const untouched = [
    request('https://elsewhere.test/school/bank/index.html'),
    request('https://example.test.evil/school/bank/index.html'),
    request('http://example.test/school/bank/index.html'),
    request('https://example.test/school/bank-other/index.html'),
    request('https://example.test/school/bankish/index.html', { mode: 'navigate' }),
    request(SCOPE + 'unknown.js'),
    request(SCOPE + 'api/questions?subject=math'),
    request(SCOPE + 'course/', { mode: 'navigate' }),
    request(SCOPE + 'unknown.html?grade=5', { mode: 'navigate' }),
    request(SCOPE + 'equation.html/extra', { mode: 'navigate' }),
    request('https://elsewhere.test/school/bank/equation.html', { mode: 'navigate' }),
    request('https://example.test/school/bank-other/equation.html', { mode: 'navigate' }),
    request(SCOPE + 'equation.js', { mode: 'navigate' }),
    request(SCOPE + 'manifest.webmanifest', { mode: 'navigate' }),
    request(SCOPE + 'equation.html?not-a-navigation=1'),
    request(SCOPE + 'equation.html', { method: 'POST', mode: 'navigate' }),
    request(INDEX + '?not-a-navigation=1'),
    request(assetURLs[1] + '&unknown=1'),
    request(assetURLs[1], { method: 'POST' }),
    request(INDEX, { method: 'POST', mode: 'navigate' }),
    request(INDEX, { method: 'HEAD' })
  ];
  for (const req of untouched) {
    assert.equal(sw.dispatch('fetch', { request: req }).response, undefined, req.method + ' ' + req.url);
  }
  assert.deepEqual(sw.caches.calls.opens, []);
  assert.equal(sw.calls.network.length, 0);
});

test('a failed precache rejects install without deleting existing caches or taking control', async () => {
  const error = new Error('font download failed');
  const existing = ['k12-question-bank:/school/bank/:old', 'mathbank-v4', 'unrelated'];
  const caches = cacheStorage(Object.fromEntries(existing.map(name => [name, { [INDEX]: 'keep' }])), error);
  const sw = worker({ caches });
  await assert.rejects(sw.dispatch('install').done, failure => failure === error);
  const names = await caches.keys();
  for (const name of existing) assert.ok(names.includes(name), name);
  assert.deepEqual(caches.calls.deletes, []);
  assert.equal(await (await (await caches.open(existing[0])).match(INDEX)).text(), 'keep');
  assert.equal(sw.calls.skips, 0);
  assert.equal(sw.calls.claims, 0);
});

test('only an explicit SKIP_WAITING message requests immediate activation', async () => {
  const sw = worker();
  for (const data of [undefined, null, {}, 'SKIP_WAITING', { type: 'UPDATE' }, { type: 'skip_waiting' }]) {
    const event = sw.dispatch('message', { data });
    await event.done;
    assert.equal(event.waits, 0);
  }
  assert.equal(sw.calls.skips, 0);
  const accepted = sw.dispatch('message', { data: { type: 'SKIP_WAITING' } });
  assert.equal(accepted.waits, 1);
  await accepted.done;
  assert.equal(sw.calls.skips, 1);
});
