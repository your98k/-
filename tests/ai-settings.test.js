'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '../web-bank/ai-settings.js'), 'utf8');
const STORAGE = 'kb.ai.settings.v1';
// Deliberately fake fixtures, never logged or included in assertion diffs/snapshots.
const SECRET = 'fixture-only-not-a-real-api-key';
const INJECTED = 'fixture-only-injected-stored-key';
const EDITED = 'fixture-only-uncommitted-key';
const SAFE_ERROR = '请检查 API 地址、模型和密钥。';
const EMPTY = { baseUrl: '', model: '', apiKey: '' };
const SAVED = { baseUrl: 'https://api.example.test/v1', model: 'fixture-model', apiKey: SECRET };

// Intentionally pure: this suite tests the settings integration, not ai.js validation.
function validateConfig(input) {
  const baseUrl = input.baseUrl.trim().replace(/\/+$/, '').replace(/\/chat\/completions$/, '');
  const model = input.model.trim();
  const apiKey = input.apiKey.trim();
  let url;
  try { url = new URL(baseUrl); } catch (_) { throw Error(SAFE_ERROR); }
  if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash ||
      !model || !apiKey || /[\r\n]/.test(model + apiKey)) throw Error(SAFE_ERROR);
  return { baseUrl, model, apiKey, endpoint: baseUrl + '/chat/completions' };
}

function fakeStorage(seed = {}, blocked = []) {
  const values = new Map(Object.entries(seed));
  const calls = [];
  const writes = [];
  function operation(method, key) {
    calls.push({ method, key });
    if (blocked.includes(method)) throw Error('Storage unavailable');
  }
  const api = {
    get length() { return values.size; },
    key(index) { return [...values.keys()][index] ?? null; },
    getItem(key) { operation('getItem', key); return values.get(key) ?? null; },
    setItem(key, value) {
      operation('setItem', key);
      value = String(value);
      writes.push({ key, value });
      values.set(key, value);
    },
    removeItem(key) { operation('removeItem', key); values.delete(key); },
    clear() { operation('clear'); values.clear(); }
  };
  return { api, values, calls, writes };
}

function assertNoSecrets(storage, { injectedSeed = false } = {}) {
  for (const { value } of storage.writes) {
    assert.ok(![SECRET, INJECTED, EDITED].some(secret => value.includes(secret)),
      'storage writes must never contain a fixture credential');
    assert.ok(!value.includes('apiKey'), 'storage writes must not contain an apiKey field');
  }
  // An externally injected pre-existing value is not a write by this module.
  for (const value of storage.values.values()) {
    const secrets = injectedSeed ? [SECRET, EDITED] : [SECRET, INJECTED, EDITED];
    assert.ok(!secrets.some(secret => value.includes(secret)),
      'storage values must not contain an in-memory credential');
  }
}

function fixture(t, options = {}) {
  const storage = options.storage || fakeStorage(options.seed, options.blocked);
  const document = { activeElement: null };
  const elements = new Map();
  function element(id, tagName = 'div', type = '') {
    const listeners = new Map();
    const node = {
      id, tagName: tagName.toUpperCase(), type, value: '', textContent: '',
      style: {}, children: [], disabled: false,
      focus() { document.activeElement = node; },
      addEventListener(name, handler) {
        if (!listeners.has(name)) listeners.set(name, []);
        listeners.get(name).push(handler);
      },
      dispatch(name, properties = {}) {
        const event = { type: name, target: node, currentTarget: node, defaultPrevented: false,
          preventDefault() { this.defaultPrevented = true; }, ...properties };
        if (typeof node['on' + name] === 'function') node['on' + name](event);
        for (const listener of listeners.get(name) || []) listener(event);
        return event;
      },
      querySelectorAll(selector) {
        const tags = selector.split(',').map(part => part.trim().toUpperCase());
        const result = [];
        function walk(parent) {
          for (const child of parent.children) {
            if (tags.includes(child.tagName)) result.push(child);
            walk(child);
          }
        }
        walk(node);
        return result;
      }
    };
    Object.defineProperty(node, 'innerHTML', {
      set() { throw Error('Settings must render error text without HTML insertion'); }
    });
    elements.set(id, node);
    return node;
  }
  const launcher = element('settingsLauncher', 'button', 'button');
  const modal = element('aiModal');
  const form = element('aiSettingsForm', 'form');
  const close = element('aiSettingsClose', 'button', 'button');
  const base = element('aiBaseUrl', 'input', 'url');
  const model = element('aiModel', 'input', 'text');
  const key = element('aiKey', 'input', 'password');
  const error = element('aiSettingsError', 'p');
  const clear = element('aiSettingsClear', 'button', 'button');
  const save = element('settingsSave', 'button', 'submit');
  // Same focusable order as the real modal; backdrop clicking is its cancel action.
  form.children = [close, base, model, key, error, clear, save];
  modal.children = [form];
  modal.style.display = 'none';
  document.getElementById = id => elements.get(id) || null;
  launcher.focus();

  const networkAttempts = [];
  const persistenceAttempts = [];
  function noNetwork() { networkAttempts.push('network'); throw Error('Network forbidden in settings test'); }
  function noPersistence() { persistenceAttempts.push('other storage'); throw Error('Other persistence forbidden'); }
  Object.defineProperty(document, 'cookie', { get: noPersistence, set: noPersistence });
  const validationCalls = [];
  const sandbox = {
    document, URL, fetch: noNetwork, XMLHttpRequest: noNetwork,
    WebSocket: noNetwork, EventSource: noNetwork,
    navigator: { sendBeacon: noNetwork },
    indexedDB: { open: noPersistence, deleteDatabase: noPersistence },
    KB: { AI: {
      validateConfig(input) {
        validationCalls.push(input);
        return (options.validateConfig || validateConfig)(input);
      },
      generatePaper: noNetwork
    } }
  };
  Object.defineProperty(sandbox, 'localStorage', {
    get() { if (options.blockedProperty) throw Error('Storage access denied'); return storage.api; }
  });
  Object.defineProperty(sandbox, 'sessionStorage', { get: noPersistence });
  sandbox.window = sandbox;
  t.after(() => {
    assert.equal(networkAttempts.length, 0, 'load and all settings actions must be network-free');
    assert.equal(persistenceAttempts.length, 0, 'settings must not use other persistence channels');
    assertNoSecrets(storage, { injectedSeed: options.injectedSeed });
  });
  vm.runInNewContext(source, sandbox, { filename: 'ai-settings.js', timeout: 1000 });
  const settings = sandbox.KB.AISettings;
  assert.equal(typeof settings.read, 'function');
  assert.equal(typeof settings.open, 'function');
  return {
    settings, storage, validationCalls, document, launcher, modal, form, close, base, model, key, error, clear, save,
    fill(config) { base.value = config.baseUrl; model.value = config.model; key.value = config.apiKey; },
    submit() { return form.dispatch('submit'); }
  };
}

function assertConfig(settings, expected) {
  const actual = settings.read();
  assert.deepEqual(Object.keys(actual).sort(), ['apiKey', 'baseUrl', 'model']);
  assert.ok(actual.baseUrl === expected.baseUrl, 'read returns the expected endpoint');
  assert.ok(actual.model === expected.model, 'read returns the expected model');
  // Boolean comparisons deliberately prevent fixture credentials appearing in failure diffs.
  assert.ok(actual.apiKey === expected.apiKey, 'read returns the expected in-memory credential');
}
function commit(h, config = SAVED) {
  h.settings.open();
  h.fill(config);
  assert.equal(h.submit().defaultPrevented, true, 'save prevents browser form navigation');
}
function assertFocus(actual, expected, message = 'focus is on the expected control') {
  assert.ok(actual === expected, message);
}
function assertClosed(h) {
  assert.equal(h.modal.style.display, 'none');
  assert.ok(h.key.value === '', 'closing clears the password DOM value');
  assert.ok(h.error.textContent === '', 'dismissal clears error text');
  assertFocus(h.document.activeElement, h.launcher, 'closing restores the opener focus');
}

test('restores only saved endpoint/model and ignores an injected stored credential', t => {
  const h = fixture(t, { seed: { [STORAGE]: JSON.stringify({
    baseUrl: SAVED.baseUrl, model: SAVED.model, apiKey: INJECTED
  }) }, injectedSeed: true });
  assertConfig(h.settings, { ...SAVED, apiKey: '' });
  assert.equal(h.validationCalls.length, 0, 'loading is not validation or a connection test');
  assert.equal(h.storage.writes.length, 0);
  h.settings.open();
  assert.equal(h.base.value, SAVED.baseUrl);
  assert.equal(h.model.value, SAVED.model);
  assert.ok(h.key.value === '', 'injected storage credentials never reach the password DOM');
  assertFocus(h.document.activeElement, h.key);
  // A subsequent legitimate save also removes the injected field from the saved record.
  h.fill(SAVED);
  h.submit();
  assertNoSecrets(h.storage);
});

test('empty settings open without I/O, focus the endpoint, and expose a defensive read copy', t => {
  const h = fixture(t);
  assertConfig(h.settings, EMPTY);
  h.settings.open();
  assert.equal(h.modal.style.display, 'flex');
  assertFocus(h.document.activeElement, h.base);
  assert.equal(h.validationCalls.length, 0);
  assert.equal(h.storage.writes.length, 0);
  const copy = h.settings.read();
  copy.baseUrl = 'https://uncommitted.example.test';
  copy.model = 'not-committed';
  copy.apiKey = EDITED;
  assertConfig(h.settings, EMPTY);
  h.close.dispatch('click');
  assertClosed(h);
});

test('save persists only sanitized endpoint/model, retains memory key, and clears/repopulates password DOM', t => {
  const h = fixture(t);
  const input = { baseUrl: '  https://api.example.test/v1/chat/completions/  ',
    model: '  fixture-model  ', apiKey: '  ' + SECRET + '  ' };
  commit(h, input);
  assert.equal(h.validationCalls.length, 1);
  assert.equal(h.validationCalls[0].baseUrl, input.baseUrl);
  assert.equal(h.validationCalls[0].model, input.model);
  assert.ok(h.validationCalls[0].apiKey === input.apiKey, 'validator receives the entered credential');
  assertConfig(h.settings, SAVED);
  assertClosed(h);
  assert.equal(h.storage.writes.length, 1);
  assert.equal(h.storage.writes[0].key, STORAGE);
  const persisted = JSON.parse(h.storage.values.get(STORAGE));
  assert.deepEqual(Object.keys(persisted).sort(), ['baseUrl', 'model']);
  assert.equal(persisted.baseUrl, SAVED.baseUrl);
  assert.equal(persisted.model, SAVED.model);
  assertNoSecrets(h.storage);
  h.settings.open();
  assert.ok(h.key.value === SECRET, 'reopening uses only the closure-held credential');
  assertFocus(h.document.activeElement, h.key);
  const copy = h.settings.read();
  copy.apiKey = EDITED;
  copy.model = 'changed-copy';
  assertConfig(h.settings, SAVED);
  h.close.dispatch('click');
  assertClosed(h);
});

test('fresh module/DOM after page reload retains endpoint/model but starts with a blank key', t => {
  const original = fixture(t);
  commit(original);
  const reloaded = fixture(t, { storage: original.storage });
  assertConfig(reloaded.settings, { ...SAVED, apiKey: '' });
  assert.equal(reloaded.validationCalls.length, 0);
  reloaded.settings.open();
  assert.equal(reloaded.base.value, SAVED.baseUrl);
  assert.equal(reloaded.model.value, SAVED.model);
  assert.ok(reloaded.key.value === '', 'reload never restores the previous page credential');
  assert.equal(reloaded.storage.writes.length, 1, 'reload performs no additional write');
});

const dismissals = [
  ['close button', h => h.close.dispatch('click')],
  ['backdrop cancel', h => h.modal.dispatch('click')],
  ['Escape', h => {
    const event = h.modal.dispatch('keydown', { key: 'Escape' });
    assert.equal(event.defaultPrevented, true);
  }]
];
for (const [label, dismiss] of dismissals) {
  for (const saved of [false, true]) {
    test(label + ' discards edits and clears password DOM (' + (saved ? 'saved' : 'empty') + ' state)', t => {
      const h = fixture(t);
      if (saved) commit(h);
      const writes = h.storage.writes.length;
      const validations = h.validationCalls.length;
      const persisted = h.storage.values.get(STORAGE);
      h.settings.open();
      h.fill({ baseUrl: 'https://edited.example.test/v2', model: 'edited-model', apiKey: EDITED });
      h.error.textContent = '旧的校验提示';
      dismiss(h);
      assertClosed(h);
      assertConfig(h.settings, saved ? SAVED : EMPTY);
      assert.equal(h.storage.writes.length, writes, 'dismissal must not save');
      assert.ok(h.storage.values.get(STORAGE) === persisted, 'saved record remains unchanged');
      assert.equal(h.validationCalls.length, validations, 'dismissal must not validate edited data');
      h.settings.open();
      assert.equal(h.base.value, saved ? SAVED.baseUrl : '');
      assert.equal(h.model.value, saved ? SAVED.model : '');
      assert.ok(h.key.value === (saved ? SECRET : ''), 'reopening discards uncommitted credential edits');
      h.close.dispatch('click');
      assertClosed(h);
    });
  }
}

test('clicking inside the dialog is not backdrop cancellation', t => {
  const h = fixture(t);
  h.settings.open();
  h.fill(SAVED);
  h.modal.dispatch('click', { target: h.base });
  assert.equal(h.modal.style.display, 'flex');
  assert.ok(h.key.value === SECRET, 'inside click does not erase the in-progress password');
  assertConfig(h.settings, EMPTY);
  assert.equal(h.storage.writes.length, 0);
  h.close.dispatch('click');
  assertClosed(h);
});

for (const [label, change] of [
  ['unsafe endpoint', { baseUrl: 'https://api.example.test/v1?key=' + EDITED }],
  ['blank model', { model: '   ' }],
  ['blank credential', { apiKey: '   ' }]
]) {
  test('validation failure (' + label + ') displays safe text without saving or changing config', t => {
    const h = fixture(t);
    commit(h);
    const persisted = h.storage.values.get(STORAGE);
    h.settings.open();
    h.fill({ ...SAVED, apiKey: EDITED, ...change });
    assert.equal(h.submit().defaultPrevented, true);
    assertConfig(h.settings, SAVED);
    assert.equal(h.storage.writes.length, 1, 'invalid config must not write');
    assert.ok(h.storage.values.get(STORAGE) === persisted, 'saved record remains unchanged');
    assert.equal(h.modal.style.display, 'flex', 'invalid form stays open for correction');
    assert.ok(h.error.textContent === SAFE_ERROR, 'validation shows only the safe validator message');
    assert.ok(![SECRET, INJECTED, EDITED].some(secret => h.error.textContent.includes(secret)),
      'validation UI must not expose credentials');
    assert.equal(h.validationCalls.length, 2);
    h.close.dispatch('click');
    assertClosed(h);
    h.settings.open();
    assert.ok(h.key.value === SECRET, 'invalid edits do not replace the committed memory key');
    assert.ok(h.error.textContent === '', 'dismissal clears error text');
    h.close.dispatch('click');
  });
}

test('clear removes only its own record, preserves wrongbook/other data, and wipes all memory/form fields', t => {
  const wrongbook = JSON.stringify({ version: 1, items: [{ id: 'wrongbook-fixture' }] });
  const preferences = JSON.stringify({ theme: 'dark' });
  const h = fixture(t, { seed: { 'kb.wrongbook.v1': wrongbook, 'other.preferences': preferences } });
  commit(h);
  h.settings.open();
  h.key.value = EDITED;
  h.clear.dispatch('click');
  assertConfig(h.settings, EMPTY);
  assert.ok(h.key.value === '', 'clear wipes the edited password DOM');
  assert.equal(h.base.value, '');
  assert.equal(h.model.value, '');
  assert.equal(h.storage.values.has(STORAGE), false);
  assert.equal(h.storage.values.get('kb.wrongbook.v1'), wrongbook);
  assert.equal(h.storage.values.get('other.preferences'), preferences);
  assert.equal(h.storage.values.size, 2);
  assert.deepEqual(h.storage.calls.filter(call => call.method === 'removeItem').map(call => call.key), [STORAGE]);
  assert.equal(h.storage.calls.some(call => call.method === 'clear'), false, 'never clear all localStorage');
  assertFocus(h.document.activeElement, h.base);
  assert.ok(h.error.textContent.length > 0, 'clear gives feedback');
  assertNoSecrets(h.storage);
  h.close.dispatch('click');
  assertClosed(h);
  h.settings.open();
  assert.ok(h.key.value === '', 'cleared memory credential cannot return on reopen');
  assert.equal(h.base.value, '');
  assert.equal(h.model.value, '');
  assert.ok(h.error.textContent === '', 'dismissal clears error text');
});

for (const [label, options] of [
  ['getItem throws', { blocked: ['getItem'] }],
  ['setItem throws (quota/privacy restriction)', { blocked: ['setItem'] }],
  ['removeItem throws', { blocked: ['removeItem'] }],
  ['all operations throw', { blocked: ['getItem', 'setItem', 'removeItem'] }],
  ['localStorage property access throws', { blockedProperty: true }]
]) {
  test('blocked storage: ' + label + ' degrades to usable in-page settings without I/O', t => {
    const h = fixture(t, options);
    assertConfig(h.settings, EMPTY);
    commit(h);
    assertConfig(h.settings, SAVED);
    assertClosed(h);
    h.settings.open();
    assert.ok(h.key.value === SECRET, 'blocked persistence does not break closure memory');
    assert.equal(h.base.value, SAVED.baseUrl);
    assert.equal(h.model.value, SAVED.model);
    h.clear.dispatch('click');
    assertConfig(h.settings, EMPTY);
    assert.ok(h.key.value === '', 'clear still wipes memory/DOM when persistence is blocked');
    assert.equal(h.base.value, '');
    assert.equal(h.model.value, '');
    h.close.dispatch('click');
    assertClosed(h);
    h.settings.open();
    assert.ok(h.key.value === '', 'cleared key stays blank after reopening');
  });
}

test('failed persistence keeps the old disk record but uses newly validated config only in memory', t => {
  const previous = { baseUrl: 'https://old.example.test/v1', model: 'old-model' };
  const storage = fakeStorage({ [STORAGE]: JSON.stringify(previous) }, ['setItem']);
  const h = fixture(t, { storage });
  assertConfig(h.settings, { ...previous, apiKey: '' });
  commit(h);
  assertConfig(h.settings, SAVED);
  assertClosed(h);
  assert.equal(storage.values.get(STORAGE), JSON.stringify(previous));
  assert.equal(storage.calls.filter(call => call.method === 'setItem').length, 1);
  assert.equal(storage.writes.length, 0);
  const reloaded = fixture(t, { storage });
  assertConfig(reloaded.settings, { ...previous, apiKey: '' });
});

for (const [label, raw] of [
  ['malformed JSON', '{not-valid-json'],
  ['null record', 'null'],
  ['non-string properties', JSON.stringify({ baseUrl: 42, model: {}, apiKey: INJECTED })]
]) {
  test('ignores unusable stored settings (' + label + ') without throwing or restoring credentials', t => {
    const h = fixture(t, { seed: { [STORAGE]: raw }, injectedSeed: true });
    assertConfig(h.settings, EMPTY);
    h.settings.open();
    assert.equal(h.base.value, '');
    assert.equal(h.model.value, '');
    assert.ok(h.key.value === '', 'unusable storage never populates a credential');
    assert.equal(h.validationCalls.length, 0);
    assert.equal(h.storage.writes.length, 0);
  });
}

test('focus trap wraps both boundaries, leaves middle Tab alone, and Escape restores focus', t => {
  const h = fixture(t);
  h.settings.open();
  const controls = h.modal.querySelectorAll('input, button');
  assertFocus(controls[0], h.close);
  assertFocus(controls.at(-1), h.save);
  controls.at(-1).focus();
  const forward = h.modal.dispatch('keydown', { key: 'Tab', shiftKey: false });
  assert.equal(forward.defaultPrevented, true);
  assertFocus(h.document.activeElement, controls[0]);
  const backward = h.modal.dispatch('keydown', { key: 'Tab', shiftKey: true });
  assert.equal(backward.defaultPrevented, true);
  assertFocus(h.document.activeElement, controls.at(-1));
  h.model.focus();
  for (const shiftKey of [false, true]) {
    const middle = h.modal.dispatch('keydown', { key: 'Tab', shiftKey });
    assert.equal(middle.defaultPrevented, false, 'native middle-control tabbing must not be cancelled');
    assertFocus(h.document.activeElement, h.model, 'fake DOM does not simulate native tab movement');
  }
  assert.equal(h.modal.dispatch('keydown', { key: 'ArrowLeft' }).defaultPrevented, false);
  assert.equal(h.modal.dispatch('keydown', { key: 'Escape' }).defaultPrevented, true);
  assertClosed(h);
  assert.equal(h.validationCalls.length, 0);
  assert.equal(h.storage.writes.length, 0);
});
