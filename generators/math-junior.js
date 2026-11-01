/* =========================================================
 * 初中数学生成器
 * 覆盖：有理数、整式、方程、不等式、几何、函数、统计概率、三角
 * ======================================================= */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./util.js'));
  else { root.KB = root.KB || {}; root.KB.GenMathJunior = factory(root.KB.GenUtil); }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (U) {

  function neg(n) { return n < 0 ? '(' + n + ')' : String(n); }
  function sgn(n) { return n < 0 ? String(n) : '+' + n; }

  /** 每个知识点返回 {stem, answer, wrongs?, analysis?, judge?} */
  var K = {

    /* ---------- 有理数 ---------- */
    'rat.op': function (c) {
      var r = c.rng, d = c.diff;
      var max = d <= 2 ? 10 : d === 3 ? 20 : 40;
      var a = r.int(1, max) * (r.bool(0.5) ? -1 : 1);
      var b = r.int(1, max) * (r.bool(0.5) ? -1 : 1);
      var op = r.pick(d <= 2 ? ['+', '-'] : ['+', '-', '×', '÷']);
      var ans, expr;
      if (op === '+') { ans = a + b; expr = neg(a) + ' + ' + neg(b); }
      else if (op === '-') { ans = a - b; expr = neg(a) + ' - ' + neg(b); }
      else if (op === '×') { ans = a * b; expr = neg(a) + ' × ' + neg(b); }
      else {
        var q = r.int(1, 9) * (r.bool(0.5) ? -1 : 1);
        ans = a / q; expr = neg(a) + ' ÷ ' + neg(q);
      }
      return {
        stem: '计算：' + expr + ' = ______',
        answer: U.num(ans),
        wrongs: U.numWrongs(r, ans, 3),
        analysis: '先定符号，再算绝对值。' + expr + ' = ' + U.num(ans)
      };
    },

    'rat.num': function (c) {
      var r = c.rng, a = r.int(2, 12) * (r.bool(0.5) ? -1 : 1);
      var kind = r.pick(['abs', 'opp', 'rec']);
      if (kind === 'abs') {
        return { stem: '|' + a + '| 的值是', answer: U.num(Math.abs(a)), wrongs: [U.num(a), U.num(-Math.abs(a)), '0'], analysis: '绝对值表示到原点的距离，恒为非负数。' };
      }
      if (kind === 'opp') {
        return { stem: U.num(a) + ' 的相反数是', answer: U.num(-a), wrongs: [U.num(a), U.num(Math.abs(a)), '0'], analysis: '相反数只改变符号。' };
      }
      var n = r.int(2, 9) * (r.bool(0.5) ? -1 : 1);
      return { stem: U.num(n) + ' 的倒数是', answer: U.frac(1, n), wrongs: [U.num(n), U.num(-n), U.frac(-1, n)], analysis: 'a 的倒数是 1/a（a≠0）。' };
    },

    'rat.sci': function (c) {
      var r = c.rng, base = r.int(2, 9), exp = r.int(3, 7);
      var v = base * Math.pow(10, exp);
      var mant = r.int(10, 99) / 10;
      var val = mant * Math.pow(10, exp);
      var ans = U.num(mant) + '×10^' + exp;
      return {
        stem: '用科学记数法表示：' + U.num(val) + ' = ______',
        answer: ans,
        wrongs: [U.num(mant) + '×10^' + (exp + 1), U.num(mant) + '×10^' + (exp - 1), U.num(mant * 10) + '×10^' + (exp - 1)],
        analysis: '科学记数法写成 a×10ⁿ，其中 1≤|a|<10。'
      };
    },

    /* ---------- 整式 ---------- */
    'poly.term': function (c) {
      var r = c.rng, coef = r.int(2, 9) * (r.bool(0.5) ? -1 : 1), x = r.int(1, 3), y = r.int(0, 2);
      var mono = coef + 'x' + (x > 1 ? '^' + x : '') + (y ? 'y' + (y > 1 ? '^' + y : '') : '');
      var deg = x + y;
      return {
        stem: '单项式 ' + mono + ' 的系数是 ______，次数是 ______',
        answer: coef + '，' + deg,
        analysis: '系数是数字因数（含符号）：' + coef + '；次数是所有字母指数之和：' + x + '+' + y + '=' + deg
      };
    },

    'poly.add': function (c) {
      var r = c.rng;
      var a1 = r.int(1, 5), b1 = r.int(-6, 6), c1 = r.int(-9, 9);
      var a2 = r.int(1, 5) * (r.bool(0.5) ? 1 : -1), b2 = r.int(-6, 6), c2 = r.int(-9, 9);
      var A = U.poly(a1, b1, c1), B = U.poly(a2, b2, c2);
      var A_disp = a2 < 0 ? '(' + B + ')' : B;
      return {
        stem: '化简：(' + A + ') + (' + B + ')',
        answer: U.poly(a1 + a2, b1 + b2, c1 + c2),
        analysis: '合并同类项：系数相加，字母和指数不变。'
      };
    },

    'poly.mul': function (c) {
      var r = c.rng, a = r.int(2, 6), b = r.int(1, 5), d = r.int(-6, 6);
      var ans = U.poly(a * b, a * d, 0);
      return {
        stem: '计算：' + a + 'x·(' + b + 'x ' + sgn(d) + ')',
        answer: ans,
        analysis: '单项式乘多项式，用分配律逐项相乘。'
      };
    },

    'poly.formula': function (c) {
      var r = c.rng, a = r.int(2, 7), b = r.int(1, 6), sign = r.bool(0.5) ? 1 : -1;
      var expr = '(' + a + 'x ' + sgn(sign * b) + ')²';
      var ans = U.poly(a * a, 2 * a * sign * b, b * b);
      return {
        stem: '用乘法公式展开：' + expr,
        answer: ans,
        analysis: '(a±b)² = a² ± 2ab + b²'
      };
    },

    'poly.factor': function (c) {
      var r = c.rng, p = r.int(1, 6), q = r.int(1, 6);
      var b = p + q, cc = p * q;
      return {
        stem: '因式分解：x² + ' + b + 'x + ' + cc,
        answer: '(x + ' + p + ')(x + ' + q + ')',
        wrongs: ['(x - ' + p + ')(x - ' + q + ')', '(x + ' + (p + 1) + ')(x + ' + q + ')', '(x + ' + b + ')(x + 1)'],
        analysis: '找两个数，积为 ' + cc + '，和为 ' + b + '：' + p + ' 和 ' + q + '。'
      };
    },

    /* ---------- 方程与不等式 ---------- */
    'lin1.solve': function (c) {
      var r = c.rng, a = r.int(2, 6), b = r.int(-9, 9), cc = r.int(1, 4), d = r.int(-9, 9);
      // ax + b = cx + d  => (a-c)x = d-b
      var k = a - cc;
      if (k === 0) { cc = cc + 1; k = a - cc; }
      var num = d - b;
      // 保证整数解
      var x = Math.round(num / k * 100) / 100;
      return {
        stem: '解方程：' + a + 'x ' + sgn(b) + ' = ' + cc + 'x ' + sgn(d),
        answer: 'x = ' + U.num(x),
        analysis: '移项、合并同类项、系数化为 1。'
      };
    },

    'lin1.app': function (c) {
      var r = c.rng, price = r.int(3, 12), n = r.int(3, 9), total = price * n + r.int(1, 20);
      return {
        stem: '小明买了 ' + n + ' 支同样的笔，付了 ' + total + ' 元，找回 ' + (total - price * n) + ' 元。每支笔多少元？',
        answer: '每支 ' + price + ' 元',
        analysis: '设每支 x 元，则 ' + n + 'x + ' + (total - price * n) + ' = ' + total + '，解得 x = ' + price + '。'
      };
    },

    'lin2.solve': function (c) {
      var r = c.rng, x = r.int(1, 6), y = r.int(1, 6);
      var a1 = r.int(1, 3), b1 = r.int(1, 3), a2 = r.int(1, 3), b2 = r.int(-3, 3);
      if (a1 * b2 - a2 * b1 === 0) b2 = b2 + 1;
      var c1 = a1 * x + b1 * y, c2 = a2 * x + b2 * y;
      return {
        stem: '解方程组：{ ' + a1 + 'x + ' + b1 + 'y = ' + c1 + ' ； ' + a2 + 'x ' + sgn(b2) + 'y = ' + c2,
        answer: 'x = ' + x + '，y = ' + y,
        analysis: '用代入法或加减消元法求解。'
      };
    },

    'ineq.solve': function (c) {
      var r = c.rng, a = r.int(2, 5), b = r.int(-9, 9), cc = r.int(-9, 9);
      var x = (cc - b) / a;
      return {
        stem: '解不等式：' + a + 'x ' + sgn(b) + ' > ' + cc,
        answer: 'x > ' + U.num(x),
        analysis: '移项得 ' + a + 'x > ' + (cc - b) + '，两边同除以 ' + a + '（正数，不等号方向不变）。'
      };
    },

    /* ---------- 几何 ---------- */
    'geo.angle': function (c) {
      var r = c.rng, a = r.int(15, 75);
      var kind = r.pick(['余', '补']);
      var ans = kind === '余' ? 90 - a : 180 - a;
      return {
        stem: '已知 ∠A = ' + a + '°，则 ∠A 的' + kind + '角是 ______°',
        answer: ans + '°',
        wrongs: [ans + 5 + '°', (kind === '余' ? 180 - a : 90 - a) + '°', ans - 5 + '°'],
        analysis: kind === '余' ? '两角互余，和为 90°。' : '两角互补，和为 180°。'
      };
    },

    'par.angle': function (c) {
      var r = c.rng, a = r.int(30, 150);
      var kind = r.pick(['同位角', '内错角', '同旁内角']);
      var ans = kind === '同旁内角' ? 180 - a : a;
      return {
        stem: '两直线平行，∠1 = ' + a + '°，∠1 与 ∠2 是' + kind + '，则 ∠2 = ______°',
        answer: ans + '°',
        wrongs: [(kind === '同旁内角' ? a : 180 - a) + '°', ans + 10 + '°', Math.abs(90 - a) + '°'],
        analysis: '两直线平行：同位角相等、内错角相等、同旁内角互补。'
      };
    },

    'tri.angle': function (c) {
      var r = c.rng, a = r.int(30, 80), b = r.int(30, 80);
      var ans = 180 - a - b;
      if (ans <= 0) { a = 40; b = 60; }
      return {
        stem: '三角形中两个内角分别是 ' + a + '° 和 ' + b + '°，第三个内角是 ______°',
        answer: (180 - a - b) + '°',
        wrongs: [(180 - a) + '°', (a + b) + '°', (90 - a + b) + '°'],
        analysis: '三角形内角和为 180°。'
      };
    },

    'tri.side': function (c) {
      var r = c.rng, a = r.int(2, 8), b = r.int(2, 8), c3 = r.int(2, 16);
      var ok = (a + b > c3) && (a + c3 > b) && (b + c3 > a);
      return {
        stem: '三根小棒长分别为 ' + a + ' cm、' + b + ' cm、' + c3 + ' cm，能否围成三角形？',
        answer: ok ? '能' : '不能',
        judge: { stmt: '长 ' + a + '、' + b + '、' + c3 + ' 的三条线段一定能围成三角形', truth: ok },
        wrongs: [ok ? '不能' : '能', '无法确定', '只有等腰时能'],
        analysis: '三角形任意两边之和大于第三边。'
      };
    },

    'pyth.calc': function (c) {
      var r = c.rng;
      var trip = r.pick([[3, 4, 5], [6, 8, 10], [5, 12, 13], [8, 15, 17], [7, 24, 25], [9, 12, 15]]);
      var k = r.int(1, 2);
      var a = trip[0] * k, b = trip[1] * k, cc = trip[2] * k;
      return {
        stem: '直角三角形两条直角边分别为 ' + a + ' 和 ' + b + '，斜边长为 ______',
        answer: String(cc),
        wrongs: [String(a + b), String(Math.round(Math.sqrt(a * a + b * b)) + 1), String(Math.abs(b - a))],
        analysis: '勾股定理：a² + b² = c²。'
      };
    },

    'cir.calc': function (c) {
      var r = c.rng, rad = r.int(2, 12), n = r.pick([30, 45, 60, 90, 120, 180]);
      var arc = n / 360 * 2 * Math.PI * rad;
      var area = n / 360 * Math.PI * rad * rad;
      return {
        stem: '半径为 ' + rad + '、圆心角为 ' + n + '° 的扇形，弧长为 ______（π 取 3.14，保留两位小数）',
        answer: U.num(Math.round(n / 360 * 2 * 3.14 * rad * 100) / 100),
        analysis: '弧长 l = nπr/180；扇形面积 S = nπr²/360。'
      };
    },

    /* ---------- 函数 ---------- */
    'fn1.b': function (c) {
      var r = c.rng, k = r.int(1, 4) * (r.bool(0.5) ? 1 : -1), b = r.int(-6, 6);
      var x0 = r.int(-3, 4);
      var y0 = k * x0 + b;
      return {
        stem: '一次函数 y = ' + k + 'x ' + sgn(b) + '，当 x = ' + x0 + ' 时，y = ______',
        answer: String(y0),
        wrongs: [String(y0 + k), String(-y0), String(k * x0 - b)],
        analysis: '把 x 的值代入解析式即可。'
      };
    },

    'ifn.prop': function (c) {
      var r = c.rng, k = r.int(2, 24) * (r.bool(0.5) ? 1 : -1);
      var x0 = r.pick([1, 2, 3, 4, 6, -2, -3]);
      var y0 = k / x0;
      return {
        stem: '反比例函数 y = k/x 的图象经过点 (' + x0 + ', ' + U.num(y0) + ')，则 k = ______',
        answer: String(k),
        wrongs: [String(-k), String(U.num(y0)), String(U.num(x0 + y0))],
        analysis: 'k = xy，把点的坐标相乘即可。'
      };
    },

    'qfn.graph': function (c) {
      var r = c.rng, h = r.int(-5, 5), kk = r.int(-9, 9), a = r.pick([1, 1, 1, -1, 2]);
      // y = a(x-h)^2 + k => ax^2 -2ah x + (ah^2+k)
      var b = -2 * a * h, cc = a * h * h + kk;
      return {
        stem: '二次函数 y = ' + U.poly(a, b, cc) + ' 的顶点坐标是',
        answer: '(' + h + ', ' + kk + ')',
        wrongs: ['(' + (-h) + ', ' + kk + ')', '(' + h + ', ' + (-kk) + ')', '(' + b + ', ' + cc + ')'],
        analysis: '配方得 y = a(x - ' + h + ')² + ' + kk + '，顶点为 (' + h + ', ' + kk + ')。'
      };
    },

    'quad.solve': function (c) {
      var r = c.rng, p = r.int(1, 6), q = r.int(1, 6);
      var b = -(p + q), cc = p * q;
      return {
        stem: '解方程：x² ' + sgn(b) + 'x ' + sgn(cc) + ' = 0',
        answer: 'x₁ = ' + p + '，x₂ = ' + q,
        analysis: '因式分解得 (x - ' + p + ')(x - ' + q + ') = 0。'
      };
    },

    /* ---------- 统计与概率 ---------- */
    'stat.avg': function (c) {
      var r = c.rng, n = r.int(4, 6), vals = [], sum = 0;
      for (var i = 0; i < n; i++) { var v = r.int(60, 100); vals.push(v); sum += v; }
      var avg = Math.round(sum / n * 10) / 10;
      return {
        stem: n + ' 名同学的成绩分别为 ' + vals.join('、') + '，平均分是 ______',
        answer: String(avg),
        wrongs: [String(sum), String(Math.round(avg) + 1), String(Math.round(avg) - 1)],
        analysis: '平均数 = 总和 ÷ 个数 = ' + sum + ' ÷ ' + n + ' = ' + avg
      };
    },

    'prob.basic': function (c) {
      var r = c.rng, red = r.int(2, 8), blue = r.int(2, 8), total = red + blue;
      var ask = r.bool(0.5) ? '红' : '蓝';
      var good = ask === '红' ? red : blue;
      var g = U.gcd(good, total);
      return {
        stem: '袋中有 ' + red + ' 个红球和 ' + blue + ' 个蓝球，随机摸出一个，摸到' + ask + '球的概率是',
        answer: (good / g) + '/' + (total / g),
        wrongs: [(total / g) + '/' + (good / g), '1/' + total, '1/2'],
        analysis: 'P = 所求情况数 ÷ 总情况数 = ' + good + '/' + total
      };
    },

    /* ---------- 三角 ---------- */
    'trig.val': function (c) {
      var r = c.rng;
      var table = [
        ['sin30°', '1/2', ['√3/2', '√2/2', '1']],
        ['cos60°', '1/2', ['√3/2', '√2/2', '1']],
        ['tan45°', '1', ['√3', '√3/3', '1/2']],
        ['sin45°', '√2/2', ['1/2', '√3/2', '√3']],
        ['cos45°', '√2/2', ['1/2', '√3/2', '1']],
        ['tan60°', '√3', ['√3/3', '1', '√2']],
        ['sin60°', '√3/2', ['1/2', '√2/2', '1']]
      ];
      var t = r.pick(table);
      return { stem: t[0] + ' = ______', answer: t[1], wrongs: t[2], analysis: '特殊角三角函数值需熟记。' };
    },

    'sim.prop': function (c) {
      var r = c.rng, k = r.int(2, 4);
      return {
        stem: '两个相似三角形的相似比为 ' + k + ' : 1，则它们的面积比为',
        answer: k * k + ' : 1',
        wrongs: [k + ' : 1', (k + 1) + ' : 1', (2 * k) + ' : 1'],
        analysis: '相似三角形面积比等于相似比的平方。'
      };
    },

    /* ================= 以下为补齐的 24 个知识点 ================= */

    'geo.basic': function (c) {
      var r = c.rng;
      if (r.bool(0.5)) {
        var ab = r.int(6, 30);
        return {
          stem: '点 C 是线段 AB 的中点，AB = ' + ab + ' cm，则 AC = ______ cm',
          answer: U.num(ab / 2),
          wrongs: [String(ab), U.num(ab / 4), U.num(ab * 2)],
          analysis: '中点把线段分成相等的两段：AC = AB ÷ 2。'
        };
      }
      var d = r.int(1, 9), m = r.int(0, 59);
      return {
        stem: '把 ' + d + '°' + m + '′ 化成度，结果是 ______°（用小数表示）',
        answer: U.num(d + m / 60),
        wrongs: [U.num(d + m / 100), U.num(d + m), U.num(d * 60 + m)],
        analysis: '1° = 60′，所以 ' + m + '′ = ' + U.num(m / 60) + '°。'
      };
    },

    'real.sqrt': function (c) {
      var r = c.rng, n = r.int(2, 15);
      if (r.bool(0.5)) {
        return {
          stem: '计算：√' + (n * n) + ' = ______',
          answer: String(n),
          wrongs: [String(n * 2), String(n * n), String(-n)],
          analysis: '因为 ' + n + '² = ' + n * n + '，所以 √' + n * n + ' = ' + n + '。'
        };
      }
      return {
        stem: '计算：∛(' + (-n * n * n) + ') = ______',
        answer: String(-n),
        wrongs: [String(n), String(-n * n), String(-3 * n)],
        analysis: '因为 (' + (-n) + ')³ = ' + (-n * n * n) + '，所以立方根为 ' + (-n) + '。'
      };
    },

    'real.op': function (c) {
      var r = c.rng, a = r.int(2, 9), b = r.int(2, 9);
      var ans = a + b * b - 2 * b; // |−a| + √(b²)... 构造简单式
      var expr = '|-' + a + '| + √' + (b * b) + ' - (-' + b + ')²';
      ans = a + b - b * b;
      return {
        stem: '计算：' + expr + ' = ______',
        answer: U.num(ans),
        wrongs: [U.num(a + b + b * b), U.num(a - b - b * b), U.num(ans + 2 * b)],
        analysis: '|-' + a + '| = ' + a + '，√' + b * b + ' = ' + b + '，(-' + b + ')² = ' + b * b + '。'
      };
    },

    'coord.point': function (c) {
      var r = c.rng, x = r.int(1, 8) * (r.bool(0.5) ? 1 : -1), y = r.int(1, 8) * (r.bool(0.5) ? 1 : -1);
      var q = x > 0 ? (y > 0 ? '第一象限' : '第四象限') : (y > 0 ? '第二象限' : '第三象限');
      return {
        stem: '点 P(' + x + ', ' + y + ') 在第 ______ 象限',
        answer: q,
        wrongs: ['第一象限', '第二象限', '第三象限', '第四象限'].filter(function (v) { return v !== q; }).slice(0, 3),
        analysis: '横坐标 ' + x + '，纵坐标 ' + y + '，符号决定象限。'
      };
    },

    'coord.move': function (c) {
      var r = c.rng, x = r.int(-5, 5), y = r.int(-5, 5), dx = r.int(1, 5), dy = r.int(1, 5);
      var dir = r.bool(0.5) ? '右' : '左';
      var vdir = r.bool(0.5) ? '上' : '下';
      var nx = dir === '右' ? x + dx : x - dx;
      var ny = vdir === '上' ? y + dy : y - dy;
      return {
        stem: '把点 (' + x + ', ' + y + ') 向' + dir + '平移 ' + dx + ' 个单位，再向' + vdir + '平移 ' + dy + ' 个单位，得到点的坐标是 ______',
        answer: '(' + nx + ', ' + ny + ')',
        wrongs: ['(' + (x - dx) + ', ' + ny + ')', '(' + nx + ', ' + (y - dy) + ')', '(' + y + ', ' + x + ')'],
        analysis: '左右平移改变横坐标，上下平移改变纵坐标，' + dir + '加' + (dir === '右' ? '+' : '−') + '，' + vdir + '加' + (vdir === '上' ? '+' : '−') + '。'
      };
    },

    'lin2.app': function (c) {
      var r = c.rng, chicken = r.int(3, 20), rabbit = r.int(3, 20);
      var head = chicken + rabbit, feet = chicken * 2 + rabbit * 4;
      return {
        stem: '鸡兔同笼，共有 ' + head + ' 个头、' + feet + ' 只脚，鸡有 ______ 只，兔有 ______ 只',
        answer: chicken + ' 只，' + rabbit + ' 只',
        analysis: '设鸡 x 只、兔 y 只，则 x + y = ' + head + '，2x + 4y = ' + feet + '，解得 x = ' + chicken + '，y = ' + rabbit + '。'
      };
    },

    'ineq.app': function (c) {
      var r = c.rng, price = r.int(3, 12), money = r.int(40, 120);
      var n = Math.floor(money / price);
      return {
        stem: '小明带了 ' + money + ' 元买单价 ' + price + ' 元的笔记本，最多能买 ______ 本',
        answer: String(n),
        wrongs: [String(n + 1), String(n - 1), String(Math.round(money / price))],
        analysis: '设买 x 本，则 ' + price + 'x ≤ ' + money + '，x ≤ ' + U.num(money / price) + '，取整数最大值为 ' + n + '。'
      };
    },

    'cong.prop': function (c) {
      var r = c.rng;
      var t = r.pick([
        ['AB = DE，BC = EF，AC = DF', 'SSS', '三边分别相等'],
        ['AB = DE，∠B = ∠E，BC = EF', 'SAS', '两边及其夹角分别相等'],
        ['∠A = ∠D，AB = DE，∠B = ∠E', 'ASA', '两角及其夹边分别相等'],
        ['∠A = ∠D，∠B = ∠E，BC = EF', 'AAS', '两角及其中一角的对边分别相等'],
        ['AB = DE，AC = DF，∠B = ∠E = 90°', 'HL', '斜边和一条直角边分别相等']
      ]);
      return {
        stem: '在 △ABC 和 △DEF 中，已知 ' + t[0] + '，则判定两个三角形全等的依据是',
        answer: t[1],
        wrongs: ['SSS', 'SAS', 'ASA', 'AAS', 'HL'].filter(function (v) { return v !== t[1]; }).slice(0, 3),
        analysis: t[1] + '：' + t[2] + '。'
      };
    },

    'sym.axis': function (c) {
      var r = c.rng, apex = r.int(20, 140);
      var base = (180 - apex) / 2;
      return {
        stem: '等腰三角形的顶角为 ' + apex + '°，则它的一个底角是 ______°',
        answer: U.num(base),
        wrongs: [U.num(180 - apex), U.num(apex / 2), U.num(180 - 2 * apex)],
        analysis: '两底角相等，(180° − ' + apex + '°) ÷ 2 = ' + U.num(base) + '°。'
      };
    },

    'frac.op': function (c) {
      var r = c.rng, a = r.int(1, 6), b = r.int(1, 6);
      if (a === b) b = b + 1;
      return {
        stem: '计算：1/(x-' + a + ') + 1/(x+' + b + ')',
        answer: '(' + (2 * a === 0 ? '' : '') + (a + b ? '2x+' + (b - a) : '2x') + ')/[(x-' + a + ')(x+' + b + ')]',
        analysis: '通分：分母为 (x-' + a + ')(x+' + b + ')，分子为 (x+' + b + ')+(x-' + a + ') = 2x+' + (b - a) + '。'
      };
    },

    'frac.eq': function (c) {
      var r = c.rng, a = r.int(1, 5), b = r.int(2, 8);
      // 1/(x-a) = b/x  => x = b(x-a) => x(1-b) = -ab => x = ab/(b-1)
      var x = a * b / (b - 1);
      return {
        stem: '解分式方程：1/(x-' + a + ') = ' + b + '/x',
        answer: 'x = ' + U.num(x),
        analysis: '去分母得 x = ' + b + '(x-' + a + ')，整理得 x = ' + U.num(x) + '，检验 x ≠ ' + a + ' 且 x ≠ 0。'
      };
    },

    'rad.simp': function (c) {
      var r = c.rng, k = r.int(2, 6), m = r.pick([2, 3, 5, 6, 7]);
      var inside = k * k * m;
      return {
        stem: '化简：√' + inside + ' = ______',
        answer: k + '√' + m,
        wrongs: [m + '√' + k, String(inside), (k * m) + '√' + m],
        analysis: '√' + inside + ' = √(' + k * k + '×' + m + ') = ' + k + '√' + m + '。'
      };
    },

    'rad.op': function (c) {
      var r = c.rng, a = r.int(1, 3), b = r.int(1, 4), m = r.pick([2, 3, 5]);
      var coef = a + b;
      return {
        stem: '计算：' + a + '√' + m + ' + ' + b + '√' + m + ' = ______',
        answer: coef + '√' + m,
        wrongs: [(a * b) + '√' + m, (a + b) + '√' + (m * 2), (a + b + 1) + '√' + m],
        analysis: '同类二次根式合并，系数相加：(' + a + '+' + b + ')√' + m + ' = ' + coef + '√' + m + '。'
      };
    },

    'pyth.app': function (c) {
      var r = c.rng;
      var t = r.pick([[3, 4, 5], [6, 8, 10], [5, 12, 13], [8, 15, 17]]);
      return {
        stem: '一架长 ' + t[2] + ' m 的梯子斜靠在墙上，梯脚距墙 ' + t[1] + ' m，梯子顶端距地面 ______ m',
        answer: String(t[0]),
        wrongs: [String(t[2] + t[1]), String(t[1]), String(t[0] + 1)],
        analysis: '由勾股定理，高 = √(' + t[2] + '² − ' + t[1] + '²) = ' + t[0] + ' m。'
      };
    },

    'para.prop': function (c) {
      var r = c.rng, a = r.int(40, 140);
      return {
        stem: '平行四边形的一个内角为 ' + a + '°，则与它相邻的内角是 ______°',
        answer: String(180 - a),
        wrongs: [String(a), String(360 - a), String(90 - a)],
        analysis: '平行四边形邻角互补，和为 180°。'
      };
    },

    'para.special': function (c) {
      var r = c.rng;
      var t = r.pick([
        ['矩形的对角线', '相等', '矩形的两条对角线相等'],
        ['菱形的对角线', '互相垂直', '菱形的对角线互相垂直且平分内角'],
        ['正方形的对角线', '相等且互相垂直', '正方形兼具矩形和菱形的性质'],
        ['平行四边形的对角线', '互相平分', '平行四边形的对角线互相平分']
      ]);
      return {
        stem: t[0] + '一定',
        answer: t[1],
        wrongs: ['相等且互相垂直', '互相垂直', '互相平分'].filter(function (v) { return v !== t[1]; }),
        analysis: t[2] + '。'
      };
    },

    'fn1.k': function (c) {
      var r = c.rng, k = r.int(2, 6) * (r.bool(0.5) ? 1 : -1), x0 = r.int(-4, 4) || 2;
      return {
        stem: '正比例函数 y = kx 的图象经过点 (' + x0 + ', ' + (k * x0) + ')，则 k = ______',
        answer: String(k),
        wrongs: [String(-k), String(k * x0), String(x0)],
        analysis: '把点代入得 ' + (k * x0) + ' = k×(' + x0 + ')，解得 k = ' + k + '。'
      };
    },

    'fn1.app': function (c) {
      var r = c.rng, base = r.int(8, 15), per = r.int(2, 4), km = r.int(5, 20);
      var cost = base + per * km;
      return {
        stem: '某出租车起步价 ' + base + ' 元，超过 3 千米后每千米加收 ' + per + ' 元。行驶 ' + km + ' 千米应付 ______ 元',
        answer: String(cost),
        wrongs: [String(base + per * (km - 3)), String(base + per * km + 3), String(base * km)],
        analysis: '车费 = 起步价 + 超出部分×单价 = ' + base + ' + ' + per + '×(' + km + '−3) = ' + cost + ' 元。'
      };
    },

    'stat.var': function (c) {
      var r = c.rng, mean = r.int(5, 12), n = 4;
      var ds = [r.int(0, 3), -r.int(0, 3), r.int(0, 2), -r.int(0, 2)];
      var vals = ds.map(function (d) { return mean + d; });
      var avg = vals.reduce(function (a, b) { return a + b; }, 0) / n;
      var v = vals.reduce(function (a, b) { return a + (b - avg) * (b - avg); }, 0) / n;
      return {
        stem: '数据 ' + vals.join('、') + ' 的方差是 ______',
        answer: U.num(v),
        wrongs: [U.num(v * 2), U.num(Math.sqrt(v)), U.num(avg)],
        analysis: '平均数 ' + U.num(avg) + '，方差 = 各偏差平方和的平均 = ' + U.num(v) + '。'
      };
    },

    'quad.app': function (c) {
      var r = c.rng, p = r.int(10, 30), years = r.pick([2, 3]);
      var rate = p / 100;
      var start = r.int(100, 500);
      var end = Math.round(start * Math.pow(1 + rate, years));
      return {
        stem: '某商品原价 ' + start + ' 元，连续 ' + years + ' 年按相同百分率涨价后为 ' + end + ' 元。设年增长率为 x，可列方程 ______',
        answer: start + '(1+x)^' + years + ' = ' + end,
        wrongs: [start + '(1+x)' + years + ' = ' + end, start + '(' + years + 'x) = ' + end, start + '(1-x)^' + years + ' = ' + end],
        analysis: '连续 ' + years + ' 年增长，方程为 ' + start + '(1+x)^' + years + ' = ' + end + '。'
      };
    },

    'qfn.app': function (c) {
      var r = c.rng, price = r.int(20, 60), cost = r.int(5, 15), n = r.int(10, 40);
      var profit = (price - cost) * n;
      return {
        stem: '某商品每件成本 ' + cost + ' 元，售价 ' + price + ' 元时每天卖出 ' + n + ' 件。若售价每降低 1 元可多卖 5 件，则每天最大利润为 ______ 元',
        answer: String(profit),
        wrongs: [String(profit + 50), String(profit - 50), String((price - cost) * (n + 5))],
        analysis: '设降价 x 元，利润 = (' + (price - cost) + ' − x)(' + n + ' + 5x)，配方求最大值。'
      };
    },

    'cir.prop': function (c) {
      var r = c.rng, central = r.int(20, 180) * 2;
      if (central > 360) central = 160;
      return {
        stem: '同弧所对的圆心角为 ' + central + '°，则该弧所对的圆周角是 ______°',
        answer: String(central / 2),
        wrongs: [String(central), String(central * 2), String(180 - central / 2)],
        analysis: '同弧所对的圆周角等于圆心角的一半。'
      };
    },

    'cir.tangent': function (c) {
      var r = c.rng, rad = r.int(3, 10), tang = r.int(4, 16);
      var op = Math.sqrt(rad * rad + tang * tang);
      return {
        stem: '从圆外一点向半径为 ' + rad + ' 的圆作切线，切线长为 ' + tang + '，则该点到圆心的距离为 ______',
        answer: U.num(op),
        wrongs: [String(rad + tang), String(tang - rad), U.num(rad * rad + tang * tang)],
        analysis: '半径⊥切线，由勾股定理 OP² = r² + 切线长²，OP = ' + U.num(op) + '。'
      };
    },

    'trig.app': function (c) {
      var r = c.rng;
      var t = r.pick([
        [30, '1/2'], [45, '√2/2'], [60, '√3/2']
      ]);
      var dist = r.int(20, 100);
      var h = dist * Math.tan(t[0] * Math.PI / 180);
      return {
        stem: '在距塔底 ' + dist + ' m 处测得塔顶的仰角为 ' + t[0] + '°，塔高约为 ______（tan' + t[0] + '° ≈ ' + U.num(Math.tan(t[0] * Math.PI / 180), 3) + '）',
        answer: U.num(Math.round(h * 10) / 10),
        analysis: 'tan' + t[0] + '° = 塔高 ÷ 水平距离，塔高 = ' + dist + '×' + U.num(Math.tan(t[0] * Math.PI / 180), 3) + '。'
      };
    }
  };

  /** 把核心结果包装成目标题型 */
  function emit(type, core, c) {
    var r = c.rng;
    if (type === 'choice') {
      if (!core.wrongs || core.wrongs.length < 3) return null;
      return U.choice(r, core.stem, core.answer, core.wrongs, core.analysis);
    }
    if (type === 'fill' || type === 'calc' || type === 'solve' || type === 'app') {
      var stem = core.stem;
      if (type === 'calc' || type === 'solve' || type === 'app') {
        if (!/写出|过程|解答/.test(stem)) stem += '（写出解答过程）';
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
    q.subject = 'math'; q.stage = 'junior';
    q.kp = c.kp; q.type = c.type; q.diff = c.diff;
    q.grade = c.grade; q.term = c.term;
    return q;
  }

  return { generate: generate, kps: Object.keys(K), coverage: 'core' };
});
