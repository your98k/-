/* =========================================================
 * 方程专项训练 · 本地生成
 * 覆盖小学 / 初中 / 高中，难度 1–5 可选；不依赖任何 AI 接口。
 * ======================================================= */
(function () {
  'use strict';

  var STAGES = {
    primary: { name: '小学', grades: [1, 2, 3, 4, 5, 6] },
    junior: { name: '初中', grades: [7, 8, 9] },
    senior: { name: '高中', grades: [10, 11, 12] }
  };
  var DIFF_NAMES = ['易', '较易', '中', '较难', '难'];
  var DIFF_OPTIONS = [
    { id: 'mix', name: '混合' },
    { id: 'basic', name: '基础' },
    { id: 'medium', name: '中等' },
    { id: 'advanced', name: '提高' },
    { id: 'custom', name: '自定义' }
  ];

  var state = {
    stage: 'primary',
    grade: 5,
    term: 1,
    difficulty: 'mix',
    diffMin: 2,
    diffMax: 4,
    count: 10,
    showAnswer: false,
    paper: []
  };

  /* ---------------- 基础工具 ---------------- */
  function ri(a, b) { return a + Math.floor(Math.random() * (b - a + 1)); }
  function pick(a) { return a[Math.floor(Math.random() * a.length)]; }
  function fmt(n) {
    if (typeof n !== 'number') return String(n);
    var v = Math.round(n * 1000) / 1000;
    return String(v);
  }
  function weighted(vals, weights) {
    var total = 0, i;
    for (i = 0; i < weights.length; i++) total += weights[i];
    var r = Math.random() * total;
    for (i = 0; i < vals.length; i++) {
      r -= weights[i];
      if (r <= 0) return vals[i];
    }
    return vals[vals.length - 1];
  }
  function gradeLabel(g) {
    if (g <= 6) return ['一', '二', '三', '四', '五', '六'][g - 1] + '年级';
    if (g <= 9) return ['七', '八', '九'][g - 7] + '年级';
    return ['高一', '高二', '高三'][g - 10] || (g + '年级');
  }
  function stageOf(g) {
    if (g <= 6) return 'primary';
    if (g <= 9) return 'junior';
    return 'senior';
  }
  function termName(t) { return t === 2 ? '下册' : '上册'; }
  function clamp(n) { return Math.max(1, Math.min(5, Number(n) || 1)); }

  /* ---------------- 难度 ---------------- */
  function diffSpec() {
    var a = clamp(state.diffMin), b = clamp(state.diffMax);
    if (a > b) { var t = a; a = b; b = t; }
    if (state.difficulty === 'basic') return { range: [1, 2], label: '基础（易—较易）' };
    if (state.difficulty === 'medium') return { range: [3, 3], label: '中等' };
    if (state.difficulty === 'advanced') return { range: [4, 5], label: '提高（较难—难）' };
    if (state.difficulty === 'custom') return { range: [a, b], label: '自定义（' + DIFF_NAMES[a - 1] + '—' + DIFF_NAMES[b - 1] + '）' };
    return { range: [1, 5], label: '混合' };
  }

  function clampForGrade(d) {
    if (state.stage === 'primary') {
      if (state.grade <= 2) return Math.min(d, 2);
      if (state.grade <= 4) return Math.min(d, 3);
    }
    if (state.stage === 'junior') {
      if (state.grade === 7) return Math.min(d, 3);
      if (state.grade === 8) return Math.min(d, 4);
    }
    return Math.max(1, Math.min(5, d));
  }

  function pickDiff() {
    var d;
    if (state.difficulty === 'mix') {
      d = weighted([1, 2, 3, 4, 5], [0.25, 0.35, 0.25, 0.1, 0.05]);
    } else {
      var r = diffSpec().range;
      d = ri(r[0], r[1]);
    }
    return clampForGrade(d);
  }

  /* ---------------- 题目工厂 ---------------- */
  function makeQuestion(diff) {
    var q = null;
    if (state.stage === 'primary') q = primaryQ(diff);
    else if (state.stage === 'junior') q = juniorQ(diff);
    else q = seniorQ(diff);
    if (!q) return null;
    q.diff = diff;
    return q;
  }

  function linear(text, x, steps) {
    return { text: text, answer: 'x = ' + x, steps: steps || [] };
  }
  function coef(a, v) { return a === 1 ? v : a + v; }
  function signed(v) { return v >= 0 ? ' + ' + v : ' - ' + Math.abs(v); }

  /* ---------------- 小学 ---------------- */
  function primaryQ(diff) {
    var grade = state.grade;
    var max = grade <= 2 ? 20 : grade <= 4 ? 100 : 500;

    if (diff <= 1) {
      var x = ri(1, max), a = ri(1, max);
      if (Math.random() < 0.5) {
        return linear('x + ' + a + ' = ' + (x + a), x,
          ['x = ' + (x + a) + ' - ' + a, 'x = ' + x]);
      }
      if (x <= a) a = ri(1, Math.max(1, x - 1));
      var b = x - a;
      return linear('x - ' + a + ' = ' + b, x,
        ['x = ' + b + ' + ' + a, 'x = ' + x]);
    }

    if (diff === 2) {
      if (Math.random() < 0.5) {
        var a2 = ri(2, 9), x2 = ri(2, 12), b2 = a2 * x2;
        return linear(a2 + 'x = ' + b2, x2,
          ['x = ' + b2 + ' ÷ ' + a2, 'x = ' + x2]);
      }
      var d2 = ri(2, 9), q2 = ri(2, 12), n2 = d2 * q2;
      return linear('x ÷ ' + d2 + ' = ' + q2, n2,
        ['x = ' + q2 + ' × ' + d2, 'x = ' + n2]);
    }

    if (diff === 3) {
      if (grade >= 5 && Math.random() < 0.3) {
        var da = ri(10, 99) / 10, dx = ri(2, 12), db = ri(10, 99) / 10;
        var dc = Math.round((da * dx + db) * 10) / 10;
        return {
          text: fmt(da) + 'x + ' + fmt(db) + ' = ' + fmt(dc),
          answer: 'x = ' + dx,
          steps: ['x = (' + fmt(dc) + ' - ' + fmt(db) + ') ÷ ' + fmt(da), 'x = ' + dx]
        };
      }
      var a3 = ri(2, 9), x3 = ri(2, 12), b3 = ri(1, 20);
      if (Math.random() < 0.5) {
        var c3 = a3 * x3 + b3;
        return { text: a3 + 'x + ' + b3 + ' = ' + c3, answer: 'x = ' + x3,
          steps: ['x = (' + c3 + ' - ' + b3 + ') ÷ ' + a3, 'x = ' + x3] };
      }
      if (b3 >= a3 * x3) b3 = 1;
      var c4 = a3 * x3 - b3;
      return { text: a3 + 'x - ' + b3 + ' = ' + c4, answer: 'x = ' + x3,
        steps: ['x = (' + c4 + ' + ' + b3 + ') ÷ ' + a3, 'x = ' + x3] };
    }

    if (diff === 4) {
      if (Math.random() < 0.5) {
        var a4 = ri(2, 6), x4 = ri(2, 10), b4 = ri(1, 10);
        var c5 = a4 * (x4 + b4);
        return {
          text: a4 + '(x + ' + b4 + ') = ' + c5,
          answer: 'x = ' + x4,
          steps: ['x + ' + b4 + ' = ' + c5 + ' ÷ ' + a4, 'x = ' + (c5 / a4) + ' - ' + b4, 'x = ' + x4]
        };
      }
      var a5 = ri(2, 5), b5 = ri(2, 5), x5 = ri(2, 8);
      var c6 = (a5 + b5) * x5;
      return {
        text: a5 + 'x + ' + b5 + 'x = ' + c6,
        answer: 'x = ' + x5,
        steps: ['(' + a5 + ' + ' + b5 + ')x = ' + c6, (a5 + b5) + 'x = ' + c6, 'x = ' + c6 + ' ÷ ' + (a5 + b5), 'x = ' + x5]
      };
    }

    if (Math.random() < 0.5) {
      var a6 = ri(2, 6), c7 = ri(1, 4), x6 = ri(2, 10), b6 = ri(1, 20);
      if (a6 === c7) c7 = a6 - 1;
      var d7 = a6 * x6 + b6 - c7 * x6;
      if (d7 <= 0) { b6 = 1; d7 = a6 * x6 + b6 - c7 * x6; }
      return {
        text: coef(a6, 'x') + ' + ' + b6 + ' = ' + coef(c7, 'x') + signed(d7),
        answer: 'x = ' + x6,
        steps: [coef(a6, 'x') + ' - ' + coef(c7, 'x') + ' = ' + d7 + ' - ' + b6,
          '(' + a6 + ' - ' + c7 + ')x = ' + (d7 - b6),
          'x = ' + (d7 - b6) + ' ÷ ' + (a6 - c7), 'x = ' + x6]
      };
    }
    var div = ri(2, 6), q = ri(2, 9), x7 = ri(2, 20);
    var add = div * q - x7;
    if (add <= 0) { x7 = div * q - 1; add = 1; }
    return {
      text: '(x + ' + add + ') ÷ ' + div + ' = ' + q,
      answer: 'x = ' + x7,
      steps: ['x + ' + add + ' = ' + q + ' × ' + div, 'x = ' + (q * div) + ' - ' + add, 'x = ' + x7]
    };
  }

  /* ---------------- 初中 ---------------- */
  function juniorQ(diff) {
    if (diff <= 2) {
      if (Math.random() < 0.5) {
        var a = ri(2, 6), x = ri(2, 10), b = ri(1, 15), c = ri(1, 4);
        if (a === c) c = a - 1;
        var d = a * x + b - c * x;
        if (d <= 0) { b = 1; d = a * x + b - c * x; }
        return {
          text: coef(a, 'x') + ' + ' + b + ' = ' + coef(c, 'x') + signed(d),
          answer: 'x = ' + x,
          steps: [coef(a, 'x') + ' - ' + coef(c, 'x') + ' = ' + d + ' - ' + b,
            '(' + a + ' - ' + c + ')x = ' + (d - b),
            'x = ' + (d - b) + ' ÷ ' + (a - c), 'x = ' + x]
        };
      }
      var a2 = ri(2, 6), x2 = ri(2, 12), b2 = ri(1, 20);
      var c2 = a2 * x2 + b2;
      return { text: a2 + 'x + ' + b2 + ' = ' + c2, answer: 'x = ' + x2,
        steps: ['x = (' + c2 + ' - ' + b2 + ') ÷ ' + a2, 'x = ' + x2] };
    }

    if (diff === 3) {
      if (Math.random() < 0.5) {
        var a3 = ri(2, 5), x3 = ri(2, 10), b3 = ri(1, 8);
        var c3 = a3 * (x3 + b3);
        return { text: a3 + '(x + ' + b3 + ') = ' + c3, answer: 'x = ' + x3,
          steps: ['x + ' + b3 + ' = ' + c3 + ' ÷ ' + a3, 'x = ' + (c3 / a3) + ' - ' + b3, 'x = ' + x3] };
      }
      var b4 = ri(2, 6), c4 = ri(2, 8), x4 = ri(2, 15);
      var a4 = b4 * c4 - x4;
      if (a4 <= 0) { x4 = b4 * c4 - 1; a4 = 1; }
      return {
        text: '(x + ' + a4 + ') ÷ ' + b4 + ' = ' + c4,
        answer: 'x = ' + x4,
        steps: ['x + ' + a4 + ' = ' + c4 + ' × ' + b4, 'x = ' + (c4 * b4) + ' - ' + a4, 'x = ' + x4]
      };
    }

    if (diff === 4) {
      if (Math.random() < 0.55) return systemQ();
      return quadraticQ(false);
    }

    if (Math.random() < 0.5) return fractionalQ();
    return quadraticQ(true);
  }

  function systemQ() {
    var a, b, c, d, det;
    do {
      a = ri(1, 4); b = ri(1, 4); c = ri(1, 4); d = ri(1, 4);
      det = a * d - b * c;
    } while (det === 0);
    var x = ri(1, 8), y = ri(1, 8);
    var e = a * x + b * y, f = c * x + d * y;
    return {
      text: '{ ' + coef(a, 'x') + ' + ' + coef(b, 'y') + ' = ' + e + '<br>' + coef(c, 'x') + ' + ' + coef(d, 'y') + ' = ' + f,
      answer: 'x = ' + x + '，y = ' + y,
      steps: ['用加减消元法解方程组', '解得 x = ' + x + '，y = ' + y],
      checkText: '把 x = ' + x + '，y = ' + y + ' 代入原方程组，两个方程都成立。'
    };
  }

  function quadraticQ(harder) {
    var a = harder ? ri(1, 3) : 1;
    var p = ri(1, 6), q = ri(1, 6);
    var b = -a * (p + q), c = a * p * q;
    var s = (a === 1 ? 'x²' : a + 'x²');
    s += b === 0 ? '' : (b > 0 ? ' + ' + b + 'x' : ' - ' + Math.abs(b) + 'x');
    s += c === 0 ? '' : (c > 0 ? ' + ' + c : ' - ' + Math.abs(c));
    s += ' = 0';
    var ans = p === q ? 'x1 = x2 = ' + p : 'x1 = ' + p + '，x2 = ' + q;
    return {
      text: s,
      answer: ans,
      steps: ['因式分解：' + (a === 1 ? '' : a + '') + '(x - ' + p + ')(x - ' + q + ') = 0', ans],
      checkText: '把 x1 = ' + p + '，x2 = ' + q + ' 分别代入原方程，等式都成立。'
    };
  }

  function fractionalQ() {
    var b = ri(2, 4);
    var k = ri(1, 5);
    var a = k * (b - 1);
    var x = b * k;
    return {
      text: '1/(x - ' + a + ') = ' + b + '/x',
      answer: 'x = ' + x,
      steps: ['去分母：x = ' + b + '(x - ' + a + ')',
        'x = ' + b + 'x - ' + (a * b),
        '(' + (b - 1) + ')x = ' + (a * b),
        'x = ' + x],
      checkText: '检验：x = ' + x + ' 时，x - ' + a + ' = ' + (x - a) + ' ≠ 0，x = ' + x + ' ≠ 0，且左右两边相等。'
    };
  }

  /* ---------------- 高中 ---------------- */
  function seniorQ(diff) {
    if (diff <= 2) return quadraticQ(diff === 2);
    if (diff === 3) return Math.random() < 0.5 ? expQ(false) : logQ(false);
    return Math.random() < 0.5 ? expQ(true) : logQ(true);
  }

  function expQ(shift) {
    var a = pick([2, 3, 4, 5]);
    var n = ri(2, 4);
    var c = shift ? ri(1, Math.max(1, n - 1)) : 0;
    var b = Math.pow(a, n);
    var x = n - c;
    return {
      text: a + '^(x' + (c ? ' + ' + c : '') + ') = ' + b,
      answer: 'x = ' + x,
      steps: [a + '^(x' + (c ? ' + ' + c : '') + ') = ' + a + '^' + n,
        'x' + (c ? ' + ' + c : '') + ' = ' + n,
        'x = ' + x],
      checkText: '把 x = ' + x + ' 代入原方程，左右两边相等。'
    };
  }

  function logQ(shift) {
    var a = pick([2, 3, 10]);
    var n = ri(1, 4);
    var c = shift ? ri(1, 5) : 0;
    var x = Math.pow(a, n) - c;
    if (x <= 0) { c = 0; x = Math.pow(a, n); }
    return {
      text: 'log_' + a + '(x' + (c ? ' + ' + c : '') + ') = ' + n,
      answer: 'x = ' + x,
      steps: ['x' + (c ? ' + ' + c : '') + ' = ' + a + '^' + n, 'x = ' + Math.pow(a, n) + (c ? ' - ' + c : ''), 'x = ' + x],
      checkText: '把 x = ' + x + ' 代入原方程，真数为正且等式成立。'
    };
  }

  /* ---------------- 生成 ---------------- */
  function generate() {
    var count = parseInt(state.count, 10) || 10;
    var questions = [], seen = {}, guard = 0;
    while (questions.length < count && guard < count * 80) {
      guard++;
      var d = pickDiff();
      var q = makeQuestion(d);
      if (!q || seen[q.text]) continue;
      seen[q.text] = 1;
      questions.push(q);
    }
    // 保险：不足时补简单题
    while (questions.length < count) {
      var qq = makeQuestion(1);
      if (qq && !seen[qq.text]) { seen[qq.text] = 1; questions.push(qq); }
      else break;
    }
    questions.forEach(function (q, i) {
      q.star = i === questions.length - 1;
      if (q.star && !q.checkText) {
        q.checkText = '把求出的解代入原方程（组）检验，等式成立。';
      }
    });
    state.paper = questions;
    renderPaper();
    renderHint();
  }

  /* ---------------- 渲染 ---------------- */
  function headerLeft() {
    return '人教版 · ' + gradeLabel(state.grade) + (state.stage === 'senior' ? '' : termName(state.term));
  }
  function headerRight() {
    if (state.stage === 'primary') return '简易方程 · 专项练习';
    if (state.stage === 'junior') return '方程（组） · 专项练习';
    return '方程与函数 · 专项练习';
  }
  function paperTitle() {
    return state.stage === 'primary' ? '解方程专项练习' : '方程专项训练';
  }
  function instruction() {
    var last = state.paper.length || state.count;
    if (state.stage === 'primary') {
      return '写出解方程的过程，注意等号对齐；带★的第' + last + '题还要写出检验过程。';
    }
    return '写出解方程（组）的过程，步骤完整；带★的第' + last + '题还要写出检验过程。';
  }

  function renderPaper() {
    var p = state.paper;
    var h = [];
    h.push('<div class="eq-paper-head"><span>' + headerLeft() + '</span><span>' + headerRight() + '</span></div>');
    h.push('<h1>' + paperTitle() + '</h1>');
    h.push('<div class="eq-meta">共 ' + p.length + ' 题 · 时间 ' + (p.length * 2) + ' 分钟 · 满分 100 分</div>');
    h.push('<div class="eq-name"><span>姓 名：<i></i></span><span>班：<i></i></span><span>得：<i></i></span></div>');
    h.push('<div class="eq-instruction"><b>答题要求</b><span>' + instruction() + '</span></div>');
    h.push('<div class="eq-grid">');
    p.forEach(function (q, i) {
      h.push('<div class="eq-card' + (q.star ? ' star' : '') + '">' +
        '<div class="eq-text"><span class="eq-no">' + (i + 1) + '.</span>' +
        (q.star ? '<span class="eq-star">★</span>' : '') + ' ' + q.text + '</div>' +
        '<div class="eq-solve">解：</div><div class="eq-space"></div></div>');
    });
    h.push('</div>');
    if (state.showAnswer) {
      h.push('<div class="eq-answers"><h3>参考答案与提示</h3>');
      p.forEach(function (q, i) {
        h.push('<div class="eq-ans"><b>' + (i + 1) + '.</b> ' + q.answer +
          (q.steps && q.steps.length ? ' <span class="steps">' + q.steps.join('；') + '</span>' : '') +
          (q.star && q.checkText ? ' <span class="steps">' + q.checkText + '</span>' : '') + '</div>');
      });
      h.push('</div>');
    }
    document.getElementById('eqPaper').innerHTML = h.join('');
  }

  function renderHint() {
    var spec = diffSpec();
    var extra = '';
    if (state.stage === 'primary' && state.grade <= 4) extra = '（低年级按年级上限调整）';
    else if (state.stage === 'junior' && state.grade <= 8) extra = '（按年级上限调整）';
    document.getElementById('eqHint').textContent =
      '当前：' + STAGES[state.stage].name + gradeLabel(state.grade) +
      (state.stage === 'senior' ? '' : termName(state.term)) +
      ' · ' + spec.label + extra + ' · ' + state.count + ' 题 · 时间 ' + (state.count * 2) + ' 分钟 · 满分 100 分';
  }

  /* ---------------- 控制区 ---------------- */
  function renderStageChips() {
    var box = document.getElementById('stageChips');
    box.innerHTML = '';
    Object.keys(STAGES).forEach(function (id) {
      var b = document.createElement('button');
      b.className = 'chip' + (state.stage === id ? ' on' : '');
      b.textContent = STAGES[id].name;
      b.onclick = function () {
        state.stage = id;
        state.grade = STAGES[id].grades[0];
        state.term = 1;
        renderAll();
        generate();
      };
      box.appendChild(b);
    });
  }

  function renderGrades() {
    var sel = document.getElementById('gradeSel');
    sel.innerHTML = '';
    STAGES[state.stage].grades.forEach(function (g) {
      var o = document.createElement('option');
      o.value = String(g);
      o.textContent = gradeLabel(g);
      if (g === state.grade) o.selected = true;
      sel.appendChild(o);
    });
    document.getElementById('termSel').value = String(state.term);
    var senior = state.stage === 'senior';
    document.getElementById('termSel').style.display = senior ? 'none' : '';
    document.getElementById('termLabel').style.display = senior ? 'none' : '';
  }

  function renderDiff() {
    var box = document.getElementById('diffChips');
    box.innerHTML = '';
    DIFF_OPTIONS.forEach(function (d) {
      var b = document.createElement('button');
      b.className = 'chip' + (state.difficulty === d.id ? ' on' : '');
      b.textContent = d.name;
      b.onclick = function () {
        state.difficulty = d.id;
        renderDiff();
        renderHint();
      };
      box.appendChild(b);
    });

    var custom = document.getElementById('diffCustom');
    var isCustom = state.difficulty === 'custom';
    custom.style.display = isCustom ? 'flex' : 'none';
    var min = document.getElementById('diffMin');
    var max = document.getElementById('diffMax');
    if (min.options.length === 0) {
      DIFF_NAMES.forEach(function (name, i) {
        var o1 = document.createElement('option');
        o1.value = String(i + 1);
        o1.textContent = name;
        min.appendChild(o1);
        var o2 = document.createElement('option');
        o2.value = String(i + 1);
        o2.textContent = name;
        max.appendChild(o2);
      });
      min.onchange = function () {
        state.diffMin = clamp(min.value);
        if (state.diffMin > state.diffMax) {
          state.diffMax = state.diffMin;
          max.value = String(state.diffMax);
        }
        renderDiff();
        renderHint();
      };
      max.onchange = function () {
        state.diffMax = clamp(max.value);
        if (state.diffMax < state.diffMin) {
          state.diffMin = state.diffMax;
          min.value = String(state.diffMin);
        }
        renderDiff();
        renderHint();
      };
    }
    min.value = String(state.diffMin);
    max.value = String(state.diffMax);
  }

  function renderAll() {
    renderStageChips();
    renderGrades();
    renderDiff();
    document.getElementById('countSel').value = String(state.count);
    document.getElementById('chkAnswer').checked = state.showAnswer;
    renderHint();
  }

  function copyText() {
    var p = state.paper;
    if (!p.length) return;
    var lines = [paperTitle(), headerLeft() + ' · ' + headerRight(),
      '共 ' + p.length + ' 题 · 时间 ' + (p.length * 2) + ' 分钟 · 满分 100 分', ''];
    p.forEach(function (q, i) {
      lines.push((i + 1) + '. ' + q.text.replace(/<br>/g, '；') + (q.star ? ' ★' : ''));
      lines.push('解：');
      lines.push('');
    });
    if (state.showAnswer) {
      lines.push('参考答案与提示：');
      p.forEach(function (q, i) {
        lines.push((i + 1) + '. ' + q.answer + (q.steps && q.steps.length ? '（' + q.steps.join('；') + '）' : ''));
      });
    }
    var txt = lines.join('\n');
    if (navigator.clipboard) {
      navigator.clipboard.writeText(txt).then(function () { alert('已复制到剪贴板'); },
        function () { fallbackCopy(txt); });
    } else fallbackCopy(txt);
  }

  function fallbackCopy(txt) {
    var ta = document.createElement('textarea');
    ta.value = txt;
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); alert('已复制到剪贴板'); } catch (e) { alert('复制失败，请手动选择'); }
    document.body.removeChild(ta);
  }

  function bind() {
    document.getElementById('gradeSel').onchange = function (e) {
      state.grade = Number(e.target.value);
      state.stage = stageOf(state.grade);
      renderAll();
      generate();
    };
    document.getElementById('termSel').onchange = function (e) {
      state.term = Number(e.target.value);
      renderHint();
      generate();
    };
    document.getElementById('countSel').onchange = function (e) {
      state.count = Number(e.target.value);
      renderHint();
      generate();
    };
    document.getElementById('btnBuild').onclick = generate;
    document.getElementById('btnPrint').onclick = function () { window.print(); };
    document.getElementById('btnCopy').onclick = copyText;
    document.getElementById('chkAnswer').onchange = function (e) {
      state.showAnswer = e.target.checked;
      renderPaper();
    };
  }

  /* ---------------- 启动 ---------------- */
  renderAll();
  bind();
  generate();
})();
