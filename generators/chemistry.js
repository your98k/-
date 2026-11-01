/* =========================================================
 * 化学生成器（初中 + 高中）
 * ======================================================= */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./util.js'));
  else { root.KB = root.KB || {}; root.KB.GenChemistry = factory(root.KB.GenUtil); }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (U) {

  var JUNIOR = {

    'chem.atom': function (c) {
      var r = c.rng, Z = r.int(1, 20), N = r.int(0, 22);
      var A = Z + N;
      return {
        stem: '某原子的质子数为 ' + Z + '，中子数为 ' + N + '，则该原子的核电荷数为 ______，核外电子数为 ______，质量数为 ______',
        answer: Z + '，' + Z + '，' + A,
        analysis: '核电荷数 = 质子数 = 核外电子数 = ' + Z + '；质量数 = 质子数 + 中子数 = ' + A + '。'
      };
    },

    'chem.eq': function (c) {
      var r = c.rng;
      var table = [
        ['__H₂ + __O₂ → __H₂O', '2，1，2'],
        ['__C + __O₂ → __CO₂', '1，1，1'],
        ['__Fe + __O₂ → __Fe₃O₄', '3，2，1'],
        ['__KClO₃ → __KCl + __O₂', '2，2，3'],
        ['__Al + __HCl → __AlCl₃ + __H₂', '2，6，2，3'],
        ['__CaCO₃ → __CaO + __CO₂', '1，1，1'],
        ['__CH₄ + __O₂ → __CO₂ + __H₂O', '1，2，1，2'],
        ['__NaOH + __H₂SO₄ → __Na₂SO₄ + __H₂O', '2，1，1，2'],
        ['__Mg + __O₂ → __MgO', '2，1，2'],
        ['__H₂O₂ → __H₂O + __O₂', '2，2，1']
      ];
      var t = r.pick(table);
      return {
        stem: '配平化学方程式（在横线上填化学计量数）：' + t[0],
        answer: t[1],
        analysis: '依据质量守恒定律，反应前后各元素原子个数相等。'
      };
    },

    'chem.solution': function (c) {
      var r = c.rng, m = r.int(2, 40), water = r.int(50, 200);
      var pct = m / (m + water) * 100;
      return {
        stem: '把 ' + m + ' g 食盐溶于 ' + water + ' g 水中，所得溶液的溶质质量分数是 ______%',
        answer: U.num(Math.round(pct * 10) / 10),
        wrongs: [U.num(Math.round(m / water * 1000) / 10), U.num(Math.round(pct * 10) / 10 + 5), U.num(m)],
        analysis: '溶质质量分数 = 溶质质量 ÷ 溶液质量 ×100% = ' + m + '/' + (m + water) + '×100%'
      };
    },

    'chem.carbon': function (c) {
      var r = c.rng, m = r.int(10, 100);
      var co2 = Math.round(m / 100 * 44 * 10) / 10;
      return {
        stem: '高温煅烧 ' + m + ' g 碳酸钙（CaCO₃ → CaO + CO₂↑），理论上生成二氧化碳 ______ g',
        answer: U.num(co2),
        wrongs: [U.num(m), U.num(Math.round(m / 100 * 56 * 10) / 10), U.num(co2 + 10)],
        analysis: 'CaCO₃ 相对分子质量 100，CO₂ 为 44，按比例 ' + m + '/100×44 = ' + U.num(co2) + ' g。'
      };
    },

    'chem.metal': function (c) {
      var r = c.rng;
      var pairs = [
        ['铁', '稀盐酸', true, '铁在氢前，能置换出酸中的氢'],
        ['铜', '稀盐酸', false, '铜在氢后，不与稀盐酸反应'],
        ['锌', '稀硫酸', true, '锌在氢前，反应生成硫酸锌和氢气'],
        ['银', '稀盐酸', false, '银在氢后，不与稀盐酸反应'],
        ['镁', '稀盐酸', true, '镁活泼，反应剧烈并放出氢气']
      ];
      var p = r.pick(pairs);
      return {
        stem: '把' + p[0] + '放入' + p[1] + '中，能否发生反应？',
        answer: p[2] ? '能' : '不能',
        judge: { stmt: p[0] + '能与' + p[1] + '反应放出氢气', truth: p[2] },
        wrongs: [p[2] ? '不能' : '能', '无法判断', '只在加热时能'],
        analysis: p[3] + '（金属活动性顺序：K Ca Na Mg Al Zn Fe Sn Pb (H) Cu Hg Ag Pt Au）。'
      };
    },

    'chem.acid': function (c) {
      var r = c.rng, ph = r.int(1, 13);
      var kind = ph < 7 ? '酸性' : ph === 7 ? '中性' : '碱性';
      return {
        stem: '某溶液的 pH = ' + ph + '，该溶液呈 ______ 性',
        answer: kind,
        wrongs: [ph < 7 ? '碱性' : '酸性', '中性', '无法判断'],
        analysis: 'pH < 7 酸性，pH = 7 中性，pH > 7 碱性。'
      };
    },

    /* ============ 补齐的 5 个知识点 ============ */

    'chem.intro': function (c) {
      var r = c.rng;
      var t = r.pick([
        ['铁生锈', '化学变化', '有新物质（铁锈）生成'],
        ['冰雪融化', '物理变化', '只是状态改变，没有新物质'],
        ['蜡烛燃烧', '化学变化', '生成二氧化碳和水'],
        ['酒精挥发', '物理变化', '只是由液态变为气态'],
        ['食物腐败', '化学变化', '产生新物质并有异味'],
        ['玻璃破碎', '物理变化', '形状改变，成分不变']
      ]);
      return {
        stem: '下列变化中，属于' + t[1] + '的是',
        answer: t[0],
        wrongs: ['铁生锈', '蜡烛燃烧', '食物腐败', '冰雪融化', '酒精挥发', '玻璃破碎']
          .filter(function (v) { return v !== t[0]; }).slice(0, 3).map(function (v) { return v; }),
        analysis: t[0] + '属于' + t[1] + '：' + t[2] + '。'
      };
    },

    'chem.air': function (c) {
      var r = c.rng;
      var gases = [
        ['氮气', 78, 'N₂'],
        ['氧气', 21, 'O₂'],
        ['稀有气体', 0.94, 'He、Ne、Ar 等'],
        ['二氧化碳', 0.03, 'CO₂']
      ];
      var g = r.pick(gases);
      return {
        stem: '空气中' + g[0] + '的体积分数约为 ______%（保留到 0.01）',
        answer: String(g[1]),
        wrongs: ['21', '78', '0.94', '0.03'].filter(function (v) { return v !== String(g[1]); }).slice(0, 3),
        analysis: '空气主要成分：氮气 78%、氧气 21%、稀有气体 0.94%、二氧化碳 0.03%。' + g[0] + '为 ' + g[1] + '%。'
      };
    },

    'chem.water': function (c) {
      var r = c.rng;
      var t = r.pick([
        ['降低水的硬度', '煮沸或蒸馏', ['加入食盐', '静置沉淀', '过滤']],
        ['除去水中的不溶性杂质', '过滤', ['煮沸', '蒸馏', '加明矾吸附颜色']],
        ['区分硬水和软水', '加肥皂水，泡沫少的是硬水', ['观察颜色', '闻气味', '尝味道']],
        ['自来水厂常用的消毒剂', '氯气（或二氧化氯）', ['明矾', '活性炭', '食盐']]
      ]);
      return {
        stem: t[0] + '的方法是',
        answer: t[1],
        wrongs: t[2],
        analysis: '净水方法：沉淀→过滤→吸附→消毒；硬水软化用煮沸或蒸馏。'
      };
    },

    'chem.fuel': function (c) {
      var r = c.rng;
      var t = r.pick([
        ['燃烧需要同时满足的条件是', '可燃物、氧气、温度达到着火点', ['可燃物、二氧化碳、高温', '只需要氧气', '只需要可燃物']],
        ['灭火时用水浇灭，主要利用了', '降低温度到着火点以下', ['隔绝氧气', '清除可燃物', '降低着火点']],
        ['用锅盖盖灭油锅着火，利用了', '隔绝氧气', '降低温度', ['清除可燃物', '降低着火点']]
      ]);
      return {
        stem: t[0],
        answer: t[1],
        wrongs: t[2],
        analysis: '燃烧三条件：可燃物、与氧气接触、温度达到着火点；灭火即破坏其中任一条件。'
      };
    },

    'chem.salt': function (c) {
      var r = c.rng;
      var t = r.pick([
        ['NaCl 与 AgNO₃', '能反应，生成 AgCl 沉淀', ['不能反应', '生成气体', '生成水']],
        ['Na₂CO₃ 与 HCl', '能反应，生成 CO₂ 气体', ['不能反应', '生成沉淀', '生成水']],
        ['NaOH 与 HCl', '能反应，生成水', ['不能反应', '生成沉淀', '生成气体']],
        ['NaCl 与 KNO₃', '不能反应，没有沉淀、气体或水生成', ['生成沉淀', '生成气体', '生成水']]
      ]);
      return {
        stem: '复分解反应 ' + t[0] + ' 能否发生？',
        answer: t[1],
        wrongs: t[2],
        analysis: '复分解反应发生的条件：生成沉淀、气体或水，三者至少有一。'
      };
    }
  };

  var SENIOR = {

    'chem.s.redox': function (c) {
      var r = c.rng;
      var table = [
        ['Fe + CuSO₄ → FeSO₄ + Cu', 'Fe', 'CuSO₄', 2],
        ['Zn + 2HCl → ZnCl₂ + H₂↑', 'Zn', 'HCl', 2],
        ['2Na + Cl₂ → 2NaCl', 'Na', 'Cl₂', 2],
        ['Cu + 2AgNO₃ → Cu(NO₃)₂ + 2Ag', 'Cu', 'AgNO₃', 2],
        ['2H₂ + O₂ → 2H₂O', 'H₂', 'O₂', 4]
      ];
      var t = r.pick(table);
      return {
        stem: '反应 ' + t[0] + ' 中，还原剂是 ______，氧化剂是 ______，转移电子数为 ______',
        answer: t[1] + '，' + t[2] + '，' + t[3],
        analysis: '化合价升高的物质作还原剂，降低的作氧化剂。'
      };
    },

    'chem.s.ion': function (c) {
      var r = c.rng;
      var table = [
        ['盐酸与氢氧化钠反应', 'H⁺ + OH⁻ → H₂O', ['Na⁺ + Cl⁻ → NaCl', 'H⁺ + Cl⁻ → HCl', 'Na⁺ + OH⁻ → NaOH']],
        ['碳酸钙与盐酸反应', 'CaCO₃ + 2H⁺ → Ca²⁺ + H₂O + CO₂↑', ['CaCO₃ + 2HCl → CaCl₂ + H₂O + CO₂↑', 'CO₃²⁻ + 2H⁺ → H₂O + CO₂↑', 'Ca²⁺ + CO₃²⁻ → CaCO₃↓']],
        ['铁与稀硫酸反应', 'Fe + 2H⁺ → Fe²⁺ + H₂↑', ['2Fe + 6H⁺ → 2Fe³⁺ + 3H₂↑', 'Fe + H⁺ → Fe²⁺ + H↑', 'Fe + 2H⁺ → Fe³⁺ + H₂↑']],
        ['硫酸铜与氢氧化钠反应', 'Cu²⁺ + 2OH⁻ → Cu(OH)₂↓', ['Cu²⁺ + OH⁻ → CuOH', 'CuSO₄ + 2NaOH → Cu(OH)₂↓ + Na₂SO₄', 'Cu²⁺ + 2OH⁻ → CuO↓ + H₂O']]
      ];
      var t = r.pick(table);
      return {
        stem: t[0] + '的离子方程式是',
        answer: t[1],
        wrongs: t[2],
        analysis: '离子方程式只保留实际参加反应的离子，可溶性强电解质拆开写。'
      };
    },

    'chem.s.period': function (c) {
      var r = c.rng;
      var table = [
        ['Na、Mg、Al', 'Na', '同周期从左到右原子半径逐渐减小'],
        ['Li、Na、K', 'K', '同主族从上到下原子半径逐渐增大'],
        ['F、Cl、Br', 'F', '同主族从上到下非金属性减弱'],
        ['Na、Mg、Al', 'Al', '同周期从左到右金属性逐渐减弱']
      ];
      var t = r.pick(table);
      var ask = /半径/.test(t[2]) ? '原子半径最大的是' : '金属性最弱的是';
      return {
        stem: t[0] + ' 中，' + ask,
        answer: t[1],
        wrongs: t[0].split('、').filter(function (x) { return x !== t[1]; }),
        analysis: t[2] + '。'
      };
    },

    'chem.s.energy': function (c) {
      var r = c.rng, m = r.int(1, 10), q = r.int(20, 300);
      return {
        stem: '完全燃烧 ' + m + ' mol 某物质放出 ' + q + ' kJ 热量，该反应的反应热 ΔH = ______ kJ/mol',
        answer: '-' + U.num(q / m),
        wrongs: ['+' + U.num(q / m), '-' + U.num(q), '-' + U.num(q * m)],
        analysis: '放热反应 ΔH < 0，ΔH = -Q/n = -' + U.num(q / m) + ' kJ/mol。'
      };
    },

    'chem.s.rate': function (c) {
      var r = c.rng, dc = r.int(1, 8) / 10, dt = r.int(1, 10);
      return {
        stem: '某反应中某物质浓度在 ' + dt + ' s 内减少了 ' + U.num(dc) + ' mol/L，该反应的平均速率 v = ______ mol/(L·s)',
        answer: U.num(dc / dt),
        wrongs: [U.num(dc * dt), U.num(dt / dc), U.num(dc / dt + 0.1)],
        analysis: 'v = Δc/Δt = ' + U.num(dc) + '/' + dt + ' = ' + U.num(dc / dt) + ' mol/(L·s)'
      };
    },

    'chem.s.ph': function (c) {
      var r = c.rng, e = r.int(1, 6);
      var ph = e;
      return {
        stem: '某溶液中 c(H⁺) = 1×10⁻' + e + ' mol/L，该溶液的 pH = ______',
        answer: String(ph),
        wrongs: [String(14 - ph), String(e + 7), String(e - 1)],
        analysis: 'pH = -lg c(H⁺) = ' + ph + '。'
      };
    },

    /* ============ 补齐的 8 个知识点 ============ */

    'chem.s.na': function (c) {
      var r = c.rng, n = r.int(1, 8);
      return {
        stem: '过氧化钠与二氧化碳反应：2Na₂O₂ + 2CO₂ → 2Na₂CO₃ + O₂。现有 ' + n + ' mol Na₂O₂ 完全反应，生成 O₂ ______ mol',
        answer: U.num(n / 2),
        wrongs: [String(n), String(n * 2), U.num(n / 4)],
        analysis: '由方程式系数比 2 : 1 可知，O₂ 为 Na₂O₂ 的一半，即 ' + U.num(n / 2) + ' mol。'
      };
    },

    'chem.s.cl': function (c) {
      var r = c.rng;
      var t = r.pick([
        ['实验室制取氯气的反应 MnO₂ + 4HCl(浓) → MnCl₂ + Cl₂↑ + 2H₂O 中，氧化剂是', 'MnO₂', ['HCl', 'MnCl₂', 'Cl₂'], 'Mn 由 +4 降到 +2，被还原'],
        ['氯气通入紫色石蕊试液，现象是', '先变红后褪色', ['只变红', '只褪色', '不变色'], 'Cl₂ 与水反应生成 HCl（酸性）和 HClO（漂白性）'],
        ['检验 Cl⁻ 常用的试剂是', 'AgNO₃ 溶液和稀硝酸', ['BaCl₂ 溶液', 'NaOH 溶液', 'KSCN 溶液'], '生成不溶于稀硝酸的白色 AgCl 沉淀']
      ]);
      return { stem: t[0], answer: t[1], wrongs: t[2], analysis: t[3] + '。' };
    },

    'chem.s.fe': function (c) {
      var r = c.rng;
      var t = r.pick([
        ['检验 Fe³⁺ 常用的试剂是', 'KSCN 溶液（变血红色）', ['NaOH 溶液', 'AgNO₃ 溶液', '石蕊试液'], 'Fe³⁺ 与 SCN⁻ 生成血红色配合物'],
        ['Fe³⁺ 与 Fe 反应的离子方程式是', '2Fe³⁺ + Fe → 3Fe²⁺', ['Fe³⁺ + Fe → 2Fe²⁺', 'Fe³⁺ + 3e⁻ → Fe', 'Fe³⁺ + Fe → Fe₂⁺'], 'Fe³⁺ 被 Fe 还原为 Fe²⁺'],
        ['Fe(OH)₂ 在空气中放置的现象是', '白色沉淀迅速变灰绿色，最后变红褐色', ['不变色', '直接变蓝色', '溶解'], 'Fe(OH)₂ 被氧气氧化为 Fe(OH)₃']
      ]);
      return { stem: t[0], answer: t[1], wrongs: t[2], analysis: t[3] + '。' };
    },

    'chem.s.s': function (c) {
      var r = c.rng;
      var t = r.pick([
        ['浓硫酸敞口放置质量增加，体现了', '吸水性', ['脱水性', '强氧化性', '酸性'], '浓硫酸吸收空气中的水蒸气'],
        ['浓硫酸使蔗糖变黑，体现了', '脱水性', ['吸水性', '酸性', '挥发性'], '按 H:O = 2:1 脱去水分，留下碳'],
        ['SO₂ 能使品红溶液褪色，体现了', '漂白性', ['酸性', '还原性', '氧化性'], 'SO₂ 与有色物质结合生成不稳定无色物质'],
        ['SO₂ 与 NaOH 反应生成', 'Na₂SO₃ 和水', ['Na₂SO₄ 和水', 'S 和 NaOH', '不反应'], 'SO₂ 是酸性氧化物']
      ]);
      return { stem: t[0], answer: t[1], wrongs: t[2], analysis: t[3] + '。' };
    },

    'chem.s.n': function (c) {
      var r = c.rng, n = r.int(1, 6);
      return {
        stem: '铜与浓硝酸反应：Cu + 4HNO₃(浓) → Cu(NO₃)₂ + 2NO₂↑ + 2H₂O。' + n + ' mol Cu 完全反应，生成 NO₂ ______ mol',
        answer: String(2 * n),
        wrongs: [String(n), String(4 * n), U.num(n / 2)],
        analysis: '由系数比 1 : 2 可知，NO₂ 物质的量为 Cu 的 2 倍。'
      };
    },

    'chem.s.ksp': function (c) {
      var r = c.rng, k = r.pick([1, 2, 4]) * Math.pow(10, -r.int(5, 9));
      // AB 型：Ksp = s^2
      var s = Math.sqrt(k);
      return {
        stem: '某难溶盐 AB 的 Ksp = ' + U.sci(k, 1) + '，则其饱和溶液中 c(A⁺) 约为 ______ mol/L',
        answer: U.sci(s, 1),
        wrongs: [U.sci(k, 1), U.sci(s * 2, 1), U.sci(s / 2, 1)],
        analysis: 'AB 型：Ksp = s²，故 s = √Ksp = ' + U.sci(s, 1) + ' mol/L。'
      };
    },

    'chem.s.org': function (c) {
      var r = c.rng, n = r.int(2, 6);
      var formula = 'C' + n + 'H' + (2 * n + 2);
      return {
        stem: '分子式为 ' + formula + ' 的烷烃，其同分异构体（不考虑立体异构）共有 ______ 种',
        answer: String([0, 0, 1, 1, 2, 3, 5][n] || '5'),
        wrongs: [String([0, 0, 1, 1, 2, 3, 5][n] + 1), String(n), '4'],
        analysis: '烷烃 ' + formula + ' 的同分异构体数：甲烷 1、乙烷 1、丙烷 1、丁烷 2、戊烷 3、己烷 5。'
      };
    },

    'chem.s.org2': function (c) {
      var r = c.rng;
      var t = r.pick([
        ['乙醇与乙酸在浓硫酸催化下加热，生成', '乙酸乙酯和水', ['乙醛和水', '乙烯和水', '乙醇钠'], '酯化反应，酸脱羟基醇脱氢'],
        ['乙酸能使石蕊变红，说明它具有', '酸性', ['碱性', '氧化性', '还原性'], '乙酸含羧基，具酸的通性'],
        ['乙醇能被酸性高锰酸钾氧化为', '乙酸', ['乙烯', '乙醛', '乙醚'], '乙醇先氧化为乙醛，再氧化为乙酸'],
        ['检验葡萄糖可用', '新制氢氧化铜悬浊液加热', ['石蕊试液', 'KSCN 溶液', 'AgNO₃ 溶液'], '生成砖红色 Cu₂O 沉淀']
      ]);
      return { stem: t[0], answer: t[1], wrongs: t[2], analysis: t[3] + '。' };
    }
  };

  function emit(type, core, c) {
    var r = c.rng;
    if (type === 'choice') {
      if (!core.wrongs || core.wrongs.length < 1) return null;
      return U.choice(r, core.stem, core.answer, core.wrongs, core.analysis);
    }
    if (type === 'fill' || type === 'calc' || type === 'solve' || type === 'experiment') {
      var stem = core.stem;
      if (type === 'calc' || type === 'solve') { if (!/过程|解答/.test(stem)) stem += '（写出计算过程）'; }
      return { stem: stem, answer: core.answer, analysis: core.analysis };
    }
    if (type === 'judge') {
      if (core.judge) return U.judge(r, core.judge.stmt, core.judge.truth, core.analysis);
      return null;
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
      q.subject = 'chemistry'; q.stage = stage;
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



