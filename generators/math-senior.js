/* =========================================================
 * 高中数学生成器
 * 覆盖：集合、不等式、函数、三角、向量、复数、立几、概率、
 *       直线与圆、圆锥曲线、数列、导数、计数原理、随机变量
 * ======================================================= */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./util.js'));
  else { root.KB = root.KB || {}; root.KB.GenMathSenior = factory(root.KB.GenUtil); }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (U) {

  function setStr(arr) {
    if (!arr.length) return '∅';
    return '{' + arr.join(', ') + '}';
  }

  var K = {

    'set.op': function (c) {
      var r = c.rng;
      var A = [], B = [], i;
      for (i = 1; i <= 8; i++) { if (r.bool(0.55)) A.push(i); if (r.bool(0.5)) B.push(i); }
      if (!A.length) A = [1, 2];
      if (!B.length) B = [2, 3];
      var op = r.pick(['∩', '∪']);
      var res = op === '∩'
        ? A.filter(function (x) { return B.indexOf(x) >= 0; })
        : A.concat(B.filter(function (x) { return A.indexOf(x) < 0; })).sort(function (a, b) { return a - b; });
      return {
        stem: '已知集合 A = ' + setStr(A) + '，B = ' + setStr(B) + '，则 A ' + op + ' B =',
        answer: setStr(res),
        wrongs: [setStr(op === '∩' ? A.filter(function (x) { return B.indexOf(x) < 0; }) : B), '∅', setStr([1, 2, 3, 4, 5, 6, 7, 8])],
        analysis: op === '∩' ? '交集取公共元素。' : '并集取所有元素（去重）。'
      };
    },

    'quad.ineq': function (c) {
      var r = c.rng, p = r.int(1, 5), q = r.int(1, 5);
      if (p === q) q = q + 1;
      var lo = Math.min(p, q), hi = Math.max(p, q);
      var b = -(p + q), cc = p * q;
      var sign = r.pick(['>', '<']);
      return {
        stem: '解不等式：x² ' + (b < 0 ? '- ' + Math.abs(b) : '+ ' + b) + 'x + ' + cc + ' ' + sign + ' 0',
        answer: sign === '>' ? 'x < ' + lo + ' 或 x > ' + hi : lo + ' < x < ' + hi,
        analysis: '先求根 x₁=' + lo + '，x₂=' + hi + '，再按"大于取两边、小于取中间"写解集。'
      };
    },

    'ineq.basic': function (c) {
      var r = c.rng, a = r.int(1, 9), b = r.int(1, 9);
      return {
        stem: '已知 x > 0，求 x + ' + a + '/x 的最小值',
        answer: String(2 * Math.sqrt(a)),
        wrongs: [String(a), String(a + 1), String(Math.round(Math.sqrt(a) * 10) / 10)],
        analysis: '由基本不等式 x + a/x ≥ 2√a，当 x = √' + a + ' 时取等号。'
      };
    },

    'fn.log': function (c) {
      var r = c.rng, a = r.pick([2, 3, 5]), n = r.int(2, 4);
      var v = Math.pow(a, n);
      return {
        stem: '计算：log_' + a + ' ' + v + ' = ______',
        answer: String(n),
        wrongs: [String(v), String(n + 1), String(a)],
        analysis: '因为 ' + a + '^' + n + ' = ' + v + '，所以 log_' + a + ' ' + v + ' = ' + n + '。'
      };
    },

    'fn.exp': function (c) {
      var r = c.rng, a = r.pick([2, 3]), m = r.int(2, 4), n = r.int(1, 3);
      return {
        stem: '计算：' + a + '^' + m + ' × ' + a + '^' + n + ' = ______',
        answer: String(Math.pow(a, m + n)),
        wrongs: [String(Math.pow(a, m * n)), String(Math.pow(a, m) + Math.pow(a, n)), String(Math.pow(a, m + n) + 1)],
        analysis: '同底数幂相乘，底数不变、指数相加。'
      };
    },

    'trig.ident': function (c) {
      var r = c.rng;
      var pair = r.pick([['sin30°', '1/2'], ['cos60°', '1/2'], ['sin45°', '√2/2'], ['cos45°', '√2/2'], ['sin60°', '√3/2']]);
      var kind = r.pick(['二倍角', '平方关系']);
      if (kind === '平方关系') {
        return {
          stem: '已知 sinα = 3/5，且 α 为锐角，则 cosα = ______',
          answer: '4/5',
          wrongs: ['3/4', '5/4', '1/5'],
          analysis: 'sin²α + cos²α = 1，且 α 为锐角取正值。'
        };
      }
      return {
        stem: '计算：2sin30°cos30° = ______',
        answer: '√3/2',
        wrongs: ['1/2', '√3', '1'],
        analysis: '2sinαcosα = sin2α，故原式 = sin60° = √3/2。'
      };
    },

    'vec.op': function (c) {
      var r = c.rng;
      var a = [r.int(-5, 5), r.int(-5, 5)], b = [r.int(-5, 5), r.int(-5, 5)];
      var res = [a[0] + b[0], a[1] + b[1]];
      return {
        stem: '已知向量 a = (' + a.join(', ') + ')，b = (' + b.join(', ') + ')，则 a + b =',
        answer: '(' + res.join(', ') + ')',
        wrongs: ['(' + [a[0] - b[0], a[1] - b[1]].join(', ') + ')', '(' + [a[0] * b[0], a[1] * b[1]].join(', ') + ')', '(' + res.reverse().join(', ') + ')'],
        analysis: '向量加法：对应坐标相加。'
      };
    },

    'vec.dot': function (c) {
      var r = c.rng;
      var a = [r.int(-4, 4), r.int(-4, 4)], b = [r.int(-4, 4), r.int(-4, 4)];
      var dot = a[0] * b[0] + a[1] * b[1];
      return {
        stem: '已知 a = (' + a.join(', ') + ')，b = (' + b.join(', ') + ')，则 a·b = ______',
        answer: String(dot),
        wrongs: [String(a[0] * b[0] - a[1] * b[1]), String(a[0] + b[0] + a[1] + b[1]), String(dot + 2)],
        analysis: '数量积 = x₁x₂ + y₁y₂。'
      };
    },

    'cpx.op': function (c) {
      var r = c.rng, a = r.int(-5, 5), b = r.int(-5, 5), cc = r.int(-5, 5), d = r.int(-5, 5);
      var re = a * cc - b * d, im = a * d + b * cc;
      return {
        stem: '计算：(' + a + (b >= 0 ? '+' : '') + b + 'i)(' + cc + (d >= 0 ? '+' : '') + d + 'i) = ______',
        answer: re + (im >= 0 ? '+' : '') + im + 'i',
        wrongs: [(a * cc + b * d) + (a * d - b * cc >= 0 ? '+' : '') + (a * d - b * cc) + 'i', (a * cc) + '+' + (b * d) + 'i', (re + 1) + '+' + im + 'i'],
        analysis: '按多项式乘法展开，注意 i² = -1。'
      };
    },

    'solid.area': function (c) {
      var r = c.rng, rad = r.int(2, 8), h = r.int(3, 12);
      return {
        stem: '圆柱的底面半径为 ' + rad + '，高为 ' + h + '，则它的体积为 ______（π 保留）',
        answer: (rad * rad * h) + 'π',
        wrongs: [(2 * rad * h) + 'π', (rad * h) + 'π', (rad * rad * h + rad) + 'π'],
        analysis: 'V = πr²h = π×' + rad + '²×' + h + ' = ' + (rad * rad * h) + 'π。'
      };
    },

    'prob.cls': function (c) {
      var r = c.rng, n = r.int(4, 9), m = r.int(1, n - 1);
      var g = U.gcd(m, n);
      return {
        stem: '袋中有 ' + n + ' 个大小相同的球，其中 ' + m + ' 个红球。任取一个，取到红球的概率是',
        answer: (m / g) + '/' + (n / g),
        wrongs: [((n - m) / g) + '/' + (n / g), '1/' + n, (m / (n - m)) + '/1'],
        analysis: '古典概型 P = 所求基本事件数 / 基本事件总数。'
      };
    },

    'lc.line': function (c) {
      var r = c.rng, k = r.int(-4, 4) || 1, b = r.int(-6, 6);
      return {
        stem: '直线 y = ' + k + 'x ' + (b >= 0 ? '+ ' + b : '- ' + Math.abs(b)) + ' 的斜率为 ______，在 y 轴上的截距为 ______',
        answer: k + '，' + b,
        analysis: 'y = kx + b 中 k 为斜率，b 为纵截距。'
      };
    },

    'lc.circle': function (c) {
      var r = c.rng, a = r.int(-4, 4), b = r.int(-4, 4), rad = r.int(2, 6);
      var D = -2 * a, E = -2 * b, F = a * a + b * b - rad * rad;
      return {
        stem: '圆 x² + y² ' + (D >= 0 ? '+' + D : D) + 'x ' + (E >= 0 ? '+' + E : E) + 'y ' + (F >= 0 ? '+' + F : F) + ' = 0 的圆心是 ______，半径是 ______',
        answer: '(' + a + ', ' + b + ')，' + rad,
        analysis: '配方得 (x - ' + a + ')² + (y - ' + b + ')² = ' + rad + '²。'
      };
    },

    'conic.ellipse': function (c) {
      var r = c.rng;
      var t = r.pick([[3, 4, 5], [5, 12, 13], [6, 8, 10], [8, 15, 17]]);
      var a = t[2], b = t[0], cc = t[1];
      return {
        stem: '椭圆 x²/' + (a * a) + ' + y²/' + (b * b) + ' = 1 的离心率为',
        answer: cc + '/' + a,
        wrongs: [b + '/' + a, a + '/' + cc, (cc * cc) + '/' + (a * a)],
        analysis: 'c = √(a² - b²) = ' + cc + '，e = c/a = ' + cc + '/' + a + '。'
      };
    },

    'seq.arith': function (c) {
      var r = c.rng, a1 = r.int(1, 9), d = r.int(1, 6), n = r.int(5, 15);
      var an = a1 + (n - 1) * d;
      return {
        stem: '等差数列 {aₙ} 中，a₁ = ' + a1 + '，公差 d = ' + d + '，则 a' + n + ' = ______',
        answer: String(an),
        wrongs: [String(a1 + n * d), String(a1 + (n - 1) * d + 1), String(a1 * d)],
        analysis: 'aₙ = a₁ + (n-1)d = ' + a1 + ' + ' + (n - 1) + '×' + d + ' = ' + an + '。'
      };
    },

    'seq.geo': function (c) {
      var r = c.rng, a1 = r.int(1, 4), q = r.pick([2, 3]), n = r.int(3, 6);
      var an = a1 * Math.pow(q, n - 1);
      return {
        stem: '等比数列 {aₙ} 中，a₁ = ' + a1 + '，公比 q = ' + q + '，则 a' + n + ' = ______',
        answer: String(an),
        wrongs: [String(a1 * q * n), String(a1 + (n - 1) * q), String(a1 * Math.pow(q, n))],
        analysis: 'aₙ = a₁qⁿ⁻¹。'
      };
    },

    'der.basic': function (c) {
      var r = c.rng, a = r.int(2, 6), n = r.int(2, 4), b = r.int(1, 9);
      // f = a x^n + b x
      var da = a * n, dn = n - 1;
      return {
        stem: '已知 f(x) = ' + a + 'x^' + n + ' + ' + b + 'x，则 f′(x) = ______',
        answer: (da) + 'x^' + dn + ' + ' + b,
        wrongs: [(a * n) + 'x^' + n + ' + ' + b, (a) + 'x^' + dn + ' + ' + b, (da) + 'x^' + (n + 1) + ' + ' + b],
        analysis: '(xⁿ)′ = nxⁿ⁻¹。'
      };
    },

    'der.app': function (c) {
      var r = c.rng, a = r.int(1, 4), x0 = r.int(-2, 3), b = r.int(-5, 5);
      // f = a x^2 + b x
      var k = 2 * a * x0 + b;
      var y0 = a * x0 * x0 + b * x0;
      var c0 = y0 - k * x0;
      return {
        stem: '曲线 f(x) = ' + a + 'x² ' + (b >= 0 ? '+' + b : b) + 'x 在 x = ' + x0 + ' 处的切线斜率是 ______',
        answer: String(k),
        wrongs: [String(y0), String(2 * a * x0), String(k + 1)],
        analysis: 'f′(x) = ' + 2 * a + 'x ' + (b >= 0 ? '+' + b : b) + '，代入 x = ' + x0 + ' 得 ' + k + '。'
      };
    },

    'cnt.perm': function (c) {
      var r = c.rng, n = r.int(4, 7), m = r.int(2, 3);
      var p = 1;
      for (var i = 0; i < m; i++) p *= (n - i);
      return {
        stem: '从 ' + n + ' 名同学中选出 ' + m + ' 名排成一排，共有 ______ 种排法',
        answer: String(p),
        wrongs: [String(Math.pow(n, m)), String(p * m), String(p / m)],
        analysis: '排列数 A(' + n + ',' + m + ') = ' + n + '×' + (n - 1) + (m > 2 ? '×' + (n - 2) : '') + ' = ' + p + '。'
      };
    },

    'cnt.binom': function (c) {
      var r = c.rng, n = r.int(4, 8), k = r.int(1, 3);
      function C(n, k) {
        var res = 1;
        for (var i = 1; i <= k; i++) res = res * (n - k + i) / i;
        return Math.round(res);
      }
      var v = C(n, k);
      return {
        stem: '(1 + x)^' + n + ' 的展开式中，x^' + k + ' 的系数是 ______',
        answer: String(v),
        wrongs: [String(C(n, k + 1) || v + 1), String(n), String(v * 2)],
        analysis: '二项式系数 C(' + n + ',' + k + ') = ' + v + '。'
      };
    },

    'rv.dist': function (c) {
      var r = c.rng, n = r.int(2, 4);
      var p = r.pick([0.2, 0.25, 0.4, 0.5]);
      var mean = n * p;
      return {
        stem: '随机变量 X ~ B(' + n + ', ' + p + ')，则 E(X) = ______',
        answer: U.num(mean),
        wrongs: [U.num(n * p * (1 - p)), String(n), U.num(p)],
        analysis: '二项分布期望 E(X) = np = ' + n + '×' + p + ' = ' + U.num(mean) + '。'
      };
    }
  };

  function emit(type, core, c) {
    var r = c.rng;
    if (type === 'choice') {
      if (!core.wrongs || core.wrongs.length < 3) return null;
      return U.choice(r, core.stem, core.answer, core.wrongs, core.analysis);
    }
    if (type === 'fill' || type === 'calc' || type === 'solve') {
      var stem = core.stem;
      if (type === 'calc' || type === 'solve') {
        if (!/过程|解答/.test(stem)) stem += '（写出解答过程）';
      }
      return { stem: stem, answer: core.answer, analysis: core.analysis };
    }
    if (type === 'judge') {
      if (core.judge) return U.judge(r, core.judge.stmt, core.judge.truth, core.analysis);
      return null;
    }
    return null;
  }

  function generate(c) {
    var f = K[c.kp];
    if (!f) return null;
    var core;
    try { core = f(c); } catch (e) { return null; }
    if (!core) return null;
    var q = emit(c.type, core, c);
    if (!q) return null;
    q.subject = 'math'; q.stage = 'senior';
    q.kp = c.kp; q.type = c.type; q.diff = c.diff;
    q.grade = c.grade; q.term = c.term;
    return q;
  }

  return { generate: generate, kps: Object.keys(K), coverage: 'core' };
});
