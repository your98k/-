/* =========================================================
 * 生成器公共工具：数值格式化、分数、选项构造、题型包装
 * ======================================================= */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else { root.KB = root.KB || {}; root.KB.GenUtil = factory(); }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {

  var SUP = { '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹', '-': '⁻', '+': '' };
  function sup(s) { return String(s).split('').map(function (c) { return SUP[c] || c; }).join(''); }

  /** 科学记数法：4e-9 → 4×10⁻⁹ */
  function sci(x, digits) {
    if (!isFinite(x)) return String(x);
    var e = Number(x).toExponential(digits == null ? 1 : digits).split('e');
    var mant = e[0].replace(/\.0+$/, '');
    return mant + '×10' + sup(e[1]);
  }
  /** 数字格式化：去掉浮点误差与多余 0 */
  function num(x, digits) {
    if (typeof x !== 'number' || !isFinite(x)) return String(x);
    var p = Math.pow(10, digits == null ? 6 : digits);
    var v = Math.round(x * p) / p;
    return String(v);
  }

  function gcd(a, b) { a = Math.abs(a); b = Math.abs(b); while (b) { var t = b; b = a % b; a = t; } return a || 1; }

  /** 分数 → "a/b" 或整数 */
  function frac(n, d) {
    if (d < 0) { n = -n; d = -d; }
    var g = gcd(n, d);
    n /= g; d /= g;
    return d === 1 ? String(n) : n + '/' + d;
  }

  /** 带分数 a b/c */
  function mixed(n, d) {
    var sign = n < 0 ? '-' : '';
    n = Math.abs(n);
    var w = Math.floor(n / d), r = n % d;
    if (!r) return sign + w;
    if (!w) return sign + r + '/' + d;
    return sign + w + ' ' + r + '/' + d;
  }

  /** 多项式项格式化：ax^2 + bx + c */
  function poly(a, b, c, v) {
    v = v || 'x';
    var out = '';
    function term(coef, suffix) {
      if (!coef) return '';
      var sign = coef > 0 ? '+' : '-';
      var abs = Math.abs(coef);
      if (abs === 1 && suffix) return sign + suffix;
      return sign + abs + suffix;
    }
    if (a) out += (a > 0 ? '' : '-') + (Math.abs(a) === 1 ? '' : Math.abs(a)) + v + '²';
    out += term(b, v);
    out += term(c, '');
    if (!out) out = '0';
    return out.replace(/^\+/, '');
  }

  /** 字母序号 */
  function letter(i) { return String.fromCharCode(65 + i); }

  /**
   * 构造选择题：给定正确答案与若干干扰项
   * @returns {{stem, opts, answer, analysis}}
   */
  function choice(rng, stem, correct, wrongs, analysis) {
    var opts = [correct].concat(wrongs || []);
    // 去重 + 补足到 4 项
    var seen = {}, uniq = [];
    opts.forEach(function (o) {
      var k = String(o);
      if (!seen[k]) { seen[k] = 1; uniq.push(String(o)); }
    });

    // 选项不足 4 个时，用数值扰动补齐（只在答案本身是纯数字时）
    var cn = Number(correct);
    if (uniq.length < 4 && isFinite(cn) && String(correct).trim() !== '') {
      var cands = [cn + 1, cn - 1, cn * 2, Math.round(cn / 2 * 100) / 100, cn + 10, cn - 10];
      for (var ci = 0; ci < cands.length && uniq.length < 4; ci++) {
        var v = cands[ci];
        if (v === cn || !isFinite(v)) continue;
        var vs = num(v);
        if (!seen[vs]) { seen[vs] = 1; uniq.push(vs); }
      }
    }

    uniq = uniq.slice(0, 4);
    var shuffled = rng.shuffle(uniq);
    var idx = shuffled.indexOf(String(correct));
    if (idx < 0) { shuffled[0] = String(correct); idx = 0; }
    var hasBlank = /_{3,}/.test(stem);
    return {
      stem: hasBlank ? stem.replace(/_{3,}/g, '（　）') : stem + '（　）',
      opts: shuffled.map(function (o, i) { return letter(i) + '. ' + o; }),
      answer: letter(idx),
      analysis: analysis || ('正确答案：' + correct)
    };
  }

  /** 构造判断题 */
  function judge(rng, statement, isTrue, analysis) {
    return {
      stem: '判断：' + statement + '（　）',
      answer: isTrue ? '√' : '×',
      analysis: analysis || (isTrue ? '说法正确。' : '说法错误。')
    };
  }

  /** 构造填空题 */
  function fill(stem, answer, analysis) {
    return { stem: stem, answer: String(answer), analysis: analysis || ('答案：' + answer) };
  }

  /** 从答案生成数字干扰项 */
  function numWrongs(rng, ans, n, scale) {
    var out = [], guard = 0;
    var base = Math.abs(ans) || 1;
    scale = scale || 1;
    while (out.length < (n || 3) && guard++ < 60) {
      var delta = (rng.int(1, 9) / (rng.bool(0.5) ? 1 : 10)) * scale * base * (rng.bool(0.5) ? 1 : -1);
      var v = Math.round((ans + delta) * 1000) / 1000;
      if (v !== ans && v >= 0 && out.indexOf(num(v)) < 0) out.push(num(v));
    }
    return out;
  }

  return {
    num: num, sci: sci, sup: sup, gcd: gcd, frac: frac, mixed: mixed, poly: poly,
    letter: letter, choice: choice, judge: judge, fill: fill, numWrongs: numWrongs
  };
});
