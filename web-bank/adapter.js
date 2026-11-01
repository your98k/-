/* 组卷台纯前端数据适配：章节按学科/学段/年级/学期绑定，难度与分享载荷不依赖后端。 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else {
    root.KB = root.KB || {};
    root.KB.Adapter = factory();
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  var DIFF_NAMES = ['易', '较易', '中', '较难', '难'];
  var DEFAULT_MIX = [0.25, 0.35, 0.25, 0.1, 0.05];
  var CN = ['一', '二', '三', '四', '五', '六', '七', '八', '九', '十', '十一', '十二'];

  function clamp(n, a, b) {
    n = Number(n);
    if (!isFinite(n)) n = a;
    return Math.max(a, Math.min(b, n));
  }

  function stageName(id) {
    return id === 'primary' ? '小学' : id === 'senior' ? '高中' : '初中';
  }

  function gradeLabel(g) {
    g = Number(g);
    if (g >= 1 && g <= 6) return CN[g - 1] + '年级';
    if (g >= 7 && g <= 9) return CN[g - 1] + '年级';
    if (g === 10) return '高一';
    if (g === 11) return '高二';
    if (g === 12) return '高三';
    return g + '年级';
  }

  function termLabel(term) {
    if (term === 0 || term === 'all') return '全学年';
    return Number(term) === 2 ? '下学期' : '上学期';
  }

  function chaptersFromStage(stageData) {
    if (!stageData || !stageData.chapters) return [];
    return Object.keys(stageData.chapters).map(function (id) {
      var ch = stageData.chapters[id];
      return {
        id: ch.id,
        title: ch.name,
        grade: ch.grade,
        term: ch.term,
        topics: (ch.kps || []).map(function (kid) {
          var kp = stageData.kpMap ? stageData.kpMap[kid] : null;
          return {
            id: kid,
            name: kp ? kp.name : kid,
            enabled: !kp || kp.gen !== false
          };
        })
      };
    }).sort(function (a, b) {
      return a.grade - b.grade || a.term - b.term || String(a.id).localeCompare(String(b.id));
    });
  }

  /**
   * 章节只属于一个 (grade, term)。crossGrade 为真时保留当前学段的全部章节；
   * term 为 0 / all 时保留该年级上下两册。
   */
  function filterChapters(list, opt) {
    opt = opt || {};
    var grade = Number(opt.grade);
    var term = opt.term === 0 || opt.term === 'all' || opt.term == null || opt.term === '' ? 0 : Number(opt.term);
    return (list || []).filter(function (ch) {
      if (opt.crossGrade) return true;
      if (grade && ch.grade !== grade) return false;
      if (term && ch.term !== term) return false;
      return true;
    });
  }

  function searchChapters(list, keyword) {
    var q = String(keyword || '').trim().toLowerCase();
    if (!q) return list || [];
    return (list || []).map(function (ch) {
      var titleHit = String(ch.title).toLowerCase().indexOf(q) >= 0;
      var topics = titleHit ? ch.topics : (ch.topics || []).filter(function (t) {
        return String(t.name).toLowerCase().indexOf(q) >= 0;
      });
      if (!titleHit && !topics.length) return null;
      return {
        id: ch.id, title: ch.title, grade: ch.grade, term: ch.term,
        topics: topics
      };
    }).filter(Boolean);
  }

  function barFromSpec(spec) {
    var w = [0, 0, 0, 0, 0];
    if (spec.diffMix) {
      spec.diffMix.forEach(function (x, i) { if (i < 5) w[i] = x * 100; });
      return w;
    }
    if (spec.diff) {
      var n = spec.diff[1] - spec.diff[0] + 1;
      var i;
      for (i = spec.diff[0]; i <= spec.diff[1]; i++) w[i - 1] = 100 / n;
    }
    return w;
  }

  function coefOf(weights) {
    var sum = 0, avg = 0, i;
    for (i = 0; i < weights.length; i++) sum += weights[i];
    if (sum <= 0) return { p: '0.68', word: '适中' };
    for (i = 0; i < weights.length; i++) avg += (weights[i] / sum) * (i + 1);
    var p = 1 - (avg - 1) / 4;
    var word = p >= 0.78 ? '偏易' : p >= 0.62 ? '适中' : p >= 0.48 ? '标准' : '挑战';
    return { p: (Math.round(p * 100) / 100).toFixed(2), word: word };
  }

  function difficultySpec(state) {
    state = state || {};
    var mode = state.difficulty || 'mix';
    if (mode === 'basic') {
      return { diff: [1, 2], label: '基础（易—较易）' };
    }
    if (mode === 'medium') {
      return { diff: [3, 3], label: '中等' };
    }
    if (mode === 'advanced') {
      return { diff: [4, 5], label: '提高（较难—难）' };
    }
    if (mode === 'custom' && state.customKind === 'weights') {
      var raw = Array.isArray(state.weights) ? state.weights.slice(0, 5) : [];
      while (raw.length < 5) raw.push(0);
      var total = raw.reduce(function (s, n) { return s + (Number(n) || 0); }, 0);
      if (total <= 0) raw = [20, 30, 30, 15, 5], total = 100;
      return {
        diffMix: raw.map(function (n) { return (Number(n) || 0) / total; }),
        label: '自定义比例'
      };
    }
    if (mode === 'custom') {
      var a = clamp(state.diffMin == null ? 2 : state.diffMin, 1, 5);
      var b = clamp(state.diffMax == null ? 4 : state.diffMax, 1, 5);
      if (a > b) { var t = a; a = b; b = t; }
      return { diff: [a, b], label: '自定义（' + DIFF_NAMES[a - 1] + '—' + DIFF_NAMES[b - 1] + '）' };
    }
    return { diffMix: DEFAULT_MIX.slice(), label: '混合' };
  }

  function difficultyView(state) {
    var spec = difficultySpec(state);
    var weights = barFromSpec(spec);
    var coef = coefOf(weights);
    return { spec: spec, weights: weights, coef: coef, text: '预估难度系数 ' + coef.p + '（' + coef.word + '）' };
  }

  function scaleToScore(sections, target) {
    target = Math.max(1, Math.round(Number(target) || 1));
    var rows = (sections || []).map(function (s) {
      return {
        type: s.type,
        count: Math.max(1, Math.round(Number(s.count) || 1)),
        score: Math.max(1, Math.round(Number(s.score) || 1))
      };
    });
    if (!rows.length) return rows;
    var sum = rows.reduce(function (s, r) { return s + r.count * r.score; }, 0);
    var factor = target / sum;
    rows.forEach(function (r) { r.score = Math.max(1, Math.round(r.score * factor)); });
    function total() {
      return rows.reduce(function (s, r) { return s + r.count * r.score; }, 0);
    }
    var guard = 0;
    while (total() > target && guard++ < 80) {
      var i = rows.length - 1;
      if (rows[i].score > 1) rows[i].score -= 1;
      else if (rows[i].count > 1) rows[i].count -= 1;
      else if (rows.length > 1) rows.pop();
      else break;
    }
    guard = 0;
    while (total() < target && guard++ < 80) {
      var last = rows[rows.length - 1];
      if (last.score < 50) last.score += 1;
      else break;
    }
    return rows;
  }

  function foldAnswer(value) {
    var s = String(value == null ? '' : value).trim();
    s = s.replace(/[\uFF01-\uFF5E]/g, function (ch) {
      return String.fromCharCode(ch.charCodeAt(0) - 0xFEE0);
    });
    return s.replace(/\s+/g, '').replace(/×/g, 'x').replace(/÷/g, '/').replace(/—/g, '-').toLowerCase();
  }

  function judgeNorm(value) {
    var s = foldAnswer(value);
    if (s === '√' || s === '对' || s === 't' || s === 'true' || s === '正确' || s === 'y') return '√';
    if (s === 'x' || s === '×' || s === '错' || s === 'f' || s === 'false' || s === '错误' || s === 'n') return '×';
    return s;
  }

  function answersMatch(type, expected, actual) {
    if (actual == null || String(actual).trim() === '') return false;
    if (type === 'choice' || type === 'cloze') {
      var letter = String(actual).trim().toUpperCase().charAt(0);
      return letter === String(expected || '').trim().toUpperCase().charAt(0);
    }
    if (type === 'multi') {
      var a = String(actual).toUpperCase().replace(/[^A-F]/g, '').split('').sort().join('');
      var b = String(expected || '').toUpperCase().replace(/[^A-F]/g, '').split('').sort().join('');
      return a.length > 0 && a === b;
    }
    if (type === 'judge') return judgeNorm(actual) === judgeNorm(expected);
    return foldAnswer(actual) === foldAnswer(expected);
  }

  function cognitiveOf(q) {
    if (q && q.cognitive) return q.cognitive;
    var diff = Number(q && q.diff) || 3;
    if (diff <= 1) return '识记理解';
    if (diff <= 3) return '简单应用';
    return '综合探究';
  }

  function estMinutes(q) {
    if (q && q.estMinutes) return q.estMinutes;
    return Math.max(1, Math.round((Number(q && q.score) || 3) / 2));
  }

  function utf8(str) {
    if (typeof TextEncoder !== 'undefined') return new TextEncoder().encode(String(str));
    var out = [];
    var s = unescape(encodeURIComponent(String(str)));
    for (var i = 0; i < s.length; i++) out.push(s.charCodeAt(i));
    return out;
  }

  function b64url(bytes) {
    var table = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
    var s = '', i;
    for (i = 0; i < bytes.length; i += 3) {
      var n = (bytes[i] << 16) | ((bytes[i + 1] || 0) << 8) | (bytes[i + 2] || 0);
      s += table[(n >> 18) & 63] + table[(n >> 12) & 63] +
        (i + 1 < bytes.length ? table[(n >> 6) & 63] : '=') +
        (i + 2 < bytes.length ? table[n & 63] : '=');
    }
    return s.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
  }

  function b64urlDecode(text) {
    var s = String(text || '').replace(/-/g, '+').replace(/_/g, '/');
    while (s.length % 4) s += '=';
    var table = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
    var bytes = [];
    var i;
    for (i = 0; i < s.length; i += 4) {
      var n = (table.indexOf(s[i]) << 18) | (table.indexOf(s[i + 1]) << 12) |
        ((s[i + 2] === '=' ? 0 : table.indexOf(s[i + 2])) << 6) |
        (s[i + 3] === '=' ? 0 : table.indexOf(s[i + 3]));
      bytes.push((n >> 16) & 255);
      if (s[i + 2] !== '=') bytes.push((n >> 8) & 255);
      if (s[i + 3] !== '=') bytes.push(n & 255);
    }
    if (typeof TextDecoder !== 'undefined') return new TextDecoder().decode(new Uint8Array(bytes));
    var bin = '';
    for (i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
    return decodeURIComponent(escape(bin));
  }

  function encodeShare(obj) {
    return b64url(utf8(JSON.stringify(obj)));
  }

  function decodeShare(text) {
    var obj = JSON.parse(b64urlDecode(text));
    if (!obj || typeof obj !== 'object') throw new Error('分享载荷无效');
    return obj;
  }

  return {
    DIFF_NAMES: DIFF_NAMES,
    DEFAULT_MIX: DEFAULT_MIX,
    CN: CN,
    clamp: clamp,
    stageName: stageName,
    gradeLabel: gradeLabel,
    termLabel: termLabel,
    chaptersFromStage: chaptersFromStage,
    filterChapters: filterChapters,
    searchChapters: searchChapters,
    difficultySpec: difficultySpec,
    difficultyView: difficultyView,
    scaleToScore: scaleToScore,
    foldAnswer: foldAnswer,
    answersMatch: answersMatch,
    cognitiveOf: cognitiveOf,
    estMinutes: estMinutes,
    encodeShare: encodeShare,
    decodeShare: decodeShare
  };
});
