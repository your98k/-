/* 个人设置：地址/模型可持久化，密钥只保存在闭包内存；此模块不发网络请求。 */
(function (root) {
  'use strict';
  var STORAGE = 'kb.ai.settings.v1';
  var config = { baseUrl: '', model: '', apiKey: '' };
  var modal = document.getElementById('aiModal');
  var form = document.getElementById('aiSettingsForm');
  var base = document.getElementById('aiBaseUrl');
  var model = document.getElementById('aiModel');
  var key = document.getElementById('aiKey');
  var error = document.getElementById('aiSettingsError');
  var previousFocus;
  try {
    var saved = JSON.parse(localStorage.getItem(STORAGE) || '{}');
    if (typeof saved.baseUrl === 'string') config.baseUrl = saved.baseUrl.slice(0, 500);
    if (typeof saved.model === 'string') config.model = saved.model.slice(0, 160);
    // 即便存储中被注入 apiKey，也不读取或恢复它。
  } catch (_) {}

  function read() {
    return { baseUrl: config.baseUrl, model: config.model, apiKey: config.apiKey };
  }
  function close() {
    modal.style.display = 'none';
    key.value = '';
    error.textContent = '';
    if (previousFocus && previousFocus.focus) previousFocus.focus();
  }
  function open() {
    previousFocus = document.activeElement;
    base.value = config.baseUrl;
    model.value = config.model;
    key.value = config.apiKey;
    error.textContent = '';
    modal.style.display = 'flex';
    (config.baseUrl && config.model ? key : base).focus();
  }
  form.onsubmit = function (event) {
    event.preventDefault();
    try {
      var next = root.KB.AI.validateConfig({ baseUrl: base.value, model: model.value, apiKey: key.value });
      config = { baseUrl: next.baseUrl, model: next.model, apiKey: next.apiKey };
      try {
        localStorage.setItem(STORAGE, JSON.stringify({ baseUrl: config.baseUrl, model: config.model }));
      } catch (_) {}
      close();
    } catch (failure) {
      error.textContent = failure.message;
    }
  };
  var testButton = document.getElementById('aiTest');
  var testResult = document.getElementById('aiTestResult');
  if (testButton) testButton.onclick = async function () {
    if (!root.KB.AI || typeof root.KB.AI.diagnose !== 'function') {
      testResult.hidden = false;
      testResult.className = 'ai-test-result bad';
      testResult.textContent = '当前版本不支持连接诊断。';
      return;
    }
    testButton.disabled = true;
    testResult.hidden = false;
    testResult.className = 'ai-test-result';
    testResult.textContent = '正在测试…';
    try {
      var candidate = root.KB.AI.validateConfig({ baseUrl: base.value, model: model.value, apiKey: key.value });
      var report = await root.KB.AI.diagnose(candidate);
      testResult.className = 'ai-test-result ' + (report.ok ? 'ok' : 'bad');
      testResult.textContent = report.message;
    } catch (failure) {
      testResult.className = 'ai-test-result bad';
      testResult.textContent = failure.message;
    } finally {
      testButton.disabled = false;
    }
  };
  document.getElementById('aiSettingsClose').onclick = close;
  document.getElementById('aiSettingsClear').onclick = function () {
    config = { baseUrl: '', model: '', apiKey: '' };
    base.value = model.value = key.value = '';
    try { localStorage.removeItem(STORAGE); } catch (_) {}
    error.textContent = '已清除设置和当前页面内存中的密钥。';
    base.focus();
  };
  modal.onclick = function (event) { if (event.target === modal) close(); };
  modal.addEventListener('keydown', function (event) {
    if (event.key === 'Escape') { event.preventDefault(); close(); }
    if (event.key !== 'Tab') return;
    var controls = modal.querySelectorAll('input, button');
    var first = controls[0], last = controls[controls.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault(); last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault(); first.focus();
    }
  });
  root.KB.AISettings = { open: open, read: read };
})(window);
