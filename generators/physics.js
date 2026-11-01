/* =========================================================
 * 物理生成器（初中 + 高中）
 * 以计算类为主，答案带单位
 * ======================================================= */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./util.js'));
  else { root.KB = root.KB || {}; root.KB.GenPhysics = factory(root.KB.GenUtil); }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (U) {

  var G = 10; // 初中取 g = 10 N/kg

  var JUNIOR = {
    'phy.motion': function (c) {
      var r = c.rng, s = r.int(20, 400), t = r.int(2, 20);
      var v = s / t;
      return {
        stem: '一辆小车 ' + t + ' s 内行驶了 ' + s + ' m，它的平均速度是 ______ m/s',
        answer: U.num(v),
        wrongs: [U.num(s * t), U.num(t / s), U.num(v + 2)],
        analysis: 'v = s/t = ' + s + '/' + t + ' = ' + U.num(v) + ' m/s'
      };
    },
    'phy.sound': function (c) {
      var r = c.rng, t = r.int(1, 5);
      var s = 340 * t / 2;
      return {
        stem: '对着山崖喊一声，经过 ' + t + ' s 听到回声。声音在空气中的速度取 340 m/s，人距山崖 ______ m',
        answer: U.num(s),
        wrongs: [U.num(340 * t), U.num(340 * t / 4), U.num(t * 340 / 10)],
        analysis: '回声路程是往返的：s = vt/2 = 340×' + t + '/2 = ' + U.num(s) + ' m'
      };
    },
    'phy.light': function (c) {
      var r = c.rng, a = r.int(10, 70);
      return {
        stem: '光线以 ' + a + '° 的入射角射到平面镜上，反射角是 ______°',
        answer: String(a),
        wrongs: [String(90 - a), String(180 - a), String(a / 2)],
        analysis: '光的反射定律：反射角等于入射角。'
      };
    },
    'phy.density': function (c) {
      var r = c.rng, m = r.int(20, 500), V = r.int(10, 200);
      var rho = m / V;
      return {
        stem: '某物体质量为 ' + m + ' g，体积为 ' + V + ' cm³，它的密度是 ______ g/cm³',
        answer: U.num(rho),
        wrongs: [U.num(V / m), U.num(m * V), U.num(rho + 1)],
        analysis: 'ρ = m/V = ' + m + '/' + V + ' = ' + U.num(rho) + ' g/cm³'
      };
    },
    'phy.force': function (c) {
      var r = c.rng, m = r.int(1, 60);
      return {
        stem: '质量为 ' + m + ' kg 的物体受到的重力是 ______ N（g 取 10 N/kg）',
        answer: String(m * G),
        wrongs: [String(m), String(m / G), String(m * G + 10)],
        analysis: 'G = mg = ' + m + '×10 = ' + m * G + ' N'
      };
    },
    'phy.press': function (c) {
      var r = c.rng, F = r.int(50, 500), S = r.int(5, 50) / 100;
      var p = F / S;
      return {
        stem: '物体对水平地面的压力为 ' + F + ' N，受力面积为 ' + U.num(S) + ' m²，压强是 ______ Pa',
        answer: U.num(p),
        wrongs: [U.num(F * S), U.num(p / 10), U.num(F + S)],
        analysis: 'p = F/S = ' + F + '/' + U.num(S) + ' = ' + U.num(p) + ' Pa'
      };
    },
    'phy.liqpress': function (c) {
      var r = c.rng, h = r.int(1, 20) / 10;
      var p = 1000 * G * h;
      return {
        stem: '水深 ' + U.num(h) + ' m 处，水产生的压强是 ______ Pa（ρ水 = 1.0×10³ kg/m³，g 取 10 N/kg）',
        answer: U.num(p),
        wrongs: [U.num(p / 10), U.num(1000 * h), U.num(p * 10)],
        analysis: 'p = ρgh = 1000×10×' + U.num(h) + ' = ' + U.num(p) + ' Pa'
      };
    },
    'phy.buoy': function (c) {
      var r = c.rng, V = r.int(1, 10) / 1000;
      var F = 1000 * G * V;
      return {
        stem: '体积为 ' + U.num(V) + ' m³ 的物体全部浸没在水中，受到的浮力是 ______ N（ρ水 = 1.0×10³ kg/m³，g 取 10 N/kg）',
        answer: U.num(F),
        wrongs: [U.num(F / 10), U.num(1000 * V), U.num(F * 10)],
        analysis: 'F浮 = ρ液gV排 = 1000×10×' + U.num(V) + ' = ' + U.num(F) + ' N'
      };
    },
    'phy.work': function (c) {
      var r = c.rng, F = r.int(20, 200), s = r.int(2, 20), t = r.int(2, 20);
      var W = F * s, P = W / t;
      return {
        stem: '用 ' + F + ' N 的力把物体沿力的方向移动 ' + s + ' m，用时 ' + t + ' s。做功 ______ J，功率 ______ W',
        answer: W + ' J，' + U.num(P) + ' W',
        analysis: 'W = Fs = ' + F + '×' + s + ' = ' + W + ' J；P = W/t = ' + W + '/' + t + ' = ' + U.num(P) + ' W'
      };
    },
    'phy.lever': function (c) {
      var r = c.rng, F1 = r.int(10, 100), L1 = r.int(1, 10), L2 = r.int(1, 10);
      var F2 = F1 * L1 / L2;
      return {
        stem: '杠杆平衡时，动力 ' + F1 + ' N，动力臂 ' + L1 + ' cm，阻力臂 ' + L2 + ' cm，阻力是 ______ N',
        answer: U.num(F2),
        wrongs: [U.num(F1 * L2 / L1), U.num(F1 + L1), U.num(F2 + 5)],
        analysis: 'F₁L₁ = F₂L₂，故 F₂ = F₁L₁/L₂ = ' + U.num(F2) + ' N'
      };
    },
    'phy.pulley': function (c) {
      var r = c.rng, Gobj = r.int(20, 200), n = r.pick([2, 3]);
      return {
        stem: '用 ' + n + ' 段绳子承担物重的滑轮组匀速提升重 ' + Gobj + ' N 的物体（不计摩擦和动滑轮重），拉力为 ______ N',
        answer: U.num(Gobj / n),
        wrongs: [String(Gobj), U.num(Gobj * n), U.num(Gobj / (n + 1))],
        analysis: 'F = G/n = ' + Gobj + '/' + n + ' = ' + U.num(Gobj / n) + ' N'
      };
    },
    'phy.heat': function (c) {
      var r = c.rng, m = r.int(1, 5), dt = r.int(10, 60);
      var Q = 4200 * m * dt;
      return {
        stem: '质量为 ' + m + ' kg 的水温度升高 ' + dt + ' ℃，吸收的热量是 ______ J（c水 = 4.2×10³ J/(kg·℃)）',
        answer: U.num(Q),
        wrongs: [U.num(Q / 10), U.num(4200 * dt), U.num(Q * 10)],
        analysis: 'Q = cmΔt = 4200×' + m + '×' + dt + ' = ' + U.num(Q) + ' J'
      };
    },
    'phy.circuit': function (c) {
      var r = c.rng, Uv = r.int(2, 24), R = r.int(2, 20);
      return {
        stem: '导体两端电压为 ' + Uv + ' V，电阻为 ' + R + ' Ω，通过导体的电流是 ______ A',
        answer: U.num(Uv / R),
        wrongs: [U.num(Uv * R), U.num(R / Uv), U.num(Uv / R + 1)],
        analysis: 'I = U/R = ' + Uv + '/' + R + ' = ' + U.num(Uv / R) + ' A'
      };
    },
    'phy.power': function (c) {
      var r = c.rng, Uv = r.int(3, 36), I = r.int(1, 5) / 10;
      return {
        stem: '某用电器两端电压 ' + Uv + ' V，通过的电流 ' + U.num(I) + ' A，它的电功率是 ______ W',
        answer: U.num(Uv * I),
        wrongs: [U.num(Uv / I), U.num(Uv + I), U.num(Uv * I * 10)],
        analysis: 'P = UI = ' + Uv + '×' + U.num(I) + ' = ' + U.num(Uv * I) + ' W'
      };
    },
    'phy.joule': function (c) {
      var r = c.rng, I = r.int(1, 5) / 10, R = r.int(2, 20), t = r.int(10, 120);
      var Q = I * I * R * t;
      return {
        stem: '通过电阻 ' + R + ' Ω 的电流为 ' + U.num(I) + ' A，通电 ' + t + ' s 产生的热量是 ______ J',
        answer: U.num(Q),
        wrongs: [U.num(I * R * t), U.num(Q / 10), U.num(Q * 10)],
        analysis: 'Q = I²Rt = ' + U.num(I) + '²×' + R + '×' + t + ' = ' + U.num(Q) + ' J'
      };
    }
  };

  var SENIOR = {
    'phy.s.kine': function (c) {
      var r = c.rng, v0 = r.int(0, 10), a = r.int(1, 5), t = r.int(2, 8);
      var v = v0 + a * t;
      var s = v0 * t + 0.5 * a * t * t;
      return {
        stem: '物体以初速度 ' + v0 + ' m/s 做匀加速直线运动，加速度 ' + a + ' m/s²，' + t + ' s 末速度为 ______ m/s，位移为 ______ m',
        answer: U.num(v) + ' m/s，' + U.num(s) + ' m',
        analysis: 'v = v₀ + at；s = v₀t + ½at²'
      };
    },
    'phy.s.newton': function (c) {
      var r = c.rng, m = r.int(1, 20), a = r.int(1, 8), f = r.int(1, 20);
      var F = m * a + f;
      return {
        stem: '质量 ' + m + ' kg 的物体在水平面上受到水平拉力，加速度为 ' + a + ' m/s²，摩擦力 ' + f + ' N，则拉力为 ______ N',
        answer: String(F),
        wrongs: [String(m * a), String(F + f), String(m * a - f)],
        analysis: '由牛顿第二定律 F - f = ma，得 F = ma + f = ' + F + ' N'
      };
    },
    'phy.s.proj': function (c) {
      var r = c.rng, v0 = r.int(5, 20), h = r.int(5, 45);
      var t = Math.sqrt(2 * h / G);
      var x = v0 * t;
      return {
        stem: '小球以 ' + v0 + ' m/s 水平抛出，下落高度 ' + h + ' m，落地所用时间为 ______ s，水平位移为 ______ m（g 取 10 m/s²）',
        answer: U.num(t) + ' s，' + U.num(x) + ' m',
        analysis: '竖直方向 h = ½gt² 得 t = √(2h/g)；水平方向 x = v₀t'
      };
    },
    'phy.s.circ': function (c) {
      var r = c.rng, v = r.int(2, 12), rad = r.int(1, 10);
      var an = v * v / rad;
      return {
        stem: '物体做半径为 ' + rad + ' m 的匀速圆周运动，线速度 ' + v + ' m/s，向心加速度为 ______ m/s²',
        answer: U.num(an),
        wrongs: [U.num(v / rad), U.num(v * rad), U.num(an / 2)],
        analysis: 'a = v²/r = ' + v + '²/' + rad + ' = ' + U.num(an) + ' m/s²'
      };
    },
    'phy.s.grav': function (c) {
      var r = c.rng, M = 6.0, R = 6400;
      var hgt = r.pick([0, 400, 800, 2000]);
      var v = Math.sqrt(3.986e14 / ((R + hgt) * 1000));
      return {
        stem: '地球半径约 6400 km，某卫星在距地面 ' + hgt + ' km 的圆轨道上运行，其线速度约为 ______ km/s（结果保留一位小数）',
        answer: U.num(Math.round(v / 100) / 10),
        wrongs: ['7.9', '11.2', '16.7'],
        analysis: '由 GMm/r² = mv²/r 得 v = √(GM/r)，代入 r = R + h。'
      };
    },
    'phy.s.energy': function (c) {
      var r = c.rng, m = r.int(1, 10), v1 = r.int(1, 5), v2 = r.int(6, 12);
      var W = 0.5 * m * (v2 * v2 - v1 * v1);
      return {
        stem: '质量 ' + m + ' kg 的物体速度由 ' + v1 + ' m/s 增大到 ' + v2 + ' m/s，合外力做的功为 ______ J',
        answer: U.num(W),
        wrongs: [U.num(0.5 * m * v2 * v2), U.num(m * (v2 - v1)), U.num(W / 2)],
        analysis: '动能定理 W = ½mv₂² - ½mv₁²'
      };
    },
    'phy.s.efield': function (c) {
      var r = c.rng, Q = r.int(1, 9) * 1e-8, rad = r.int(1, 10) / 10;
      var E = 9e9 * Q / (rad * rad);
      return {
        stem: '点电荷 Q = ' + U.sci(Q, 1) + ' C，距它 ' + U.num(rad) + ' m 处的电场强度为 ______ N/C（k = 9×10⁹）',
        answer: U.sci(E, 1),
        analysis: 'E = kQ/r² = 9×10⁹×' + U.sci(Q, 1) + '/' + U.num(rad) + '²'
      };
    },
    'phy.s.circuit': function (c) {
      var r = c.rng, emf = r.int(3, 24), R = r.int(2, 20), rr = r.int(1, 4);
      var I = emf / (R + rr);
      var U = I * R;
      return {
        stem: '电源电动势 ' + emf + ' V，内阻 ' + rr + ' Ω，外电阻 ' + R + ' Ω。电路中的电流为 ______ A，路端电压为 ______ V',
        answer: U.num(I) + ' A，' + U.num(U) + ' V',
        analysis: 'I = E/(R+r) = ' + emf + '/' + (R + rr) + '；U = IR'
      };
    },
    'phy.s.magnet': function (c) {
      var r = c.rng, B = r.int(1, 10) / 10, I = r.int(1, 10), L = r.int(1, 10) / 10;
      var F = B * I * L;
      return {
        stem: '长 ' + U.num(L) + ' m 的导线垂直放入磁感应强度 ' + U.num(B) + ' T 的匀强磁场中，通以 ' + I + ' A 电流，所受安培力为 ______ N',
        answer: U.num(F),
        wrongs: [U.num(B * I / L), U.num(F * 10), U.num(B + I + L)],
        analysis: 'F = BIL（导线与磁场垂直）'
      };
    },
    'phy.s.momentum': function (c) {
      var r = c.rng, m1 = r.int(1, 5), v1 = r.int(2, 10), m2 = r.int(1, 5);
      var v = m1 * v1 / (m1 + m2);
      return {
        stem: '质量 ' + m1 + ' kg 的小球以 ' + v1 + ' m/s 撞上静止的质量 ' + m2 + ' kg 的小球并粘在一起，共同速度为 ______ m/s',
        answer: U.num(v),
        wrongs: [U.num(v1), U.num(m1 * v1), U.num(v / 2)],
        analysis: '动量守恒：m₁v₁ = (m₁+m₂)v'
      };
    },
    'phy.s.induction': function (c) {
      var r = c.rng, B = r.int(1, 10) / 10, L = r.int(1, 10) / 10, v = r.int(1, 10);
      var E = B * L * v;
      return {
        stem: '长 ' + U.num(L) + ' m 的导体棒以 ' + v + ' m/s 垂直切割磁感线，磁感应强度 ' + U.num(B) + ' T，感应电动势为 ______ V',
        answer: U.num(E),
        wrongs: [U.num(B * L / v), U.num(E * 10), U.num(B + L + v)],
        analysis: 'E = BLv'
      };
    }
  };

  function emit(type, core, c) {
    var r = c.rng;
    if (type === 'choice') {
      if (!core.wrongs || core.wrongs.length < 3) return null;
      return U.choice(r, core.stem, core.answer, core.wrongs, core.analysis);
    }
    if (type === 'fill' || type === 'calc' || type === 'solve' || type === 'experiment') {
      var stem = core.stem;
      if (type === 'calc' || type === 'solve') { if (!/过程|解答/.test(stem)) stem += '（写出计算过程）'; }
      return { stem: stem, answer: core.answer, analysis: core.analysis };
    }
    return null;
  }

  function make(table, stage) {
    var gen = function generate(c) {
      var f = table[c.kp];
      if (!f) return null;
      var core;
      try { core = f(c); } catch (e) { return null; }
      if (!core) return null;
      var q = emit(c.type, core, c);
      if (!q) return null;
      q.subject = 'physics'; q.stage = stage;
      q.kp = c.kp; q.type = c.type; q.diff = c.diff;
      q.grade = c.grade; q.term = c.term;
      return q;
    };
    gen.kps = Object.keys(table);
    gen.coverage = 'core';
    return gen;
  }

  return {
    junior: make(JUNIOR, 'junior'),
    senior: make(SENIOR, 'senior'),
    kps: Object.keys(JUNIOR).concat(Object.keys(SENIOR))
  };
});



