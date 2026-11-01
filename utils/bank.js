/* =========================================================
 * 人教版小学数学题库 —— 题目生成核心
 * 由原单文件网页版移植：纯 JS，不依赖任何 DOM / 页面 API。
 * 所有题目与答案均由程序同步生成、同步计算，保证答案正确。
 * ======================================================= */

/* ---------------- 基础工具 ---------------- */
const R = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
const pick = a => a[Math.floor(Math.random() * a.length)];
function shuffle(a) {
  a = [...a];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
const fix = x => Math.round(x * 1e10) / 1e10;
function fmt(x) {
  if (typeof x !== 'number') return String(x);
  let s = fix(x).toFixed(8).replace(/0+$/, '').replace(/\.$/, '');
  if (s === '-0') s = '0';
  return s === '' ? '0' : s;
}
const rd = (min, max, p) => {
  const v = min + Math.random() * (max - min);
  return Math.round(v * 10 ** p) / 10 ** p;
};
const CN = ['一', '二', '三', '四', '五', '六', '七', '八', '九', '十', '十一', '十二'];
const gcd = (a, b) => (b ? gcd(b, a % b) : a);

function fracStr(n, d) {
  const g = gcd(Math.abs(n), Math.abs(d));
  n /= g; d /= g;
  if (d === 1) return '' + n;
  if (n > d && n % d !== 0) return Math.floor(n / d) + '又' + (n % d) + '/' + d;
  return n + '/' + d;
}

/* 循环小数：返回循环节、简便写法、展开值 */
function repetend(num, den) {
  const ip = Math.floor(num / den);
  let rem = num % den, digits = '', seen = {};
  while (rem !== 0 && !(rem in seen) && digits.length < 40) {
    seen[rem] = digits.length;
    rem *= 10;
    digits += Math.floor(rem / den);
    rem %= den;
  }
  if (rem === 0) return { term: true, str: ip + (digits ? '.' + digits : ''), cyc: '', val: num / den };
  const s = seen[rem], non = digits.slice(0, s), cyc = digits.slice(s);
  const exp = ip + '.' + non + cyc.repeat(6).slice(0, Math.max(6, 10 - non.length));
  return {
    term: false,
    str: ip + '.' + non + '(' + cyc + ')',
    short: ip + '.' + non + '…',
    cyc, non, exp,
    val: parseFloat(exp),
  };
}

/* 整数读作（万以内 + 亿以内） */
const DIG_CH = ['零', '一', '二', '三', '四', '五', '六', '七', '八', '九'];
const UNIT_CH = ['', '十', '百', '千'];
function readGroup4(n) {
  let s = '', zero = false;
  for (let i = 3; i >= 0; i--) {
    const d = Math.floor(n / 10 ** i) % 10;
    if (d === 0) {
      if (s) zero = true;
    } else {
      if (zero) { s += '零'; zero = false; }
      s += DIG_CH[d] + UNIT_CH[i];
    }
  }
  return s;
}
function readCN(n) {
  if (n === 0) return '零';
  const yi = Math.floor(n / 1e8);
  const wan = Math.floor(n / 1e4) % 1e4;
  const ge = n % 1e4;
  let s = '';
  if (yi) s += readGroup4(yi) + '亿';
  if (wan) {
    if (s && wan < 1000) s += '零';
    s += readGroup4(wan) + '万';
  } else if (s && ge) {
    s += '零';
  }
  if (ge) {
    if (s && ge < 1000 && !/零$/.test(s)) s += '零';
    s += readGroup4(ge);
  }
  return s.replace(/^一十/, '十');
}

/* ---------------- 题型 / 知识点 ---------------- */
const TYPES = [
  { id: 'oral', name: '口算', note: '直接写出得数' },
  { id: 'vertical', name: '竖式计算', note: '列竖式计算' },
  { id: 'calc', name: '脱式计算', note: '递等式计算，能简算的要简算' },
  { id: 'simple', name: '简便运算', note: '用简便方法计算' },
  { id: 'equation', name: '解方程', note: '解方程，并检验' },
  { id: 'fill', name: '填空', note: '在括号或横线上填上合适的数' },
  { id: 'judge', name: '判断', note: '对的画“√”，错的画“×”' },
  { id: 'choice', name: '选择', note: '把正确答案的序号填在括号里' },
  { id: 'estimate', name: '估算', note: '估算下面各题的结果' },
  { id: 'error', name: '错题辨析', note: '判断对错，错的说出错在哪里并改正' },
  { id: 'app', name: '应用题', note: '解决问题，写出计算过程' },
];

const KNOW = {
  intAddSub: { name: '整数加减法' },
  intMul: { name: '整数乘法' },
  intDiv: { name: '整数除法' },
  intMix: { name: '整数四则混合运算' },
  decAddSub: { name: '小数加减法' },
  decMul: { name: '小数乘法' },
  decDiv: { name: '小数除法' },
  cyclic: { name: '循环小数' },
  approx: { name: '取近似数' },
  simple: { name: '简便运算' },
  equation: { name: '简易方程' },
  area: { name: '多边形的面积' },
  perim: { name: '周长' },
  fraction: { name: '分数加减法' },
  fracMD: { name: '分数乘除法' },
  percent: { name: '百分数' },
  ratio: { name: '比与比例' },
  position: { name: '位置（数对）' },
  possibility: { name: '可能性' },
  plant: { name: '植树问题' },
  observe: { name: '观察简单组合体' },
  motion: { name: '图形的运动' },
  factor: { name: '因数与倍数' },
  volume: { name: '长方体和正方体' },
  mean: { name: '平均数' },
  time: { name: '时间与钟表' },
  money: { name: '人民币' },
  measure: { name: '单位换算' },
  bigNum: { name: '大数的认识' },
  angle: { name: '角与三角形' },
  negative: { name: '负数初步' },
  shape: { name: '认识图形' },
};

/* 课程表：[知识点 id, 是否默认勾选] */
const CUR = {
  cur: {
    1: { up: [['intAddSub', 1], ['shape', 0], ['time', 0]], down: [['intAddSub', 1], ['money', 0], ['measure', 0]] },
    2: { up: [['intMul', 1], ['measure', 0], ['angle', 0]], down: [['intDiv', 1], ['bigNum', 0], ['intMix', 0]] },
    3: { up: [['intAddSub', 1], ['intMul', 1], ['fraction', 0], ['perim', 0]], down: [['intMul', 1], ['intDiv', 0], ['area', 0], ['decAddSub', 0]] },
    4: { up: [['bigNum', 1], ['intMul', 1], ['intDiv', 0], ['angle', 0]], down: [['intMix', 1], ['decAddSub', 1], ['approx', 0], ['angle', 0]] },
    5: {
      up: [['decMul', 1], ['decDiv', 1], ['cyclic', 0], ['approx', 0], ['position', 0], ['possibility', 0], ['equation', 0], ['area', 0], ['plant', 0], ['simple', 0]],
      down: [['factor', 1], ['volume', 1], ['fraction', 1], ['motion', 0]],
    },
    6: {
      up: [['fracMD', 1], ['position', 0], ['ratio', 1], ['area', 0], ['percent', 1]],
      down: [['negative', 1], ['volume', 0], ['ratio', 1], ['percent', 1]],
    },
  },
  new2026: {
    5: { up: [['observe', 1], ['decMul', 1], ['decDiv', 1], ['cyclic', 0], ['motion', 0], ['equation', 0], ['area', 0]] },
  },
};

function curriculum(ver, g, t) {
  const c = (CUR[ver] && CUR[ver][g] && CUR[ver][g][t]) || (CUR.cur[g] && CUR.cur[g][t]);
  return c || [['intAddSub', 1], ['intMul', 0]];
}

/* ---------------- 生成上下文 ---------------- */
const ctx = { grade: 5, focus: null };
function setContext(grade, focus) {
  ctx.grade = grade || 5;
  ctx.focus = focus || null;
}

/* ---------------- 计算核心 ---------------- */
const dig = n => (n <= 1 ? R(2, 9) : R(10 ** (n - 1), 10 ** n - 1));

function core(cat, diff, g) {
  switch (cat) {
    case 'intAddSub': {
      const lim = [20, 100, 500, 3000, 20000, 200000, 900000][Math.min(6, g - 1 + diff)];
      const a = R(Math.floor(lim / 3), lim), b = R(2, lim);
      if (Math.random() < 0.5) return { expr: `${a} + ${b}`, ans: a + b, a, b, op: '+' };
      const x = Math.max(a, b), y = Math.min(a, b);
      return { expr: `${x} − ${y}`, ans: x - y, a: x, b: y, op: '−' };
    }

    case 'intMul': {
      const L = g + diff;
      const pat = L <= 3 ? [1, 1] : L <= 5 ? pick([[2, 1], [1, 1]]) : L <= 7 ? pick([[3, 1], [2, 2]]) : pick([[3, 2], [3, 1]]);
      const a = dig(pat[0]), b = dig(pat[1]);
      return { expr: `${a} × ${b}`, ans: a * b, a, b, op: '×' };
    }

    case 'intDiv': {
      const L = g + diff;
      const bd = L <= 3 ? 1 : L <= 6 ? pick([1, 2]) : 2;
      const b = dig(bd);
      const q = dig(bd === 2 ? 2 : pick([1, 2]));
      const rem = diff === 2 && Math.random() < 0.5 ? R(1, b - 1) : 0;
      const a = b * q + rem;
      return { expr: `${a} ÷ ${b}`, ans: rem ? `${q}……${rem}` : q, ansNum: q, a, b, op: '÷', rem };
    }

    case 'decAddSub': {
      const p = diff === 0 ? 1 : 2;
      const a = rd(1, diff === 2 ? 300 : 60, p), b = rd(0.5, diff === 2 ? 200 : 50, p);
      if (Math.random() < 0.5) return { expr: `${fmt(a)} + ${fmt(b)}`, ans: fix(a + b), a, b, op: '+' };
      const x = Math.max(a, b), y = Math.min(a, b);
      return { expr: `${fmt(x)} − ${fmt(y)}`, ans: fix(x - y), a: x, b: y, op: '−' };
    }

    case 'decMul': {
      let a, b;
      if (ctx.focus === 'mulpoint') {
        /* 积的小数点 · 部分积对位：一位小数 × 两位小数 / 两位小数相乘 */
        const mode = R(0, 2);
        if (mode === 0) { a = rd(1.1, 9.9, 1); b = rd(0.11, 0.99, 2); }
        else if (mode === 1) { a = rd(0.2, 0.9, 1); b = rd(0.2, 0.9, 1); }
        else { a = rd(10.5, 99.5, 1); b = rd(1.1, 9.9, 1); }
      } else if (diff === 0) {
        a = rd(0.3, 9.9, 1);
        b = Math.random() < 0.5 ? R(2, 9) : rd(1.1, 9.9, 1);
      } else if (diff === 1) {
        a = rd(0.4, 19.9, pick([1, 2]));
        b = rd(0.3, 9.9, pick([1, 2]));
        if (a === Math.floor(a) && b === Math.floor(b)) a = fix(a + 0.5);
      } else {
        a = rd(1.2, 99.9, pick([2, 3]));
        b = rd(0.12, 9.99, pick([2, 3]));
      }
      return { expr: `${fmt(a)} × ${fmt(b)}`, ans: fix(a * b), a, b, op: '×' };
    }

    case 'decDiv': {
      /* 倒推构造，保证除得尽、答案准确 */
      let d, q;
      if (diff === 0) { d = R(2, 9); q = rd(0.4, 30, pick([1, 2])); }
      else if (diff === 1) { d = Math.random() < 0.6 ? rd(0.2, 9.9, 1) : R(2, 25); q = rd(0.15, 60, 2); }
      else { d = rd(0.15, 19.9, pick([1, 2])); q = rd(0.05, 99, 2); }

      if (ctx.focus === 'point') {
        /* 商的小数点定点专练：商小于 1 / 商中间带 0 / 整数部分带 0 */
        const mode = R(0, 2);
        if (mode === 0) { d = rd(1.2, 9.9, 1); q = rd(0.11, 0.98, 2); }
        else if (mode === 1) { d = rd(0.3, 9.9, 1); q = pick([0.32, 0.24, 0.16, 0.48, 0.64, 0.28, 0.36, 0.52, 0.04, 0.08, 0.06, 0.45, 0.35, 0.25]); }
        else { d = R(3, 48); q = rd(1.02, 9.09, 2); }
      }
      const a = fix(d * q);
      return { expr: `${fmt(a)} ÷ ${fmt(d)}`, ans: q, a, b: d, op: '÷' };
    }

    case 'fraction': {
      const dens = diff === 0 ? [4, 5, 6, 8, 10, 12] : [3, 4, 6, 8, 9, 12];
      const d = pick(dens);
      const n1 = R(1, d - 1), n2 = R(1, d - 1);
      if (diff >= 1 && Math.random() < 0.5) {
        const d2 = pick(dens.filter(x => x !== d));
        const N = n1 * d2 + n2 * d, D = d * d2;
        return { expr: `${n1}/${d} + ${n2}/${d2}`, ans: fracStr(N, D), ansNum: N / D, frac: [N, D] };
      }
      if (Math.random() < 0.5) return { expr: `${n1}/${d} + ${n2}/${d}`, ans: fracStr(n1 + n2, d), ansNum: (n1 + n2) / d, frac: [n1 + n2, d] };
      const x = Math.max(n1, n2), y = Math.min(n1, n2);
      return { expr: `${x}/${d} − ${y}/${d}`, ans: fracStr(x - y, d), ansNum: (x - y) / d, frac: [x - y, d] };
    }

    case 'fracMD': {
      const d1 = pick([3, 4, 5, 6, 8, 9, 10]), d2 = pick([3, 4, 5, 6, 7, 8, 9]);
      const n1 = R(1, d1 - 1), n2 = R(1, d2 + 1);
      if (Math.random() < 0.5) return { expr: `${n1}/${d1} × ${n2}/${d2}`, ans: fracStr(n1 * n2, d1 * d2), ansNum: n1 * n2 / (d1 * d2), frac: [n1 * n2, d1 * d2] };
      return { expr: `${n1}/${d1} ÷ ${n2}/${d2}`, ans: fracStr(n1 * d2, d1 * n2), ansNum: n1 * d2 / (d1 * n2), frac: [n1 * d2, d1 * n2] };
    }

    case 'percent': {
      const p = pick([5, 10, 15, 20, 25, 30, 40, 50, 60, 75, 80, 90]);
      const b = R(2, 40) * 10;
      return { expr: `${b} × ${p}%`, ans: fix(b * p / 100), a: b, b: p, op: '×' };
    }

    case 'intMix': {
      const cc = calcCore('int', diff);
      return { expr: cc.expr, ans: cc.ans };
    }

    case 'mean': {
      const n = pick([4, 5]);
      const target = R(40, 80);
      const arr = [];
      let s = 0;
      for (let i = 0; i < n - 1; i++) {
        const v = target + R(-4, 4);
        arr.push(v); s += v;
      }
      arr.push(target * n - s);
      return { list: arr, ans: target, expr: arr.join('、') };
    }
  }
  return null;
}

/* 脱式：两步运算，逐步算出 */
function calcCore(fam, diff) {
  const num = () => (fam === 'dec' ? rd(0.4, 30, 1) : R(3, 90));
  const t = R(0, 3);
  const a = num(), b = num(), c = num();
  if (t === 0) { const p = fix(a * b); return { expr: `${fmt(a)} × ${fmt(b)} + ${fmt(c)}`, ans: fix(p + c) }; }
  if (t === 1) { const p = fix(b * c); const x = fix(a + p); return { expr: `${fmt(x)} − ${fmt(b)} × ${fmt(c)}`, ans: a }; }
  if (t === 2) {
    const q = diff === 0 ? R(2, 9) : rd(0.5, 9, 1);
    const dv = fam === 'dec' ? rd(0.5, 9, 1) : R(2, 9);
    const dd = fix(q * dv);
    return { expr: `${fmt(dd)} ÷ ${fmt(dv)} + ${fmt(c)}`, ans: fix(q + c) };
  }
  const s = fix(a + b);
  return { expr: `( ${fmt(a)} + ${fmt(b)} ) × ${fmt(c)}`, ans: fix(s * c) };
}

/* 简便运算模板：凑整、分配律、拆数、连乘凑对 */
function simpleCore(diff) {
  const t = R(0, diff === 2 ? 7 : 5);
  if (t === 0) {
    const a = pick([25, 125, 4, 8, 2.5, 0.25]);
    const pair = a === 25 ? 4 : a === 125 ? 8 : a === 4 ? 25 : a === 8 ? 125 : 4;
    const c = R(3, 30);
    const x = fix(a * pair * c);
    return { expr: `${fmt(a)} × ${fmt(c)} × ${pair}`, ans: x, hint: `先算 ${fmt(a)}×${pair}＝${fmt(a * pair)}` };
  }
  if (t === 1) {
    const a = rd(1.2, 30, 1);
    const b = pick([60, 70, 80, 90, 30, 40]);
    const c = 100 - b;
    return { expr: `${fmt(a)} × ${b} + ${fmt(a)} × ${c}`, ans: fix(a * 100), hint: `合并成 ${fmt(a)}×(${b}+${c})` };
  }
  if (t === 2) {
    const a = rd(1.5, 60, 1);
    return { expr: `${fmt(a)} × 99`, ans: fix(a * 99), hint: `把 99 看成 100−1` };
  }
  if (t === 3) {
    const a = R(15, 900);
    const b = pick([98, 99, 101, 102, 199, 201]);
    const base = b < 100 ? 100 : 200;
    const dd = base - b;
    return {
      expr: `${a} + ${b}`,
      ans: a + b,
      hint: dd > 0 ? `把 ${b} 看成 ${base}−${dd}` : `把 ${b} 看成 ${base}+${-dd}`,
    };
  }
  if (t === 4) {
    const target = pick([100, 150, 200]);
    const b = rd(5, 60, 1);
    const a = rd(target + 20, target + 200, 1);
    const cc = fix(target - b);
    return { expr: `${fmt(a)} − ${fmt(b)} − ${fmt(cc)}`, ans: fix(a - target), hint: `${fmt(b)}+${fmt(cc)} 正好凑成 ${target}` };
  }
  if (t === 5) {
    const a = rd(0.5, 9, 1);
    return { expr: `${fmt(a)} × 101`, ans: fix(a * 101), hint: `把 101 看成 100+1` };
  }
  if (t === 6) {
    const a = rd(2, 50, 1);
    const b = pick([0.25, 0.5, 1.5, 2.5]);
    return { expr: `${fmt(a)} ÷ ${fmt(b)} + ${fmt(fix(a * 2))} ÷ ${fmt(b)}`, ans: fix(a / b + a * 2 / b), hint: '先合并被除数' };
  }
  const a = rd(1, 20, 1);
  const b = pick([9.9, 99]);
  if (b === 99) return { expr: `${fmt(a)} × 99 + ${fmt(a)}`, ans: fix(a * 100), hint: `补一个 ${fmt(a)}，凑成 ${fmt(a)}×100` };
  return { expr: `${fmt(a)} × 9.9 + ${fmt(a)} × 0.1`, ans: fix(a * 10), hint: `提公因数 ${fmt(a)}，凑成 ${fmt(a)}×10` };
}

/* 方程构造：解由程序反推 */
function eqCore(diff) {
  const t = R(0, diff === 0 ? 3 : diff === 1 ? 5 : 6);
  if (t === 0) { const b = R(2, 60), x = R(2, 60); return { eq: `x + ${b} = ${x + b}`, ans: `x = ${x}` }; }
  if (t === 1) { const b = R(2, 60), x = R(2, 60); return { eq: `x − ${b} = ${x}`, ans: `x = ${x + b}` }; }
  if (t === 2) { const a = R(2, 12), x = R(2, 30); return { eq: `${a}x = ${a * x}`, ans: `x = ${x}` }; }
  if (t === 3) { const a = R(2, 12), x = R(2, 30); return { eq: `x ÷ ${a} = ${x}`, ans: `x = ${a * x}` }; }
  if (t === 4) { const a = R(2, 12), x = R(2, 25), b = R(2, 50); return { eq: `${a}x + ${b} = ${a * x + b}`, ans: `x = ${x}` }; }
  if (t === 5) { const a = R(2, 12), x = R(3, 25), b = R(2, a * x - 1); return { eq: `${a}x − ${b} = ${a * x - b}`, ans: `x = ${x}` }; }
  const a = R(2, 9), b = R(2, 9), x = R(2, 20);
  return { eq: `${a}x + ${b}x = ${(a + b) * x}`, ans: `x = ${x}` };
}

/* 面积构造 */
function areaCore(diff) {
  const t = R(0, diff === 2 ? 5 : 4);
  if (t === 0) { const b = rd(2, 30, 1), h = rd(2, 20, 1); return { desc: `一个平行四边形的底是 ${fmt(b)} 厘米，高是 ${fmt(h)} 厘米`, ans: fix(b * h), unit: '平方厘米' }; }
  if (t === 1) { const b = rd(2, 30, 1), h = rd(2, 20, 1); return { desc: `一个三角形的底是 ${fmt(b)} 米，高是 ${fmt(h)} 米`, ans: fix(b * h / 2), unit: '平方米' }; }
  if (t === 2) { const a = rd(2, 20, 1), b = rd(2, 20, 1), h = rd(2, 15, 1); return { desc: `一个梯形的上底是 ${fmt(a)} 分米，下底是 ${fmt(b)} 分米，高是 ${fmt(h)} 分米`, ans: fix((a + b) * h / 2), unit: '平方分米' }; }
  if (t === 3) { const l = rd(2, 25, 1), w = rd(2, 15, 1); return { desc: `一个长方形的长是 ${fmt(l)} 米，宽是 ${fmt(w)} 米`, ans: fix(l * w), unit: '平方米' }; }
  if (t === 4) { const s = rd(2, 20, 1); return { desc: `一个正方形的边长是 ${fmt(s)} 厘米`, ans: fix(s * s), unit: '平方厘米' }; }
  const l = rd(4, 20, 1), w = rd(3, 12, 1), b = rd(3, 15, 1), h = rd(2, 10, 1);
  return {
    desc: `一个组合图形由一个长方形和一个三角形拼成：长方形的长是 ${fmt(l)} 厘米、宽是 ${fmt(w)} 厘米，三角形的底是 ${fmt(b)} 厘米、高是 ${fmt(h)} 厘米`,
    ans: fix(l * w + b * h / 2),
    unit: '平方厘米',
  };
}

function wrongOf(ansNum) {
  const cands = [ansNum * 10, ansNum / 10, fix(ansNum + (ansNum >= 10 ? 1 : 0.1)), fix(ansNum - (ansNum >= 10 ? 2 : 0.2))]
    .filter(v => v > 0 && Math.abs(v - ansNum) > 1e-9);
  return cands.length ? pick(cands) : fix(ansNum + 1);
}

function choiceOpts(ans) {
  const set = new Set([fmt(ans)]);
  const cands = [
    fix(ans * 10), fix(ans / 10),
    fix(ans + (Math.abs(ans) >= 10 ? 1 : 0.1)),
    fix(ans - (Math.abs(ans) >= 10 ? 1 : 0.1)),
    fix(ans + (Math.abs(ans) >= 10 ? 10 : 1)),
  ];
  for (const c of shuffle(cands)) {
    if (set.size >= 4) break;
    if (c > 0) set.add(fmt(c));
  }
  let k = 1;
  while (set.size < 4 && k < 60) { set.add(fmt(ans + k * 3 + 1)); k++; }
  return shuffle([...set]);
}

/* 分数题的四个选项：正确答案 + 变形干扰项 */
function fracOpts(n, d, rightStr) {
  const out = [rightStr];
  const cands = [fracStr(n + 1, d), fracStr(n, d + 1), fracStr(Math.max(1, n - 1), d), fracStr(n + 1, d + 1)];
  for (const x of cands) {
    if (out.length >= 4) break;
    if (out.indexOf(x) < 0) out.push(x);
  }
  let k = 2;
  while (out.length < 4 && k < 30) {
    const x = fracStr(n + k, d + k);
    if (out.indexOf(x) < 0) out.push(x);
    k++;
  }
  return shuffle(out);
}

/* optLines：先输出带标记的 HTML 片段，最终由 finalize 拆成结构化选项 */
const optLines = arr => arr.map((o, i) => `<span class="optline">${'ABCD'[i]}. ${o}</span>`).join('');

/* ---------------- 生活情境题（2025–2026 情境，数字随机） ---------------- */
function appQ(cat, diff) {
  const goods = [['瓶', '苹果汁', 3.5, 9.9], ['本', '笔记本', 2.5, 12.5], ['支', '中性笔', 1.5, 6.5], ['个', '面包', 4.5, 15], ['盒', '牛奶', 5.5, 18], ['张', '贴纸', 0.8, 3.5]];

  if (cat === 'decMul') {
    const t = R(0, 3);
    if (t === 0) {
      const [u, nm, lo, hi] = pick(goods);
      const p = rd(lo, hi, 1), n = R(3, 24);
      return { q: `超市里一种${nm}每${u} ${fmt(p)} 元。买 ${n} ${u}需要多少元？`, a: `${fmt(p)}×${n}＝${fmt(fix(p * n))}（元）` };
    }
    if (t === 1) {
      const p = rd(0.15, 0.6, 2), n = R(15, 45);
      return { q: `妈妈手机看一集动画片大约用 ${fmt(p)} GB 流量。这个月她一共看了 ${n} 集，大约用了多少 GB 流量？`, a: `${fmt(p)}×${n}＝${fmt(fix(p * n))}（GB）` };
    }
    if (t === 2) {
      const p = rd(0.08, 0.25, 2), n = R(12, 40);
      return { q: `共享单车骑行时，每分钟收费 ${fmt(p)} 元。哥哥骑了 ${n} 分钟，应付多少元？`, a: `${fmt(p)}×${n}＝${fmt(fix(p * n))}（元）` };
    }
    const p = rd(6, 28, 1), n = rd(1.5, 6.5, 1);
    return { q: `一桶水重 ${fmt(p)} 千克，${fmt(n)} 桶水共重多少千克？`, a: `${fmt(p)}×${fmt(n)}＝${fmt(fix(p * n))}（千克）` };
  }

  if (cat === 'approx') {
    const t = R(0, 5);
    if (t === 0 || t === 1) { const sub = appQ('decDiv', diff); if (sub) return sub; }
    if (t === 2) {
      const base = pick([8, 9, 10, 11]), per = rd(1.5, 2.6, 1), km = R(6, 18);
      return { q: `某市出租车收费：3 千米以内 ${base} 元，超过 3 千米的部分每千米 ${fmt(per)} 元。爸爸乘出租车行驶了 ${km} 千米，应付多少元？`, a: `${base}＋(${km}－3)×${fmt(per)}＝${fmt(fix(base + (km - 3) * per))}（元）` };
    }
    if (t === 3) {
      const first = pick([5, 6, 8]), per = pick([2, 3, 4]), hrs = rd(1.3, 5.8, 1);
      const extra = Math.ceil(hrs - 1);
      return { q: `停车场收费：首小时 ${first} 元，之后每小时 ${per} 元（不足 1 小时按 1 小时算）。一辆车停了 ${fmt(hrs)} 小时，应付多少元？`, a: `超过部分按 ${extra} 小时算：${first}＋${extra}×${per}＝${first + extra * per}（元）` };
    }
    if (t === 4) {
      const first = pick([10, 12, 13]), per = pick([2, 3, 4]), w = rd(1.2, 5.6, 1);
      const extra = Math.ceil(w - 1);
      return { q: `寄快递收费：首重 1 千克 ${first} 元，续重每千克 ${per} 元（不足 1 千克按 1 千克算）。一个包裹重 ${fmt(w)} 千克，应付快递费多少元？`, a: `续重按 ${extra} 千克算：${first}＋${extra}×${per}＝${first + extra * per}（元）` };
    }
    const a2 = R(11, 99), b2 = pick([3, 6, 7, 9, 12]);
    return { q: `计算 ${a2} ÷ ${b2}，商保留两位小数约是多少？`, a: `${(a2 / b2).toFixed(2)}` };
  }

  if (cat === 'decDiv') {
    const t = R(0, 2);
    if (t === 0) {
      const cap = pick([0.25, 0.4, 0.5, 0.8]), tot = rd(3, 20, 1);
      const qv = tot / cap, n = Math.ceil(fix(qv) - 1e-9);
      const disp = Math.abs(qv - parseFloat(qv.toFixed(2))) < 1e-9 ? `＝${fmt(qv)}` : `≈${qv.toFixed(2)}`;
      return { q: `妈妈做了 ${fmt(tot)} 千克果酱，每个瓶子最多装 ${fmt(cap)} 千克。把果酱全部装完，至少需要准备多少个瓶子？`, a: `${fmt(tot)}÷${fmt(cap)}${disp}，果酱不能剩下，要用进一法，至少需要 ${n} 个瓶子` };
    }
    if (t === 1) {
      const per = pick([0.6, 0.9, 1.2, 1.5]), tot = rd(8, 30, 1);
      const qv = tot / per, n = Math.floor(fix(qv) + 1e-9);
      const disp = Math.abs(qv - parseFloat(qv.toFixed(2))) < 1e-9 ? `＝${fmt(qv)}` : `≈${qv.toFixed(2)}`;
      return { q: `做一条手工彩带需要 ${fmt(per)} 米丝带。妈妈买了 ${fmt(tot)} 米丝带，最多可以做多少条这样的彩带？`, a: `${fmt(tot)}÷${fmt(per)}${disp}，剩下的不够再做一条，要用去尾法，最多做 ${n} 条` };
    }
    const tot = rd(10, 60, 1), n = R(3, 9);
    return { q: `把 ${fmt(tot)} 升饮料平均倒进 ${n} 个杯子里，每个杯子里有多少升？`, a: `${fmt(tot)}÷${n}＝${fmt(fix(tot / n))}（升）` };
  }

  if (cat === 'area') {
    const c = areaCore(diff);
    return { q: `${c.desc}。它的面积是多少${c.unit}？`, a: `面积＝${fmt(c.ans)} ${c.unit}` };
  }

  if (cat === 'percent') {
    const t = R(0, 2);
    if (t === 0) {
      const p = R(50, 600), off = pick([9, 8.5, 8, 7.5, 7]);
      const pay = fix(p * off / 10);
      return { q: `一件衣服原价 ${p} 元，商场搞活动打 ${fmt(off)} 折出售。现价多少元？`, a: `${p}×${fmt(off / 10)}＝${fmt(pay)}（元）` };
    }
    if (t === 1) {
      const n = R(200, 500), die = R(2, 20);
      return { q: `校园里新栽了 ${n} 棵小树，成活了 ${n - die} 棵。这批小树的成活率是多少？`, a: `${n - die}÷${n}×100%＝${fmt(fix((n - die) / n * 100))}%` };
    }
    const p = R(1000, 5000), r = pick([1.5, 2.1, 2.25, 3]);
    return { q: `爸爸把 ${p} 元存入银行一年，年利率是 ${r}%。到期后可以得到利息多少元？`, a: `${p}×${r}%＝${fmt(fix(p * r / 100))}（元）` };
  }

  if (cat === 'ratio') {
    const t = R(0, 1);
    if (t === 0) {
      const a = R(2, 6), b = R(2, 6), k = R(3, 9);
      const tot = (a + b) * k * 10;
      return { q: `配制一种糖水，糖和水的质量比是 ${a} : ${b}。要配制 ${tot} 克这样的糖水，需要糖和水各多少克？`, a: `每份 ${tot}÷${a + b}＝${tot / (a + b)} 克，糖 ${a}×${tot / (a + b)}＝${a * tot / (a + b)} 克，水 ${b}×${tot / (a + b)}＝${b * tot / (a + b)} 克` };
    }
    const sc = pick([1000, 2000, 5000, 10000]), cm = R(2, 9);
    return { q: `一幅地图的比例尺是 1 : ${sc}。图上距离 ${cm} 厘米，实际距离是多少米？`, a: `${cm}×${sc}＝${cm * sc} 厘米＝${cm * sc / 100} 米` };
  }

  if (cat === 'mean') {
    const c = core('mean', diff, 5);
    return { q: `${c.list.length} 位同学的数学练习成绩分别是 ${c.list.join('、')} 分。他们的平均成绩是多少分？`, a: `(${c.list.join('＋')})÷${c.list.length}＝${c.ans}（分）` };
  }

  if (cat === 'volume') {
    const l = R(4, 12), w = R(3, 8), h = R(2, 6);
    return { q: `一个长方体水箱，长 ${l} 分米、宽 ${w} 分米、高 ${h} 分米。这个水箱最多能装多少升水？`, a: `${l}×${w}×${h}＝${l * w * h}（立方分米）＝${l * w * h} 升` };
  }

  if (cat === 'factor') {
    const g1 = R(2, 8);
    const a = g1 * R(2, 6), b = g1 * R(2, 6);
    const gg = gcd(a, b);
    return { q: `老师有 ${a} 本练习本和 ${b} 支铅笔，要平均分给几个小组，使每组分到的练习本和铅笔都一样多。最多可以分给几个小组？`, a: `${a} 和 ${b} 的最大公因数是 ${gg}，最多分给 ${gg} 个小组` };
  }

  if (cat === 'money') {
    const p1 = rd(2, 30, 1), p2 = rd(1, 20, 1), pay = pick([50, 100]);
    return { q: `一支钢笔 ${fmt(p1)} 元，一个文具盒 ${fmt(p2)} 元。买这两样东西，付 ${pay} 元，应找回多少元？`, a: `${pay}－(${fmt(p1)}＋${fmt(p2)})＝${fmt(fix(pay - p1 - p2))}（元）` };
  }

  if (cat === 'time') {
    const h1 = R(7, 10), m1 = pick([0, 10, 20, 30, 40]), dur = R(35, 95);
    const end = h1 * 60 + m1 + dur;
    return { q: `一节课外活动从 ${h1} 时 ${m1 === 0 ? '整' : m1 + '分'} 开始，经过 ${dur} 分钟结束。结束时是几时几分？`, a: `${Math.floor(end / 60)} 时 ${end % 60 === 0 ? '整' : (end % 60) + '分'}` };
  }

  if (cat === 'fraction') {
    const d = pick([4, 5, 6, 8]);
    const n1 = R(1, d - 1), n2 = R(1, d - 1);
    return { q: `一块蛋糕，哥哥吃了 ${n1}/${d}，妹妹吃了 ${n2}/${d}。两人一共吃了这块蛋糕的几分之几？`, a: `${n1}/${d}＋${n2}/${d}＝${fracStr(n1 + n2, d)}` };
  }

  if (cat === 'fracMD') {
    const t = R(0, 2);
    if (t === 0) {
      const d = pick([4, 5, 6, 8]), n = R(1, d - 1), k = R(2, 9), L = d * k;
      return { q: `一根彩带长 ${L} 米，用去它的 ${n}/${d}，用去了多少米？`, a: `${L}×${n}/${d}＝${fracStr(L * n, d)}（米）` };
    }
    if (t === 1) {
      const d = pick([3, 4, 5, 6, 8]), n = R(1, d - 1), k = R(2, 9), v = n * k;
      return { q: `一桶油用去了 ${n}/${d}，正好用去 ${v} 千克。这桶油原来有多少千克？`, a: `设原来有 x 千克。x×${n}/${d}＝${v}，x＝${v}÷${n}/${d}＝${d * k}（千克）` };
    }
    const p = R(2, 9) * 2, d = pick([2, 3, 4]), n = R(1, d - 1);
    return { q: `一种水果每千克 ${p} 元，买 ${n}/${d} 千克需要多少元？`, a: `${p}×${n}/${d}＝${fracStr(p * n, d)}（元）` };
  }

  if (cat === 'decAddSub') {
    const p1 = rd(5, 60, 1), p2 = rd(3, 40, 1);
    return { q: `一本故事书 ${fmt(p1)} 元，一本绘本 ${fmt(p2)} 元。两本书一共多少元？故事书比绘本贵多少元？`, a: `一共 ${fmt(p1)}＋${fmt(p2)}＝${fmt(fix(p1 + p2))} 元；贵 ${fmt(fix(Math.abs(p1 - p2)))} 元` };
  }

  if (cat === 'intMix') {
    const n1 = R(2, 9), p1 = R(2, 9), n2 = R(2, 9), p2 = R(2, 9);
    return { q: `文具店里一支钢笔 ${p1} 元，一个笔记本 ${p2} 元。妈妈买了 ${n1} 支钢笔和 ${n2} 个笔记本，一共要付多少元？`, a: `${n1}×${p1}＋${n2}×${p2}＝${n1 * p1 + n2 * p2}（元）` };
  }

  const c = core(['intAddSub', 'intMul', 'intDiv', 'intMix'].includes(cat) ? cat : 'intAddSub', diff, ctx.grade);
  if (!c) return null;
  if (c.op === '×') return { q: `每盒装 ${c.a} 个乒乓球，${c.b} 盒一共有多少个乒乓球？`, a: `${c.a}×${c.b}＝${fmt(c.ans)}（个）` };
  if (c.op === '÷') {
    return c.rem
      ? { q: `把 ${c.a} 本书平均放在 ${c.b} 个书架上，每个书架放多少本？还剩多少本？`, a: `${c.a}÷${c.b}＝${c.ans}（本）` }
      : { q: `把 ${c.a} 个苹果平均分给 ${c.b} 个小朋友，每个小朋友分多少个？`, a: `${c.a}÷${c.b}＝${fmt(c.ans)}（个）` };
  }
  if (c.op === '−') return { q: `学校图书馆有图书 ${c.a} 本，借出了 ${c.b} 本。还剩多少本？`, a: `${c.a}－${c.b}＝${fmt(c.ans)}（本）` };
  return { q: `学校图书馆有图书 ${c.a} 本，又新购进 ${c.b} 本。现在共有多少本？`, a: `${c.a}＋${c.b}＝${fmt(c.ans)}（本）` };
}

/* 方程应用题单独模板（保证算得对） */
function eqApp() {
  const n = R(2, 8), p = rd(2, 20, 1), tot = fix(n * p), t = R(0, 1);
  if (t === 0) return { q: `学校买来 ${n} 个同样的足球，一共花了 ${fmt(tot)} 元。每个足球多少元？（先设未知数，列方程解答）`, a: `设每个足球 x 元。${n}x＝${fmt(tot)}，x＝${fmt(p)}，每个足球 ${fmt(p)} 元` };
  const age = R(6, 12), mult = R(2, 4);
  return { q: `今年妈妈的年龄是小明的 ${mult} 倍，妈妈今年 ${age * mult} 岁。小明今年多少岁？（列方程解答）`, a: `设小明今年 x 岁。${mult}x＝${age * mult}，x＝${age}，小明今年 ${age} 岁` };
}

/* ---------------- 概念型知识点模板 ---------------- */
function judgeQ(text, ok, explain) {
  return { q: `${text}（　）`, a: `${ok ? '√' : '×'}${explain ? '，' + explain : ''}`, ws: null };
}

function conceptQ(cat, type, diff) {
  const t = type;

  if (cat === 'cyclic') {
    const pairs = [[1, 3], [2, 3], [5, 6], [1, 6], [7, 9], [2, 9], [4, 9], [1, 11], [3, 11], [5, 11], [8, 11], [10, 3], [13, 6], [1, 7], [22, 7], [5, 12]];
    const [n, d] = pick(pairs);
    const rp = repetend(n, d);
    if (t === 'fill') {
      const v = R(0, 2);
      if (v === 0) return { q: `${n} ÷ ${d} 的商是循环小数，它的循环节是（　），用简便方法写作（　）。`, a: `循环节是 ${rp.cyc}；写作 ${Math.floor(n / d)}.${rp.non}${rp.cyc}，并在循环节首位和末位数字上面各记一个小圆点`, ws: 's' };
      if (v === 1) {
        const m = pick(pairs.filter(p => p !== [n, d]));
        const r2 = repetend(m[0], m[1]);
        const big = rp.val > r2.val;
        return { q: `在 ○ 里填上“＞”“＜”或“＝”：${rp.exp || rp.str} ○ ${r2.exp || r2.str}（提示：先展开比较）`, a: `${big ? '＞' : '＜'}（${rp.str}≈${fmt(Math.round(rp.val * 10000) / 10000)}，${r2.str}≈${fmt(Math.round(r2.val * 10000) / 10000)}）`, ws: 's' };
      }
      return { q: `把 ${rp.str} 展开，前 8 位小数依次是（　）。`, a: `${(rp.non + rp.cyc.repeat(8)).slice(0, 8).split('').join('、')}（整数部分 ${Math.floor(n / d)}）`, ws: 's' };
    }
    if (t === 'judge') {
      const v = R(0, 2);
      if (v === 0) return judgeQ(`循环小数 ${rp.str} 的循环节是 ${rp.cyc}`, true);
      if (v === 1) return judgeQ(`循环小数一定是无限小数`, true, '无限小数不一定是循环小数，但循环小数一定是无限小数');
      return judgeQ(`${n} ÷ ${d} 的商是有限小数`, false, `商是循环小数 ${rp.str}`);
    }
    if (t === 'choice') {
      const wrong1 = rp.cyc.split('').reverse().join('');
      const raw = [...new Set([rp.cyc, wrong1, rp.cyc + rp.cyc[0], (rp.non || '') + rp.cyc])].filter(x => x).slice(0, 4);
      const opts = [...raw];
      let k = 11;
      while (opts.length < 4) { const v = '' + (k++); if (!opts.includes(v)) opts.push(v); }
      return { q: `${n} ÷ ${d} 的商的循环节是（　）<br>${optLines(opts)}`, a: `${'ABCD'[opts.indexOf(rp.cyc)]}（${rp.cyc}）`, ws: 's' };
    }
    if (t === 'oral' || t === 'vertical') {
      const [n2, d2] = pick(pairs);
      const r2 = repetend(n2, d2);
      return { q: `计算 ${n2} ÷ ${d2}（商用循环小数的简便形式表示）`, a: `${r2.str}`, ws: 'm' };
    }
    return null;
  }

  if (cat === 'approx') {
    if (t === 'app') return null;
    if (t === 'fill') {
      const v = R(0, 2);
      if (v === 0) {
        const n = rd(1, 99, 4), k = pick([1, 2, 3]);
        return { q: `把 ${fmt(n)} 保留${['', '一', '两', '三'][k]}位小数是（　）。`, a: `${n.toFixed(k)}（四舍五入）`, ws: 's' };
      }
      if (v === 1) {
        const a = R(11, 99), b = pick([3, 6, 7, 9, 11, 12]);
        const q = a / b;
        if (Math.abs(q - Math.round(q)) < 1e-9) return conceptQ(cat, t, diff);
        return { q: `${a} ÷ ${b} 的商保留两位小数是（　），保留一位小数是（　）。`, a: `保留两位：${q.toFixed(2)}；保留一位：${q.toFixed(1)}`, ws: 's' };
      }
      const n = rd(1, 99, 3);
      return { q: `一个三位小数 ${n.toFixed(3)} 精确到百分位约是（　）。`, a: `${n.toFixed(2)}`, ws: 's' };
    }
    if (t === 'judge') {
      const v = R(0, 2);
      if (v === 0) return judgeQ(`求商的近似数时，要保留三位小数，就要除到商的第四位小数`, true);
      if (v === 1) return judgeQ(`把 5.995 保留两位小数是 6.00，写成 6 也可以`, false, '近似数末尾的 0 不能去掉，它表示精确程度');
      return judgeQ(`装油时把油桶装满，求需要几个油桶要用去尾法`, false, '要保证全部装完，应该用进一法');
    }
    if (t === 'choice') {
      const n = rd(1, 50, 3);
      const right = n.toFixed(2);
      const opts = [...new Set([right, n.toFixed(1), fmt(Math.floor(n * 100) / 100), fmt(Math.ceil(n * 100) / 100)])];
      let k = 1;
      while (opts.length < 4) { const v = fmt(n + k); k++; if (!opts.includes(v)) opts.push(v); }
      return { q: `${fmt(n)} 保留两位小数是（　）<br>${optLines(opts)}`, a: `${'ABCD'[opts.indexOf(right)]}（${right}）`, ws: 's' };
    }
    if (t === 'oral' || t === 'vertical') {
      const a = R(11, 99), b = pick([3, 6, 7, 9, 12]);
      return { q: `${a} ÷ ${b}（商保留两位小数）`, a: `${(a / b).toFixed(2)}`, ws: 'm' };
    }
    return null;
  }

  if (cat === 'position') {
    const col = R(2, 9), row = R(2, 8);
    const names = ['小明', '小红', '小亮', '小华', '小丽'];
    if (t === 'fill') {
      const v = R(0, 1);
      if (v === 0) return { q: `${pick(names)}在教室里坐在第 ${col} 列第 ${row} 行，用数对表示是（　，　）。`, a: `（${col}，${row}）`, ws: 's' };
      return { q: `象棋盘上，“马”现在的位置用数对表示是（${col}，${row}），它表示马在第（　）列第（　）行。`, a: `${col} 列，${row} 行`, ws: 's' };
    }
    if (t === 'judge') return judgeQ(`数对（${row}，${col}）和数对（${col}，${row}）表示同一个位置`, col === row, '数对先写列、再写行，顺序不能颠倒');
    if (t === 'choice') {
      const right = `（${col}，${row}）`;
      const opts = [...new Set([right, `（${row}，${col}）`, `（${col + 1}，${row}）`, `（${col}，${row + 1}）`])];
      let k = 1;
      while (opts.length < 4) { const s = `（${col + k}，${row + k}）`; k++; if (!opts.includes(s)) opts.push(s); }
      const mixed = shuffle(opts);
      return { q: `小刚坐在第 ${col} 列第 ${row} 行，他的位置用数对表示是（　）<br>${optLines(mixed)}`, a: `${'ABCD'[mixed.indexOf(right)]}（${right}）`, ws: 's' };
    }
    return null;
  }

  if (cat === 'possibility') {
    const r = R(3, 9), w = R(1, 8);
    if (t === 'fill') return { q: `盒子里有 ${r} 个红球和 ${w} 个白球（大小相同），任意摸一个，摸到（　）球的可能性大。`, a: `${r > w ? '红' : w > r ? '白' : '红、白'}`, ws: 's' };
    if (t === 'judge') {
      const v = R(0, 1);
      if (v === 0) return judgeQ(`盒子里只有红球，任意摸一个，一定能摸到红球`, true);
      return judgeQ(`明天一定会下雨`, false, '只能说“可能下雨”');
    }
    if (t === 'choice') {
      return { q: `盒子里有 ${r} 个红球、${w} 个黄球，要使摸到黄球的可能性大一些，应该（　）<br>${optLines(['多放几个黄球', '多放几个红球', '拿走几个红球，红球和黄球一样多', '把红球全部换成蓝球'])}`, a: `A`, ws: 's' };
    }
    return null;
  }

  if (cat === 'plant') {
    const sp = pick([3, 4, 5, 6, 8, 10]);
    const mode = R(0, 2);
    const n0 = R(6, 20), len = sp * n0;
    const ans = mode === 0 ? n0 + 1 : mode === 1 ? n0 : n0 - 1;
    const modeName = ['两端都栽', '只栽一端（或环形）', '两端不栽'][mode];
    if (t === 'app' || t === 'fill') return { q: `在一条长 ${len} 米的小路一旁植树，每隔 ${sp} 米栽一棵（${modeName}）。一共需要栽多少棵树？`, a: `间隔数：${len}÷${sp}＝${n0}；${modeName}，需要栽 ${ans} 棵`, ws: 'm' };
    if (t === 'judge') return judgeQ(`在长 60 米的路一旁每隔 6 米栽一棵树（两端都栽），一共栽 10 棵`, false, '间隔数 10 个，两端都栽要栽 11 棵');
    if (t === 'choice') {
      const opts = [];
      [ans, ans + 1, ans - 1, n0].forEach(v => {
        const s = v + ' 棵';
        if (v > 0 && opts.indexOf(s) < 0) opts.push(s);
      });
      let k = 2;
      while (opts.length < 4) {
        const s = (ans + k) + ' 棵';
        k++;
        if (opts.indexOf(s) < 0) opts.push(s);
      }
      const mixed = shuffle(opts);
      return { q: `在一条长 ${len} 米的小路一旁植树，每隔 ${sp} 米栽一棵（${modeName}），一共需要栽（　）<br>${optLines(mixed)}`, a: `${'ABCD'[mixed.indexOf(ans + ' 棵')]}（${ans} 棵）`, ws: 's' };
    }
    return null;
  }

  if (cat === 'observe') {
    const l1 = R(3, 6), l2 = R(1, 3);
    if (t === 'fill') return { q: `一个立体图形由小正方体搭成：第一层有 ${l1} 个，第二层有 ${l2} 个。搭这个立体图形一共用了（　）个小正方体。`, a: `${l1 + l2}`, ws: 's' };
    if (t === 'judge') {
      const v = R(0, 1);
      if (v === 0) return judgeQ(`从不同方向观察同一个立体图形，看到的形状可能不相同`, true);
      return judgeQ(`从前面和从上面看到的形状一定相同`, false);
    }
    if (t === 'choice') return { q: `观察一个正方体，从它的前面、上面、左面看到的形状分别是（　）<br>${optLines(['都是正方形', '正方形、长方形、正方形', '都是长方形', '正方形、圆形、正方形'])}`, a: `A`, ws: 's' };
    return null;
  }

  if (cat === 'motion') {
    if (t === 'fill') {
      const items = [['电梯的升降', '平移'], ['风车的转动', '旋转'], ['推拉抽屉', '平移'], ['钟表指针的走动', '旋转'], ['火车在直轨道上行驶', '平移'], ['拧瓶盖', '旋转']];
      const [it, an] = pick(items);
      return { q: `${it}是（　）现象。（填“平移”或“旋转”）`, a: an, ws: 's' };
    }
    if (t === 'judge') {
      const v = R(0, 1);
      if (v === 0) return judgeQ(`长方形有 2 条对称轴`, true);
      return judgeQ(`平行四边形是轴对称图形`, false, '一般平行四边形不是轴对称图形');
    }
    if (t === 'choice') return { q: `下面图形中，对称轴条数最多的是（　）<br>${optLines(['长方形（2 条）', '等边三角形（3 条）', '正方形（4 条）', '等腰梯形（1 条）'])}`, a: `C（正方形，4 条）`, ws: 's' };
    return null;
  }

  if (cat === 'factor') {
    const n = pick([12, 16, 18, 20, 24, 30, 36]);
    if (t === 'fill') {
      const facs = [];
      for (let i = 1; i <= n; i++) if (n % i === 0) facs.push(i);
      const v = R(0, 1);
      if (v === 0) return { q: `${n} 的因数有（　），共 ${facs.length} 个。`, a: facs.join('、'), ws: 's' };
      const a = pick([6, 8, 9, 12, 15]), b = pick([8, 10, 12, 18, 20]);
      return { q: `${a} 和 ${b} 的最大公因数是（　），最小公倍数是（　）。`, a: `${gcd(a, b)}；${a * b / gcd(a, b)}`, ws: 's' };
    }
    if (t === 'judge') {
      const v = R(0, 1);
      if (v === 0) return judgeQ(`一个数的倍数一定比它的因数大`, false, '一个数最大的因数和最小的倍数都是它本身');
      return judgeQ(`5 的倍数都是合数`, false, '5 本身就是 5 的倍数，5 是质数');
    }
    if (t === 'choice') {
      const primes = [2, 3, 5, 7, 11, 13, 17, 19];
      const p = pick(primes);
      const opts = shuffle([p, p + 1, p + 3, pick([9, 15, 21])].map(String));
      return { q: `下面各数中，是质数的是（　）<br>${optLines(opts)}`, a: `${'ABCD'[opts.indexOf(String(p))]}（${p}）`, ws: 's' };
    }
    return null;
  }

  if (cat === 'measure') {
    const items = [['千米', '米', 1000], ['米', '厘米', 100], ['吨', '千克', 1000], ['千克', '克', 1000], ['公顷', '平方米', 10000], ['平方米', '平方分米', 100], ['时', '分', 60], ['元', '角', 10]];
    const [u1, u2, f] = pick(items);
    const v = rd(0.5, 30, 1);
    if (t === 'fill' || t === 'oral') return { q: `${fmt(v)} ${u1} ＝（　）${u2}`, a: `${fmt(fix(v * f))} ${u2}`, ws: 's' };
    if (t === 'judge') {
      const w = fix(v * f * (Math.random() < 0.5 ? 10 : 1));
      return judgeQ(`${fmt(v)} ${u1} ＝ ${fmt(w)} ${u2}`, w === fix(v * f));
    }
    if (t === 'choice') {
      const right = fmt(fix(v * f));
      const opts = [...new Set([right, fmt(fix(v * f * 10)), fmt(fix(v * f / 10)), fmt(fix(v * 10))])];
      let k = 1;
      while (opts.length < 4) { const x = fmt(fix(v * f) + 100 * k); k++; if (!opts.includes(x)) opts.push(x); }
      return { q: `${fmt(v)} ${u1} ＝（　）${u2}<br>${optLines(opts)}`, a: `${'ABCD'[opts.indexOf(right)]}（${right}）`, ws: 's' };
    }
    return null;
  }

  if (cat === 'bigNum') {
    const n = R(10000, 99999999);
    if (t === 'fill') {
      const v = R(0, 1);
      if (v === 0) return { q: `${n} 读作：（　）。`, a: `${readCN(n)}`, ws: 's' };
      const w = Math.round(n / 10000);
      return { q: `把 ${n} 改写成用“万”作单位的数是（　）万，省略万位后面的尾数约是（　）万。`, a: `${fmt(fix(n / 10000))} 万；约 ${w} 万`, ws: 's' };
    }
    if (t === 'judge') {
      const m = n + R(1, 999);
      return judgeQ(`${n} 比 ${m} 小`, true);
    }
    if (t === 'choice') {
      const arr = [n, n + R(100, 9999), n - R(100, 9999), n + R(1, 99)];
      const mx = Math.max(...arr);
      const opts = shuffle(arr.map(String));
      return { q: `下面各数中最大的是（　）<br>${optLines(opts)}`, a: `${'ABCD'[opts.indexOf(String(mx))]}（${mx}）`, ws: 's' };
    }
    return null;
  }

  if (cat === 'angle') {
    if (t === 'fill') {
      const a = R(20, 80), b = R(20, 80);
      return { q: `一个三角形的两个内角分别是 ${a}° 和 ${b}°，第三个内角是（　）°。`, a: `${180 - a - b}°`, ws: 's' };
    }
    if (t === 'judge') {
      const v = R(0, 1);
      if (v === 0) return judgeQ(`大于 90° 的角都是钝角`, false, '大于 90° 小于 180° 的才是钝角');
      return judgeQ(`三角形的内角和是 180°`, true);
    }
    if (t === 'choice') {
      const opts = ['锐角', '直角', '钝角', '平角'];
      const deg = pick([30, 90, 120, 180]);
      const idx = deg === 90 ? 1 : deg === 180 ? 3 : deg > 90 ? 2 : 0;
      return { q: `${deg}° 的角是（　）<br>${optLines(opts)}`, a: `${'ABCD'[idx]}（${opts[idx]}）`, ws: 's' };
    }
    return null;
  }

  if (cat === 'negative') {
    const a = -R(1, 20), b = -R(1, 20);
    if (t === 'fill') return { q: `在 ○ 里填上“＞”或“＜”：${a} ○ ${b}；零下 5 ℃ 记作（　）℃。`, a: `${a > b ? '＞' : '＜'}；－5`, ws: 's' };
    if (t === 'judge') return judgeQ(`0 是正数`, false, '0 既不是正数，也不是负数');
    if (t === 'choice') {
      const set = new Set([a, b]);
      let guard = 0;
      while (set.size < 4 && guard < 50) { const v = R(-40, 10); if (!set.has(v)) set.add(v); guard++; }
      const arr = [...set];
      const mn = Math.min(...arr);
      const opts = shuffle(arr.map(x => x + ' ℃'));
      return { q: `下面温度最低的是（　）<br>${optLines(opts)}`, a: `${'ABCD'[opts.indexOf(mn + ' ℃')]}（${mn} ℃）`, ws: 's' };
    }
    return null;
  }

  if (cat === 'shape') {
    if (t === 'judge') {
      const v = R(0, 1);
      if (v === 0) return judgeQ(`正方体有 6 个面，每个面都是正方形`, true);
      return judgeQ(`圆柱的侧面展开后一定是正方形`, false, '可能是长方形');
    }
    if (t === 'fill') return { q: `长方体有（　）个面，（　）条棱，（　）个顶点。`, a: `6；12；8`, ws: 's' };
    if (t === 'choice') {
      const opts = shuffle(['6 条', '8 条', '12 条', '24 条']);
      return { q: `长方体有（　）条棱。<br>${optLines(opts)}`, a: `${'ABCD'[opts.indexOf('12 条')]}（12 条）`, ws: 's' };
    }
    return null;
  }

  if (cat === 'time') {
    if (t === 'fill') {
      const v = R(0, 1);
      if (v === 0) { const h = R(1, 5), m = pick([10, 20, 30, 40, 50]); return { q: `${h} 时 ${m} 分 ＝（　）分`, a: `${h * 60 + m}`, ws: 's' }; }
      const m1 = pick([0, 15, 30, 45]), dur = pick([40, 55, 70, 85]);
      const end = 9 * 60 + m1 + dur;
      return { q: `一场电影 9 时 ${m1 === 0 ? '整' : m1 + '分'} 开始，放映 ${dur} 分钟，结束时是（　）时（　）分。`, a: `${Math.floor(end / 60)}；${end % 60}`, ws: 's' };
    }
    if (t === 'judge') {
      const v = R(0, 1);
      return v === 0 ? judgeQ(`1 时 ＝ 60 分`, true) : judgeQ(`钟面上时针走一圈是 60 分钟`, false, '时针走一圈是 12 小时，分针走一圈才是 60 分钟');
    }
    if (t === 'choice') {
      const opts = shuffle(['30 分', '45 分', '60 分', '90 分']);
      return { q: `分针走一圈，时间过去了（　）<br>${optLines(opts)}`, a: `${'ABCD'[opts.indexOf('60 分')]}（60 分）`, ws: 's' };
    }
    return null;
  }

  if (cat === 'money') {
    if (t === 'fill') {
      const v = R(0, 1);
      if (v === 0) { const y = rd(1, 50, 1); return { q: `${fmt(y)} 元 ＝（　）角`, a: `${fmt(fix(y * 10))}`, ws: 's' }; }
      const j = R(1, 9);
      return { q: `${j} 角 5 分 ＝（　）角`, a: `${fmt(j + 0.5)}`, ws: 's' };
    }
    if (t === 'judge') {
      const v = R(0, 1);
      return v === 0 ? judgeQ(`1 元 ＝ 10 角，1 角 ＝ 10 分`, true) : judgeQ(`5 元 6 角就是 56 元`, false, '是 5.6 元');
    }
    if (t === 'choice') {
      const right = pick([2.5, 3.05, 10.8]);
      const rj = fmt(fix(right * 10));
      const opts = [...new Set([rj, fmt(right), fmt(fix(right * 100)), fmt(fix(right / 10))])];
      let k = 1;
      while (opts.length < 4) { const x = fmt(fix(right * 10) + k); k++; if (!opts.includes(x)) opts.push(x); }
      return { q: `${fmt(right)} 元 ＝（　）角<br>${optLines(opts.map(x => x + ' 角'))}`, a: `${'ABCD'[opts.indexOf(rj)]}（${rj} 角）`, ws: 's' };
    }
    return null;
  }

  if (cat === 'perim') {
    const l = R(3, 20), w = R(2, 15);
    if (t === 'judge') {
      const v = R(0, 1);
      return v === 0 ? judgeQ(`长方形的周长 ＝（长 ＋ 宽）× 2`, true) : judgeQ(`正方形的周长 ＝ 边长 ＋ 4`, false, '应是边长 × 4');
    }
    if (t === 'choice') {
      const opts = shuffle(['(长＋宽)×2', '长×宽', '长＋宽', '长×2＋宽']);
      return { q: `长方形的周长公式是（　）<br>${optLines(opts)}`, a: `${'ABCD'[opts.indexOf('(长＋宽)×2')]}`, ws: 's' };
    }
    if (t === 'app' || t === 'fill') return { q: `一个长方形的长是 ${l} 米，宽是 ${w} 米。它的周长是多少米？`, a: `(${l}＋${w})×2＝${(l + w) * 2}（米）`, ws: 'm' };
    if (t === 'oral') return { q: `正方形的边长是 ${l} 厘米，它的周长是（　）厘米。`, a: `${l * 4}`, ws: 's' };
    return null;
  }

  if (cat === 'volume') {
    const l = R(2, 15), w = R(2, 12), h = R(2, 10);
    if (t === 'fill') return { q: `一个长方体的长是 ${l} 厘米、宽是 ${w} 厘米、高是 ${h} 厘米，它的体积是（　）立方厘米。`, a: `${l * w * h}`, ws: 's' };
    if (t === 'judge') return judgeQ(`体积是 1 立方分米的物体，它的占地面积一定是 1 平方分米`, false);
    if (t === 'choice') {
      const s = R(2, 9);
      const opts = shuffle([s ** 3, s * s, s * 6, s ** 3 * 2].map(String));
      return { q: `一个正方体的棱长是 ${s} 厘米，它的体积是（　）立方厘米<br>${optLines(opts)}`, a: `${'ABCD'[opts.indexOf(String(s ** 3))]}（${s ** 3}）`, ws: 's' };
    }
    return null;
  }

  if (cat === 'ratio') {
    if (t === 'fill') {
      const g0 = pick([2, 3, 4, 5]);
      const A = R(2, 9), B = R(2, 9);
      const a = g0 * A, b = g0 * B;
      const gg = gcd(A, B);
      const v = R(0, 1);
      if (v === 0) return { q: `把比 ${a} : ${b} 化成最简单的整数比是（　）。`, a: `${A / gg} : ${B / gg}`, ws: 's' };
      return { q: `${a} : ${b} 的比值是（　）。`, a: fracStr(a, b), ws: 's' };
    }
    if (t === 'judge') return judgeQ(`比的前项和后项同时乘相同的数，比值不变`, false, '要同时乘或除以相同的数（0 除外）');
    if (t === 'choice') {
      const a = R(2, 9), b = R(2, 9);
      const g0 = gcd(a, b);
      const right = `${a / g0} : ${b / g0}`;
      const opts = [...new Set([right, `${a} : ${b}`, `${b / g0} : ${a / g0}`, `${a + 1} : ${b}`])];
      let k = 2;
      while (opts.length < 4) { const x = `${a + k} : ${b + 1}`; k++; if (!opts.includes(x)) opts.push(x); }
      return { q: `把比 ${a} : ${b} 化成最简单的整数比是（　）<br>${optLines(opts)}`, a: `${'ABCD'[opts.indexOf(right)]}（${right}）`, ws: 's' };
    }
    return null;
  }

  if (cat === 'percent') {
    if (t === 'fill') {
      const v = R(0, 1);
      const p = pick([5, 12, 20, 25, 37, 45, 60, 75, 88]);
      if (v === 0) return { q: `把 ${p}% 改写成小数是（　），改写成分数是（　）。`, a: `${fmt(p / 100)}；${fracStr(p, 100)}`, ws: 's' };
      const base = R(2, 9) * 10;
      return { q: `${base} 千克的 ${p}% 是（　）千克。`, a: `${fmt(fix(base * p / 100))}`, ws: 's' };
    }
    return null;
  }

  return null;
}

/* ================= 单题生成调度 ================= */
function places(x) {
  const s = fmt(x);
  const i = s.indexOf('.');
  return i < 0 ? 0 : s.length - i - 1;
}

function fillFromCore(c, cat, diff) {
  if ((cat === 'fraction' || cat === 'fracMD') && c.ans) {
    return { q: `计算：${c.expr} ＝（　）`, a: `${c.ans}`, ws: 's' };
  }
  const v = R(0, cat === 'decMul' || cat === 'decDiv' ? 3 : 2);
  if (v === 0 && c.op) {
    if (c.op === '×') return { q: `（　）× ${fmt(c.b)} ＝ ${fmt(c.ans)}`, a: fmt(c.a), ws: 's' };
    if (c.op === '+') return { q: `${fmt(c.a)} ＋（　）＝ ${fmt(c.ans)}`, a: fmt(c.b), ws: 's' };
    if (c.op === '−') return { q: `${fmt(c.a)} −（　）＝ ${fmt(c.ans)}`, a: fmt(c.b), ws: 's' };
    if (c.op === '÷' && !c.rem) return { q: `${fmt(c.a)} ÷（　）＝ ${fmt(c.ans)}`, a: fmt(c.b), ws: 's' };
  }
  if (v === 1 && cat === 'decMul') {
    const p = places(c.a) + places(c.b);
    return { q: `${c.expr} 的两个因数一共有（　）位小数，积是（　）。`, a: `${p} 位；${fmt(c.ans)}`, ws: 's' };
  }
  if (v === 1 && cat === 'decDiv') {
    const kind = c.ans >= 10 ? '十位' : c.ans >= 1 ? '个位' : c.ans >= 0.1 ? '十分位' : '百分位';
    return { q: `${c.expr} 的商的最高位是（　）位，商是（　）。`, a: `${kind}；${fmt(c.ans)}`, ws: 's' };
  }
  if (v === 2 && cat === 'decDiv') {
    const mode = R(0, 2);
    if (mode === 0) return { q: `不计算，根据 ${c.a} ÷ ${fmt(c.b)} ＝ ${fmt(c.ans)}，直接写出得数：${fmt(fix(c.a * 10))} ÷ ${fmt(c.b)} ＝（　）。`, a: fmt(fix(c.ans * 10)), ws: 's' };
    if (mode === 1) return { q: `不计算，根据 ${c.a} ÷ ${fmt(c.b)} ＝ ${fmt(c.ans)}，直接写出得数：${c.a} ÷ ${fmt(fix(c.b * 10))} ＝（　）。`, a: fmt(fix(c.ans / 10)), ws: 's' };
    return { q: `两个数相除，除数不变，被除数乘 10，商（　）；被除数不变，除数除以 10，商（　）。`, a: `乘 10；乘 10`, ws: 's' };
  }
  if (v === 2 && cat === 'decMul') {
    const mode = R(0, 1);
    if (mode === 0) return { q: `${fmt(c.a)} ×（　）＝ ${fmt(fix(c.a * 100))}（把 ${fmt(c.a)} 扩大到它的 100 倍）`, a: `100`, ws: 's' };
    return { q: `根据 ${Math.round(c.a * 10)} × ${Math.round(c.b * 10)} ＝ ${Math.round(c.a * 10) * Math.round(c.b * 10)}，直接写出得数：${c.expr} ＝（　）。`, a: fmt(c.ans), ws: 's' };
  }

  const c2 = core(cat, diff, ctx.grade) || c;
  const val = x => (x.rem ? x.ansNum + x.rem / x.b : (typeof x.ans === 'number' ? x.ans : x.ansNum));
  const v1 = val(c), v2 = val(c2);
  if (typeof v1 === 'number' && typeof v2 === 'number' && c2.expr !== c.expr) {
    return { q: `在 ○ 里填上“＞”“＜”或“＝”：${c.expr} ○ ${c2.expr}`, a: `${v1 > v2 ? '＞' : v1 < v2 ? '＜' : '＝'}（${fmt(v1)} 与 ${fmt(v2)}）`, ws: 's' };
  }
  return { q: `计算：${c.expr} ＝（　）`, a: fmt(c.ans), ws: 's' };
}

function judgeFromCore(c, cat) {
  const conceptual = {
    decMul: [
      [`一个数（0 除外）乘大于 1 的数，积比原来的数大`, true],
      [`两个小数相乘，积一定是小数`, false, '如 2.5×0.4＝1，积是整数'],
      [`一个数（0 除外）乘小于 1 的数，积比原来的数小`, true],
    ],
    decDiv: [
      [`除数大于被除数时，商一定大于 1`, false, '如 2 ÷ 4 ＝ 0.5，商小于 1'],
      [`一个数（0 除外）除以小于 1 的数，商比原来的数大`, true],
      [`商的小数点要和被除数的小数点对齐`, true],
    ],
    decAddSub: [
      [`小数加减法要把小数点对齐，也就是相同数位对齐`, true],
      [`小数的末尾添上 0 或去掉 0，小数的大小不变`, true],
    ],
    fraction: [
      [`同分母分数相加，分母不变，分子相加`, true],
      [`分数的分子和分母同时乘相同的数，分数大小不变（0 除外）`, true],
    ],
  };
  if (conceptual[cat] && Math.random() < 0.5) {
    const [s, ok, ex] = pick(conceptual[cat]);
    return judgeQ(s, ok, ex);
  }
  if (c.rem) {
    const wrong = Math.random() < 0.5;
    const q = c.ansNum, r = c.rem;
    if (!wrong) return judgeQ(`${c.expr} ＝ ${q}……${r}`, true);
    const wr = r === 1 ? r + 1 : r - 1;
    return judgeQ(`${c.expr} ＝ ${q}……${wr}`, false, `正确的商是 ${q}，余数是 ${r}`);
  }
  if (typeof c.ans !== 'number') return null;
  const wrong = Math.random() < 0.55;
  const shown = wrong ? wrongOf(c.ans) : c.ans;
  return judgeQ(`${c.expr} ＝ ${fmt(shown)}`, !wrong, wrong ? `正确结果是 ${fmt(c.ans)}` : '');
}

function choiceFromCore(c, cat) {
  if (cat === 'decMul' && Math.random() < 0.5) {
    const p = places(c.a) + places(c.b);
    const opts = [...new Set([p, p + 1, Math.max(0, p - 1), p + 2])].map(x => x + ' 位');
    return { q: `${c.expr} 的两个因数一共有（　）位小数。<br>${optLines(opts)}`, a: `${'ABCD'[opts.indexOf(p + ' 位')]}（${p} 位）`, ws: 's' };
  }
  if (cat === 'decDiv' && Math.random() < 0.5) {
    const kind = c.ans >= 10 ? '十位' : c.ans >= 1 ? '个位' : c.ans >= 0.1 ? '十分位' : '百分位';
    const opts = shuffle(['个位', '十位', '十分位', '百分位']);
    return { q: `${c.expr} 的商的最高位是（　）。<br>${optLines(opts)}`, a: `${'ABCD'[opts.indexOf(kind)]}（${kind}）`, ws: 's' };
  }
  if ((cat === 'fraction' || cat === 'fracMD') && c.frac) {
    const opts = fracOpts(c.frac[0], c.frac[1], c.ans);
    return { q: `${c.expr} ＝（　）<br>${optLines(opts)}`, a: `${'ABCD'[opts.indexOf(c.ans)]}（${c.ans}）`, ws: 's' };
  }
  if (c.rem) {
    const q = c.ansNum, r = c.rem;
    const opts = shuffle([`${q}……${r}`, `${q + 1}……${r}`, `${q}……${r + 1}`, `${q - 1 > 0 ? q - 1 : q + 2}……${r}`]);
    return { q: `${c.expr} ＝（　）<br>${optLines(opts)}`, a: `${'ABCD'[opts.indexOf(`${q}……${r}`)]}（${q}……${r}）`, ws: 's' };
  }
  const ansNum = typeof c.ans === 'number' ? c.ans : c.ansNum;
  if (typeof ansNum !== 'number') return null;
  const opts = choiceOpts(ansNum);
  return { q: `${c.expr} ＝（　）<br>${optLines(opts)}`, a: `${'ABCD'[opts.indexOf(fmt(ansNum))]}（${fmt(ansNum)}）`, ws: 's' };
}

function errorQ(cat, diff) {
  if (cat === 'decDiv') {
    const c = core('decDiv', diff, 5);
    const wrong = wrongOf(c.ans);
    const reason = c.ans < 1 ? '被除数比除数小，商的整数部分要用“0”占位，他把商的小数点点错了位置' : (wrong > c.ans ? '商的小数点向右多移了一位，商被扩大了' : '商的小数点向左多移了一位，商被缩小了');
    return { q: `小明这样计算下面的题，对吗？错在哪里？请写出正确结果。<span class="wrongbox">竖式计算：${c.expr} ＝ ${fmt(wrong)}</span>`, a: `不对。${reason}。正确结果是 ${fmt(c.ans)}`, ws: 'm' };
  }
  if (cat === 'decMul') {
    const c = core('decMul', diff, 5);
    const wrong = wrongOf(c.ans);
    const p = places(c.a) + places(c.b);
    return { q: `小红这样计算下面的题，对吗？错在哪里？请写出正确结果。<span class="wrongbox">竖式计算：${c.expr} ＝ ${fmt(wrong)}</span>`, a: `不对。积的小数点点错了位置：两个因数一共有 ${p} 位小数，积也应该有 ${p} 位小数。正确结果是 ${fmt(c.ans)}`, ws: 'm' };
  }
  if (cat === 'simple') {
    const a = rd(1.5, 30, 1);
    return { q: `小刚用简便方法计算，对吗？错在哪里？请改正。<span class="wrongbox">${fmt(a)} × 99 ＝ ${fmt(a)} × 100 ＝ ${fmt(fix(a * 100))}</span>`, a: `不对。99 ＝ 100 − 1，乘 100 后还要减去 1 个 ${fmt(a)}：${fmt(a)}×99 ＝ ${fmt(fix(a * 100))} − ${fmt(a)} ＝ ${fmt(fix(a * 99))}`, ws: 'm' };
  }
  if (cat === 'equation') {
    const b = R(2, 15), s = b + R(3, 20);
    return { q: `小华解方程的过程对吗？错在哪里？请改正。<span class="wrongbox">x ＋ ${b} ＝ ${s}<br>解：x ＝ ${s} ＋ ${b} ＝ ${s + b}</span>`, a: `不对。根据等式的性质，等式两边应同时减去 ${b}：x ＝ ${s} − ${b} ＝ ${s - b}`, ws: 'm' };
  }
  if (cat === 'area') {
    const b = rd(4, 20, 1), h = rd(3, 15, 1);
    return { q: `小丽计算三角形面积的过程对吗？错在哪里？请改正。<span class="wrongbox">三角形面积：${fmt(b)} × ${fmt(h)} ＝ ${fmt(fix(b * h))}</span>`, a: `不对。三角形的面积要用底乘高再除以 2：${fmt(b)}×${fmt(h)}÷2 ＝ ${fmt(fix(b * h / 2))}`, ws: 'm' };
  }
  const c = core(['intAddSub', 'intMul', 'intDiv', 'decAddSub'].includes(cat) ? cat : 'decMul', diff, ctx.grade);
  if (!c) return null;
  const wrong = wrongOf(typeof c.ans === 'number' ? c.ans : c.ansNum);
  return { q: `下面的计算对吗？错在哪里？请写出正确结果。<span class="wrongbox">${c.expr} ＝ ${fmt(wrong)}</span>`, a: `不对，计算结果错误。正确结果是 ${fmt(c.ans)}`, ws: 'm' };
}

function buildCalc(cat, diff) {
  if (cat === 'simple') {
    const s = simpleCore(diff);
    return { q: `${s.expr}`, a: `${fmt(s.ans)}（思路：${s.hint}）`, ws: 'm' };
  }
  const fam = ['decMul', 'decDiv', 'decAddSub', 'approx'].includes(cat) ? 'dec' : 'int';
  const c = calcCore(fam, diff);
  return { q: `${c.expr}`, a: fmt(c.ans), ws: 'm' };
}

function buildQuestion(kid, type, diff) {
  const cat = (KNOW[kid] || {}).cat || kid;
  const g = ctx.grade;

  if (type === 'app') {
    if (cat === 'equation') return finalize({ ...eqApp(), ws: 'l' });
    if (cat === 'plant') { const r = conceptQ('plant', 'app', diff); if (r) return finalize(r); }
    if (cat === 'simple') {
      const s = simpleCore(diff);
      return finalize({ q: `计算下面各题，怎样简便就怎样算，并写出主要步骤：${s.expr}`, a: `${fmt(s.ans)}（${s.hint}）`, ws: 'm' });
    }
    if (['cyclic', 'position', 'possibility', 'observe', 'motion', 'bigNum', 'negative', 'shape'].includes(cat)) {
      const r = conceptQ(cat, 'fill', diff) || conceptQ(cat, 'judge', diff);
      if (r) return finalize({ ...r, ws: 'm' });
      return null;
    }
    const r = appQ(cat, diff);
    if (r) return finalize({ ...r, ws: 'l' });
    return null;
  }

  if (type === 'simple' || type === 'calc') return finalize(buildCalc(cat, diff));

  if (type === 'estimate') {
    if (cat === 'approx' || cat === 'cyclic') { const r = conceptQ(cat, 'oral', diff); if (r) return finalize(r); }
    const c = core(cat, diff, g);
    if (c && typeof (typeof c.ans === 'number' ? c.ans : c.ansNum) === 'number') {
      const av = typeof c.ans === 'number' ? c.ans : c.ansNum;
      let est;
      if (cat === 'decMul' || cat === 'intMul') est = Math.round(c.a) * Math.round(c.b);
      else if (cat === 'decDiv' || cat === 'intDiv') est = Math.round(av);
      else est = Math.abs(av) >= 100 ? Math.round(av / 10) * 10 : Math.round(av);
      return finalize({ q: `${c.expr} ≈（　）`, a: `≈ ${fmt(est)}（估算方法不唯一，合理即可）`, ws: 's' });
    }
    const r2 = conceptQ(cat, 'fill', diff);
    if (r2) return finalize(r2);
    if (cat === 'area') {
      const ac = areaCore(diff);
      return finalize({ q: `估算：${ac.desc}，它的面积大约是（　）${ac.unit}。`, a: `≈ ${fmt(Math.round(ac.ans))} ${ac.unit}（精确值 ${fmt(ac.ans)}）`, ws: 's' });
    }
    if (cat === 'simple' || cat === 'equation') return buildQuestion(kid, 'fill', diff);
    return null;
  }

  if (type === 'error') return finalize(errorQ(cat, diff));

  if (type === 'equation') {
    if (cat === 'equation') { const e = eqCore(diff); return finalize({ q: e.eq, a: e.ans, ws: 'm' }); }
    const c = core(cat, diff, g);
    if (c && c.op === '+' && typeof c.ans === 'number') return finalize({ q: `x ＋ ${fmt(c.b)} ＝ ${fmt(c.ans)}`, a: `x ＝ ${fmt(c.a)}`, ws: 'm' });
    if (c && c.op === '×') return finalize({ q: `x ÷ ${fmt(c.b)} ＝ ${fmt(c.a)}`, a: `x ＝ ${fmt(c.ans)}`, ws: 'm' });
    const e = eqCore(Math.min(1, diff));
    return finalize({ q: e.eq, a: e.ans, ws: 'm' });
  }

  /* 概念型知识点优先走模板 */
  const cr = conceptQ(cat, type, diff);
  if (cr) return finalize(cr);

  if (cat === 'simple') {
    const s = simpleCore(diff);
    if (type === 'judge') {
      const v = R(0, 1);
      return finalize(v === 0
        ? judgeQ(`25 × 4 ÷ 25 × 4 ＝ 1`, false, '从左往右算：25×4÷25×4＝16')
        : judgeQ(`计算 ${fmt(rd(2, 20, 1))} × 99 时，可以把它看成乘 100 再减去一个这个数`, true));
    }
    if (type === 'choice') {
      const opts = choiceOpts(s.ans);
      return finalize({ q: `${s.expr} ＝（　）<br>${optLines(opts)}`, a: `${'ABCD'[opts.indexOf(fmt(s.ans))]}（${fmt(s.ans)}）`, ws: 's' });
    }
    if (type === 'fill') return finalize({ q: `计算：${s.expr} ＝（　）`, a: `${fmt(s.ans)}（${s.hint}）`, ws: 's' });
    return finalize({ q: `${s.expr}`, a: `${fmt(s.ans)}（思路：${s.hint}）`, ws: type === 'vertical' ? 'l' : 'm' });
  }

  if ((type === 'oral' || type === 'vertical') && !core(cat, diff, g)) {
    const fb = conceptQ(cat, 'fill', diff) || conceptQ(cat, 'judge', diff);
    if (fb) return finalize(fb);
    const ic = core('intAddSub', diff, g);
    return finalize({ q: `${ic.expr} ＝`, a: fmt(ic.ans), ws: type === 'vertical' ? 'l' : null });
  }

  if (cat === 'area') {
    const c = areaCore(diff);
    if (type === 'fill') return finalize({ q: `${c.desc}，它的面积是（　）${c.unit}。`, a: `${fmt(c.ans)} ${c.unit}`, ws: 's' });
    if (type === 'judge') {
      const v = R(0, 1);
      return finalize(v === 0
        ? judgeQ(`三角形的面积等于与它同底等高的平行四边形面积的一半`, true)
        : judgeQ(`两个面积相等的三角形一定可以拼成一个平行四边形`, false, '形状不一定相同'));
    }
    if (type === 'choice') return finalize({ q: `计算三角形面积的公式是（　）<br>${optLines(['S ＝ ah', 'S ＝ ah ÷ 2', 'S ＝ (a＋b)h', 'S ＝ ab'])}`, a: `B（S ＝ ah ÷ 2）`, ws: 's' });
    return finalize({ q: `${c.desc}。求它的面积。`, a: `${fmt(c.ans)} ${c.unit}`, ws: 'm' });
  }

  if (cat === 'equation') {
    if (type === 'fill') {
      const b = R(2, 40), s = b + R(5, 50), v = R(0, 1);
      if (v === 0) return finalize({ q: `x ＋ ${b} ＝ ${s}，根据等式的性质，x ＋ ${b} − ${b} ＝ ${s} −（　）。`, a: `${b}`, ws: 's' });
      return finalize({ q: `如果 x ＝ y，那么 x ＋ ${b} ＝ y ＋（　），x − ${b} ＝ y −（　）。`, a: `${b}；${b}`, ws: 's' });
    }
    if (type === 'judge') {
      const v = R(0, 1);
      return finalize(v === 0
        ? judgeQ(`含有未知数的式子叫方程`, false, '含有未知数的等式才叫方程')
        : judgeQ(`方程都是等式，但等式不一定是方程`, true));
    }
    if (type === 'choice') {
      return finalize({ q: `下面各式中，是方程的是（　）<br>${optLines([`x ＋ ${R(2, 9)}`, `3 ＋ 4 ＝ 7`, `x − ${R(2, 9)} ＝ ${R(5, 20)}`, `6x`])}`, a: `C`, ws: 's' });
    }
    const e = eqCore(0);
    return finalize({ q: e.eq, a: e.ans, ws: 's' });
  }

  if (cat === 'mean') {
    const c = core('mean', diff, g);
    if (type === 'judge') return finalize(judgeQ(`一组数据的平均数一定在这组数据的最大值和最小值之间`, true));
    if (type === 'choice') {
      const opts = choiceOpts(c.ans);
      return finalize({ q: `${c.list.join('、')} 的平均数是（　）<br>${optLines(opts)}`, a: `${'ABCD'[opts.indexOf(fmt(c.ans))]}（${c.ans}）`, ws: 's' });
    }
    return finalize({ q: `求下面数据的平均数：${c.list.join('、')}`, a: `${c.ans}`, ws: 's' });
  }

  const c = core(cat, diff, g);
  if (!c) return null;
  if (type === 'oral') return finalize({ q: `${c.expr} ＝`, a: fmt(c.ans), ws: null });
  if (type === 'vertical') return finalize({ q: `${c.expr}`, a: fmt(c.ans), ws: 'l' });
  if (type === 'fill') return finalize(fillFromCore(c, cat, diff));
  if (type === 'judge') return finalize(judgeFromCore(c, cat));
  if (type === 'choice') return finalize(choiceFromCore(c, cat));
  return null;
}

/* ---------------- HTML 片段 -> 结构化题目 ---------------- */
function stripTags(s) {
  return String(s).replace(/<[^>]*>/g, '');
}

function finalize(r) {
  if (!r) return null;
  let q = String(r.q == null ? '' : r.q);
  let wrong = null;

  const wm = q.match(/<span class="wrongbox">([\s\S]*?)<\/span>/);
  if (wm) {
    wrong = wm[1].split(/<br\s*\/?>/i).map(s => stripTags(s).trim()).filter(Boolean);
    q = q.replace(wm[0], '');
  }

  let opts = null;
  const om = q.match(/<span class="optline">[\s\S]*?<\/span>/g);
  if (om) {
    opts = om.map(s => stripTags(s.replace(/^<span class="optline">/, '').replace(/<\/span>$/, '')).trim());
    q = q.replace(/<span class="optline">[\s\S]*?<\/span>/g, '');
  }

  q = q.replace(/<br\s*\/?>/gi, '\n');
  q = stripTags(q).replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();

  let a = String(r.a == null ? '' : r.a).replace(/<br\s*\/?>/gi, '\n');
  a = stripTags(a).trim();

  return { q: q, a: a, ws: r.ws || null, opts: opts, wrong: wrong };
}

module.exports = {
  TYPES,
  KNOW,
  CUR,
  curriculum,
  setContext,
  buildQuestion,
  readCN,
  fmt,
  // 供测试使用
  _internal: { core, conceptQ, simpleCore, calcCore, eqCore, areaCore, repetend },
};
