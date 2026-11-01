'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '../web-bank/pwa.js'), 'utf8');

function eventTarget(fields = {}) {
  const listeners = new Map();
  return Object.assign(fields, {
    addEventListener(type, callback) {
      if (!listeners.has(type)) listeners.set(type, []);
      listeners.get(type).push(callback);
    },
    dispatchEvent(event) {
      event.target = this;
      for (const callback of listeners.get(event.type) || []) callback.call(this, event);
      const handler = this['on' + event.type];
      if (typeof handler === 'function') handler.call(this, event);
      return true;
    }
  });
}

function installingWorker(state = 'installing') {
  return eventTarget({
    state,
    messages: [],
    postMessage(message) { this.messages.push(structuredClone(message)); }
  });
}

// A full event-loop turn drains register().then(...).catch(...) and nested microtasks.
const flush = () => new Promise(resolve => setImmediate(resolve));

function page({ controller = {}, waiting = null, installing = null, confirmed = true } = {}) {
  const calls = { registrations: [], confirmations: [], reloads: 0, warnings: [] };
  const registration = eventTarget({ waiting, installing });
  const serviceWorker = eventTarget({
    controller,
    register(...args) {
      calls.registrations.push(args);
      return Promise.resolve(registration);
    }
  });
  const banner = eventTarget({ hidden: true });
  const button = eventTarget({ disabled: false });
  const elements = { pwaUpdate: banner, pwaUpdateApply: button };
  const location = { protocol: 'https:', reload() { calls.reloads++; } };
  const window = eventTarget({
    location,
    matchMedia: () => ({ matches: false }),
    confirm(message) {
      calls.confirmations.push(message);
      return confirmed;
    }
  });
  vm.runInNewContext(source, {
    navigator: { userAgent: 'Node regression browser', maxTouchPoints: 0, serviceWorker },
    window, location,
    document: { getElementById: id => elements[id] || null },
    console: { warn(...args) { calls.warnings.push(args); } }
  }, { filename: 'pwa.js' });
  return {
    calls, registration, serviceWorker, banner, button,
    async load() {
      window.dispatchEvent({ type: 'load' });
      await flush();
      assert.deepEqual(calls.warnings, [], 'registration must not fail silently');
    },
    clickUpdate() { button.dispatchEvent({ type: 'click' }); },
    changeController() {
      serviceWorker.controller = {};
      serviceWorker.dispatchEvent({ type: 'controllerchange' });
    }
  };
}

test('load registers the relative worker with HTTP cache bypass for update checks', async () => {
  const app = page();
  assert.equal(app.calls.registrations.length, 0);
  await app.load();
  assert.equal(app.calls.registrations.length, 1);
  const [url, options] = app.calls.registrations[0];
  assert.equal(url, './sw.js');
  assert.equal(options.updateViaCache, 'none');
});

test('first installation does not offer an update or reload on initial control', async () => {
  const app = page({ controller: null });
  await app.load();
  const worker = installingWorker();
  app.registration.installing = worker;
  app.registration.dispatchEvent({ type: 'updatefound' });
  app.registration.waiting = worker;
  app.registration.installing = null;
  worker.state = 'installed';
  worker.dispatchEvent({ type: 'statechange' });
  await flush();
  assert.equal(app.banner.hidden, true);
  app.changeController();
  assert.equal(app.calls.reloads, 0);
  assert.deepEqual(worker.messages, []);
});

test('controller changes initiated by another tab never reload an unconfirmed page', async () => {
  const worker = installingWorker('installed');
  const app = page({ waiting: worker });
  await app.load();
  app.changeController();
  app.changeController();
  assert.equal(app.calls.reloads, 0);
  assert.equal(app.calls.confirmations.length, 0);
  assert.deepEqual(worker.messages, []);
});

test('a waiting worker at registration time displays the explicit update banner', async () => {
  const worker = installingWorker('installed');
  const app = page({ waiting: worker });
  await app.load();
  assert.equal(app.banner.hidden, false);
  assert.equal(app.button.disabled, false);
  assert.deepEqual(worker.messages, []);
  assert.equal(app.calls.reloads, 0);
});

test('cancelling confirmation sends no activation message and never arms a reload', async () => {
  const worker = installingWorker('installed');
  const app = page({ waiting: worker, confirmed: false });
  await app.load();
  app.clickUpdate();
  assert.equal(app.calls.confirmations.length, 1);
  assert.deepEqual(worker.messages, []);
  assert.equal(app.button.disabled, false);
  assert.equal(app.banner.hidden, false);
  app.changeController();
  assert.equal(app.calls.reloads, 0);
});

test('accepting an update sends SKIP_WAITING and reloads only after controllerchange', async () => {
  const worker = installingWorker('installed');
  const app = page({ waiting: worker });
  await app.load();
  app.clickUpdate();
  assert.equal(app.calls.confirmations.length, 1);
  assert.deepEqual(worker.messages, [{ type: 'SKIP_WAITING' }]);
  assert.equal(app.button.disabled, true);
  assert.equal(app.calls.reloads, 0, 'posting a message must not reload before activation');
  app.clickUpdate();
  assert.equal(app.calls.confirmations.length, 1);
  assert.equal(worker.messages.length, 1, 'repeated clicks must not post another activation');
  worker.dispatchEvent({ type: 'statechange' });
  await flush();
  assert.equal(app.calls.reloads, 0);
  app.changeController();
  assert.equal(app.calls.reloads, 1);
});

test('updatefound advertises the new worker only once it reaches installed', async () => {
  const app = page();
  await app.load();
  const worker = installingWorker();
  app.registration.installing = worker;
  app.registration.dispatchEvent({ type: 'updatefound' });
  assert.equal(app.banner.hidden, true);
  worker.state = 'installing';
  worker.dispatchEvent({ type: 'statechange' });
  assert.equal(app.banner.hidden, true);
  app.registration.waiting = worker;
  app.registration.installing = null;
  worker.state = 'installed';
  worker.dispatchEvent({ type: 'statechange' });
  await flush();
  assert.equal(app.banner.hidden, false);
  assert.deepEqual(worker.messages, []);
  assert.equal(app.calls.reloads, 0);
});

// register() can resolve after updatefound has already fired. No second updatefound
// event is promised: the existing installing worker still needs a state listener.
test('an already-installing worker at register resolution advertises its completed update', async () => {
  const worker = installingWorker();
  const app = page({ installing: worker });
  await app.load();
  assert.equal(app.banner.hidden, true);
  app.registration.waiting = worker;
  app.registration.installing = null;
  worker.state = 'installed';
  worker.dispatchEvent({ type: 'statechange' });
  await flush();
  assert.equal(app.banner.hidden, false, 'the already-installing update must become visible');
  assert.equal(app.calls.reloads, 0);
  assert.deepEqual(worker.messages, []);
});
