/* =========================================================
 * 数学排版：把题干里的 √ / 分数 / 上下标 / 科学记数法交给 KaTeX
 * - html():  网页用，输出 KaTeX 结构（无 KaTeX 时降级为原始文本）
 * - word():  Word 用，输出 <sup>/<sub>/斜杠分数（Word 可直接解析）
 * - plain(): 复制到剪贴板用，纯文本
 * ======================================================= */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else { root.KB = root.KB || {}; root.KB.MathRender = factory(); }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {

  var HAS_KATEX = (typeof katex !== 'undefined' && katex && typeof katex.renderToString === 'function');

  var SUP = { '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹', '-': '⁻' };
  function supText(s) { return String(s).split('').map(function (c) { return SUP[c] || c; }).join(''); }

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  /* 每条规则同时给出三种输出，避免二次解析 LaTeX 出错 */
  var RULES = [
    { // 4×10^-9
      re: /(\d+(?:\.\d+)?)\s*×\s*10\s*\^\s*\(?(-?\d+)\)?/g,
      tex: function (a, b) { return '\\text{' + a + '}\\times10^{' + b + '}'; },
      plain: function (a, b) { return a + '×10' + supText(b); },
      word: function (a, b) { return esc(a) + '×10<sup>' + esc(b) + '</sup>'; }
    },
    { // √3/2
      re: /√\s*(\d+)\s*\/\s*(\d+)/g,
      tex: function (a, b) { return '\\frac{\\sqrt{' + a + '}}{' + b + '}'; },
      plain: function (a, b) { return '√' + a + '/' + b; },
      word: function (a, b) { return '√<span style="text-decoration:overline">' + a + '</span>/' + b; }
    },
    { // √48
      re: /√\s*\(?(\d+)\)?/g,
      tex: function (a) { return '\\sqrt{' + a + '}'; },
      plain: function (a) { return '√' + a; },
      word: function (a) { return '√<span style="text-decoration:overline">' + a + '</span>'; }
    },
    { // ∛-27
      re: /∛\s*\(?(-?\d+)\)?/g,
      tex: function (a) { return '\\sqrt[3]{' + a + '}'; },
      plain: function (a) { return '∛' + a; },
      word: function (a) { return '∛<span style="text-decoration:overline">' + a + '</span>'; }
    },
    { // 3/4（前后不能紧贴数字或小数点）
      re: /(?<![\d.])(\d+)\s*\/\s*(\d+)(?![\d.])/g,
      tex: function (a, b) { return '\\frac{' + a + '}{' + b + '}'; },
      plain: function (a, b) { return a + '/' + b; },
      word: function (a, b) { return '<span class="w-frac">' + a + '/' + b + '</span>'; }
    },
    { // x^2
      re: /([A-Za-z0-9\)\]）])\s*\^\s*\(?(-?\d+)\)?/g,
      tex: function (a, b) { return a + '^{' + b + '}'; },
      plain: function (a, b) { return a + supText(b); },
      word: function (a, b) { return esc(a) + '<sup>' + esc(b) + '</sup>'; }
    },
    { // a_1
      re: /([A-Za-z])\s*_\s*\{?([0-9A-Za-z]+)\}?/g,
      tex: function (a, b) { return a + '_{' + b + '}'; },
      plain: function (a, b) { return a + '_' + b; },
      word: function (a, b) { return esc(a) + '<sub>' + esc(b) + '</sub>'; }
    }
  ];

  /** 切分成 文本 / 数学 片段，每段已带三种渲染结果 */
  function tokenize(text) {
    var s = String(text == null ? '' : text);
    var marks = [];

    RULES.forEach(function (rule) {
      var re = new RegExp(rule.re.source, rule.re.flags);
      var m;
      while ((m = re.exec(s)) !== null) {
        var start = m.index, end = m.index + m[0].length;
        var overlap = marks.some(function (x) { return start < x.end && end > x.start; });
        if (!overlap) {
          var args = m.slice(1);
          marks.push({
            start: start, end: end,
            raw: m[0],
            tex: rule.tex.apply(null, args),
            plain: rule.plain.apply(null, args),
            word: rule.word.apply(null, args)
          });
        }
        if (m.index === re.lastIndex) re.lastIndex++;
      }
    });
    marks.sort(function (a, b) { return a.start - b.start; });

    var out = [], pos = 0;
    marks.forEach(function (mk) {
      if (mk.start > pos) out.push({ type: 'text', v: s.slice(pos, mk.start) });
      out.push({ type: 'math', v: mk });
      pos = mk.end;
    });
    if (pos < s.length) out.push({ type: 'text', v: s.slice(pos) });
    return out;
  }

  function katexOf(tex) {
    try {
      return katex.renderToString(tex, { throwOnError: false, displayMode: false, output: 'html' });
    } catch (e) { return null; }
  }

  function html(text) {
    return tokenize(text).map(function (tk) {
      if (tk.type === 'text') return esc(tk.v);
      if (HAS_KATEX) {
        var k = katexOf(tk.v.tex);
        if (k) return k;
      }
      return '<span class="m-fallback">' + esc(tk.v.raw) + '</span>';
    }).join('');
  }

  function word(text) {
    return tokenize(text).map(function (tk) {
      return tk.type === 'text' ? esc(tk.v) : tk.v.word;
    }).join('');
  }

  function plain(text) {
    return tokenize(text).map(function (tk) {
      return tk.type === 'text' ? tk.v : tk.v.plain;
    }).join('');
  }

  return { html: html, word: word, plain: plain, hasKatex: HAS_KATEX, tokenize: tokenize };
});
