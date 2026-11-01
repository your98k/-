/* 安装提示与安全更新：只有明确点击更新才会刷新，不丢弃正在编辑的试卷。 */
(function () {
  'use strict';
  var ua = navigator.userAgent || '';
  var isIOS = /iPhone|iPad|iPod/i.test(ua) ||
    (/Macintosh/i.test(ua) && navigator.maxTouchPoints > 1);
  var standalone = navigator.standalone ||
    (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches);
  if (isIOS && !standalone) {
    var tip = document.getElementById('iosInstall');
    var close = document.getElementById('iosInstallClose');
    if (tip) tip.style.display = 'flex';
    if (close) close.onclick = function () { tip.style.display = 'none'; };
  }

  if (!('serviceWorker' in navigator) || !/^https?:$/.test(location.protocol)) return;
  var applying = false;
  var registration;
  var banner = document.getElementById('pwaUpdate');
  var button = document.getElementById('pwaUpdateApply');

  // 其他标签页更新或首次安装都不能自动刷新本页。
  navigator.serviceWorker.addEventListener('controllerchange', function () {
    if (applying) window.location.reload();
  });
  if (button) button.onclick = function () {
    if (!registration || !registration.waiting || applying) return;
    if (!window.confirm('刷新更新会清空当前未导出的试卷，错题本会保留。是否继续？')) return;
    applying = true;
    button.disabled = true;
    registration.waiting.postMessage({ type: 'SKIP_WAITING' });
  };

  function offerUpdate() {
    if (banner) banner.hidden = !(registration.waiting && navigator.serviceWorker.controller);
  }
  window.addEventListener('load', function () {
    // 包括 importScripts(build-info.js) 在内的更新检查都不读 HTTP 旧缓存。
    navigator.serviceWorker.register('./sw.js', { updateViaCache: 'none' }).then(function (reg) {
      registration = reg;
      offerUpdate();
      function watchInstalling() {
        var worker = reg.installing;
        if (worker) worker.addEventListener('statechange', function () {
          if (worker.state === 'installed') offerUpdate();
        });
      }
      reg.addEventListener('updatefound', watchInstalling);
      // updatefound 可能早于 register() Promise 完成，不能漏掉已在安装的 Worker。
      watchInstalling();
    }).catch(function (error) {
      console.warn('[PWA] 离线缓存注册失败', error);
    });
  });
})();
