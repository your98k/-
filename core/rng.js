/* =========================================================
 * 随机数内核（可复现）
 * 同一 seed 生成的试卷完全一致，便于"重新生成同一份卷子"
 * 同时兼容：Node / 微信小程序 (CommonJS) 与浏览器 (window.KB.RNG)
 * ======================================================= */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else { root.KB = root.KB || {}; root.KB.RNG = factory(); }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {

  /** 字符串 → 32 位整数种子 */
  function hashSeed(str) {
    var h = 2166136261 >>> 0;
    str = String(str == null ? '' : str);
    for (var i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619) >>> 0;
    }
    return h >>> 0;
  }

  /** mulberry32：快、够用、无依赖 */
  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  /**
   * 创建随机源
   * @param {string|number} seed 种子，省略则用时间戳
   */
  function create(seed) {
    var s = seed == null ? Date.now() + '-' + Math.random() : seed;
    var next = mulberry32(typeof s === 'string' ? hashSeed(s) : (s >>> 0));
    var api = {
      seed: s,
      /** [0,1) */
      float: next,
      /** 闭区间整数 */
      int: function (a, b) { return a + Math.floor(next() * (b - a + 1)); },
      /** 数组随机取一个 */
      pick: function (arr) { return arr[Math.floor(next() * arr.length)]; },
      /** 概率为 p 时返回 true */
      bool: function (p) { return next() < (p == null ? 0.5 : p); },
      /** 原地洗牌（返回新数组） */
      shuffle: function (arr) {
        var a = arr.slice();
        for (var i = a.length - 1; i > 0; i--) {
          var j = Math.floor(next() * (i + 1));
          var t = a[i]; a[i] = a[j]; a[j] = t;
        }
        return a;
      },
      /** 不重复抽 n 个 */
      sample: function (arr, n) {
        var a = api.shuffle(arr);
        return a.slice(0, Math.max(0, Math.min(n, a.length)));
      },
      /** 按权重取值：items = [{v, w}] */
      weighted: function (items) {
        var total = 0, i;
        for (i = 0; i < items.length; i++) total += (items[i].w || 0);
        if (total <= 0) return items.length ? items[0].v : null;
        var r = next() * total;
        for (i = 0; i < items.length; i++) {
          r -= (items[i].w || 0);
          if (r <= 0) return items[i].v;
        }
        return items[items.length - 1].v;
      }
    };
    return api;
  }

  return { create: create, hashSeed: hashSeed, mulberry32: mulberry32 };
});
