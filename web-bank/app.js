/* =========================================================
 * 组卷台前端逻辑
 * ======================================================= */
(function () {
  'use strict';

  var Registry = KB.Registry, Paper = KB.Paper, Schema = KB.Schema, Generators = KB.Generators;
  var $ = function (s) { return document.querySelector(s); };
  var SUBJECTS = Registry.subjects();
  var CN_NUM = ['一', '二', '三', '四', '五', '六', '七', '八', '九', '十', '十一', '十二'];

  var TYPE_SETS = {
    primaryMath: ['oral', 'vertical', 'calc', 'simple', 'equation', 'fill', 'judge', 'choice', 'estimate', 'error', 'app'],
    general: ['choice', 'fill', 'judge', 'calc', 'solve', 'app', 'experiment', 'short', 'cloze', 'translation'],
    chinese: ['choice', 'fill', 'judge', 'short', 'translation'],
    english: ['choice', 'fill', 'cloze', 'translation']
  };

  var DIFF_OPTIONS = [
    { id: 'mix', name: '混合' },
    { id: 'basic', name: '基础' },
    { id: 'medium', name: '中等' },
    { id: 'advanced', name: '提高' },
    { id: 'custom', name: '自定义' }
  ];
  var DIFF_NAMES = ['易', '较易', '中', '较难', '难'];

  /* 各题型答题留白：竖式计算必须留出列竖式的位置 */
  var WS_MAP = {
    vertical: ['ws-vertical', '竖式'],
    calc: ['ws-calc', '计算'],
    simple: ['ws-calc', '简算'],
    equation: ['ws-calc', '解方程'],
    error: ['ws-calc', '改正'],
    app: ['ws-app', '解答'],
    solve: ['ws-app', '解答'],
    proof: ['ws-proof', '证明'],
    experiment: ['ws-proof', '实验'],
    short: ['ws-short', '作答'],
    translation: ['ws-short', '翻译']
  };

  var PRESET = {
    primary: [
      { type: 'oral', count: 10, score: 2 },
      { type: 'vertical', count: 4, score: 4 },
      { type: 'fill', count: 6, score: 2 },
      { type: 'choice', count: 5, score: 2 },
      { type: 'app', count: 4, score: 5 }
    ],
    general: [
      { type: 'choice', count: 10, score: 3 },
      { type: 'fill', count: 8, score: 3 },
      { type: 'calc', count: 6, score: 5 },
      { type: 'solve', count: 4, score: 8 }
    ],
    chinese: [
      { type: 'choice', count: 8, score: 3 },
      { type: 'fill', count: 8, score: 3 },
      { type: 'short', count: 4, score: 6 }
    ],
    english: [
      { type: 'choice', count: 10, score: 2 },
      { type: 'fill', count: 8, score: 2 },
      { type: 'translation', count: 4, score: 5 }
    ]
  };

  var state = {
    subject: 'math',
    stage: 'junior',
    grade: 8,
    term: 1,
    kps: {},
    sections: [],
    paper: null,
    showAnswer: true,
    showKp: false,
    difficulty: 'mix',
    diffMin: 2,
    diffMax: 4,
    paperDiffLabel: '混合'
  };

  /* ---------- 基础工具 ---------- */
  function stageData() {
    var s = Registry.SUBJECTS[state.subject];
    return s && s.stages[state.stage];
  }
  function subjectName() { return Registry.SUBJECTS[state.subject].name; }
  function gradeLabel(g) {
    if (g <= 6) return ['一', '二', '三', '四', '五', '六'][g - 1] + '年级';
    if (g <= 9) return ['七', '八', '九'][g - 7] + '年级';
    return ['高一', '高二', '高三'][g - 10] || (g + '年级');
  }
  function stageStages(subject) {
    var s = Registry.SUBJECTS[subject];
    return Object.keys(s.stages).filter(function (k) { return s.stages[k].kps.length > 0; });
  }
  function typeName(t) { return (Schema.TYPES[t] && Schema.TYPES[t].name) || t; }
  function typePool() {
    if (state.subject === 'math' && state.stage === 'primary') return TYPE_SETS.primaryMath;
    if (state.subject === 'chinese') return TYPE_SETS.chinese;
    if (state.subject === 'english') return TYPE_SETS.english;
    return TYPE_SETS.general;
  }
  function presetFor() {
    if (state.subject === 'math' && state.stage === 'primary') return PRESET.primary;
    if (state.subject === 'chinese') return PRESET.chinese;
    if (state.subject === 'english') return PRESET.english;
    return PRESET.general;
  }
  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  /* ---------- 渲染：学科 / 学段 / 年级 ---------- */
  function renderSubjects() {
    var box = $('#subjectChips'); box.innerHTML = '';
    SUBJECTS.forEach(function (s) {
      var b = document.createElement('button');
      b.className = 'chip' + (s.id === state.subject ? ' on' : '');
      b.textContent = s.name;
      b.onclick = function () {
        state.subject = s.id;
        var st = stageStages(s.id);
        state.stage = st[0];
        state.grade = firstGrade(state.stage);
        state.term = 1;
        state.kps = {};
        state.sections = presetFor().slice();
        renderAll();
      };
      box.appendChild(b);
    });
  }

  function firstGrade(stage) {
    var d = StageOfCurrent(stage);
    var keys = Object.keys(d.grades).sort(function (a, b) {
      return Number(a.slice(1)) - Number(b.slice(1));
    });
    return keys.length ? Number(keys[0].slice(1)) : 7;
  }
  function StageOfCurrent(stage) {
    return Registry.SUBJECTS[state.subject].stages[stage];
  }

  function renderStages() {
    var box = $('#stageChips'); box.innerHTML = '';
    stageStages(state.subject).forEach(function (st) {
      var b = document.createElement('button');
      b.className = 'chip' + (st === state.stage ? ' on' : '');
      b.textContent = StageOfCurrent(st).name;
      b.onclick = function () {
        state.stage = st;
        state.grade = firstGrade(st);
        state.term = 1;
        state.kps = {};
        state.sections = presetFor().slice();
        renderAll();
      };
      box.appendChild(b);
    });
  }

  function renderGrades() {
    var sel = $('#gradeSel'); sel.innerHTML = '';
    var d = stageData();
    Object.keys(d.grades).sort(function (a, b) {
      return Number(a.slice(1)) - Number(b.slice(1));
    }).forEach(function (k) {
      var g = Number(k.slice(1));
      var o = document.createElement('option');
      o.value = g; o.textContent = gradeLabel(g);
      if (g === state.grade) o.selected = true;
      sel.appendChild(o);
    });
    $('#termSel').value = String(state.term);
  }

  function renderKpList() {
    var d = stageData();
    var box = $('#kpList'); box.innerHTML = '';
    var chapters = Object.keys(d.chapters).map(function (k) { return d.chapters[k]; })
      .sort(function (a, b) { return a.grade - b.grade || a.term - b.term || a.id.localeCompare(b.id); });

    var supported = (Generators.support(state.subject, state.stage) || []);
    var curGrade = state.grade, curTerm = state.term;

    chapters.forEach(function (ch) {
      var isCur = ch.grade === curGrade && ch.term === curTerm;
      var div = document.createElement('div');
      div.className = 'kp-ch';

      var title = document.createElement('div');
      title.className = 'kp-ch-title';
      title.textContent = (isCur ? '▸ ' : '') + ch.name;
      div.appendChild(title);

      ch.kps.forEach(function (kid) {
        var kp = d.kpMap[kid];
        if (!kp) return;
        var ok = supported.indexOf(kid) >= 0;
        var label = document.createElement('label');
        label.className = 'kp-item' + (ok ? '' : ' pending');
        label.title = ok ? '' : '该知识点暂无生成器';

        var cb = document.createElement('input');
        cb.type = 'checkbox';
        cb.checked = !!state.kps[kid];
        cb.disabled = !ok;
        cb.onchange = function () {
          if (cb.checked) state.kps[kid] = true; else delete state.kps[kid];
          updateKpCount();
        };
        label.appendChild(cb);
        label.appendChild(document.createTextNode(kp.name));
        div.appendChild(label);
      });
      box.appendChild(div);
    });
    updateKpCount();
  }

  function updateKpCount() {
    var n = Object.keys(state.kps).length;
    $('#kpCount').textContent = n ? '已选 ' + n + ' 个' : '未选（用本年级全部）';
  }

  /* ---------- 难度 ---------- */
  function diffSpec() {
    var a = Math.max(1, Math.min(5, Number(state.diffMin) || 1));
    var b = Math.max(1, Math.min(5, Number(state.diffMax) || 5));
    if (a > b) { var t = a; a = b; b = t; }

    if (state.difficulty === 'basic') return { diff: [1, 2], label: '基础（易—较易）' };
    if (state.difficulty === 'medium') return { diff: [3, 3], label: '中等' };
    if (state.difficulty === 'advanced') return { diff: [4, 5], label: '提高（较难—难）' };
    if (state.difficulty === 'custom') {
      return { diff: [a, b], label: '自定义（' + DIFF_NAMES[a - 1] + '—' + DIFF_NAMES[b - 1] + '）' };
    }
    return { diffMix: KB.Paper.DEFAULT_MIX, label: '混合' };
  }

  function renderDiff() {
    var box = $('#diffChips');
    if (!box) return;
    box.innerHTML = '';
    DIFF_OPTIONS.forEach(function (d) {
      var b = document.createElement('button');
      b.className = 'chip' + (state.difficulty === d.id ? ' on' : '');
      b.textContent = d.name;
      b.onclick = function () {
        state.difficulty = d.id;
        renderDiff();
      };
      box.appendChild(b);
    });

    var row = $('#diffCustomRow');
    var isCustom = state.difficulty === 'custom';
    row.style.display = isCustom ? 'flex' : 'none';

    var min = $('#diffMin'), max = $('#diffMax');
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
        state.diffMin = Number(min.value);
        if (state.diffMin > state.diffMax) {
          state.diffMax = state.diffMin;
          max.value = String(state.diffMax);
        }
        renderDiff();
      };
      max.onchange = function () {
        state.diffMax = Number(max.value);
        if (state.diffMax < state.diffMin) {
          state.diffMin = state.diffMax;
          min.value = String(state.diffMin);
        }
        renderDiff();
      };
    }
    min.value = String(state.diffMin);
    max.value = String(state.diffMax);

    var spec = diffSpec();
    if (isCustom) {
      $('#diffHint').textContent = '当前：' + spec.label + ' · 1 易 — 5 难';
    } else if (state.difficulty === 'mix') {
      $('#diffHint').textContent = '当前：混合 · 易25% / 较易35% / 中25% / 较难10% / 难5%';
    } else {
      $('#diffHint').textContent = '当前：' + spec.label;
    }
  }

  /* ---------- 渲染：大题编辑 ---------- */
  function renderSections() {
    var box = $('#sectionEditor'); box.innerHTML = '';
    var pool = typePool();
    state.sections.forEach(function (sec, i) {
      var row = document.createElement('div');
      row.className = 'sec-row';

      var sel = document.createElement('select');
      pool.forEach(function (t) {
        var o = document.createElement('option');
        o.value = t; o.textContent = typeName(t);
        if (t === sec.type) o.selected = true;
        sel.appendChild(o);
      });
      sel.onchange = function () { sec.type = sel.value; };

      var cnt = document.createElement('input');
      cnt.type = 'number'; cnt.min = 1; cnt.max = 60; cnt.value = sec.count;
      cnt.title = '题量';
      cnt.onchange = function () { sec.count = Math.max(1, Number(cnt.value) || 1); };

      var sc = document.createElement('input');
      sc.type = 'number'; sc.min = 1; sc.max = 50; sc.value = sec.score;
      sc.title = '每题分值';
      sc.onchange = function () { sec.score = Math.max(1, Number(sc.value) || 1); };

      var del = document.createElement('button');
      del.className = 'sec-del'; del.textContent = '×'; del.title = '删除大题';
      del.onclick = function () { state.sections.splice(i, 1); renderSections(); };

      row.appendChild(sel); row.appendChild(cnt); row.appendChild(sc); row.appendChild(del);
      box.appendChild(row);
    });
  }

  /* ---------- 生成 ---------- */
  function buildPaper(seed) {
    var diff = diffSpec();
    var secs = state.sections.map(function (s, i) {
      var sec = {
        type: s.type,
        count: s.count,
        score: s.score,
        title: CN_NUM[i] + '、' + typeName(s.type) + '（每题 ' + s.score + ' 分，共 ' + s.count + ' 题）'
      };
      if (diff.diff) sec.diff = diff.diff;
      else sec.diffMix = diff.diffMix;
      return sec;
    });
    if (!secs.length) { alert('至少设置一个大题'); return; }

    var bp = {
      subject: state.subject,
      stage: state.stage,
      grade: state.grade,
      term: state.term,
      version: 'rjb',
      title: gradeLabel(state.grade) + (state.term === 2 ? '下册' : '上册') + ' · ' + subjectName() + '练习卷',
      seed: seed,
      sections: secs,
      kps: Object.keys(state.kps)
    };

    state.paperDiffLabel = diff.label;
    try {
      state.paper = Paper.generatePaper(bp);
    } catch (e) {
      alert('生成失败：' + e.message);
      return;
    }
    // 生成即入库：整卷题目写入错题本记录（去重，按题干指纹）
    if (KB.WrongBook) {
      var kpNames = {}, d = stageData();
      Object.keys(d.kpMap).forEach(function (k) { kpNames[k] = d.kpMap[k].name; });
      KB.WrongBook.recordPaper(state.paper, { kpNames: kpNames });
      refreshWrongCount();
    }
    renderPaper();
    renderMeta();
  }

  /* ---------- 渲染：试卷 ---------- */
  function buildPaperHTML(mode) {
    var p = state.paper;
    var M = (mode === 'word') ? KB.MathRender.word : KB.MathRender.html;
    var wbIdx = {};
    if (mode === 'web' && KB.WrongBook) {
      KB.WrongBook.all().forEach(function (it) { wbIdx[it.key] = it; });
    }

    var h = [];
    h.push('<h2 class="title">' + esc(p.title) + '</h2>');
    h.push('<div class="subtitle">' + subjectName() + ' · ' + gradeLabel(p.grade) + ' · ' + (p.term === 2 ? '下册' : '上册') +
      ' · 难度 ' + esc(state.paperDiffLabel || '混合') +
      ' · 满分 ' + p.totalScore + ' 分 · 建议用时 ' + p.duration + ' 分钟</div>');
    h.push('<div class="fill-line"><span>姓名：______________</span><span>班级：______________</span>' +
      '<span>得分：______________</span></div>');

    var lastSection = -1;
    p.questions.forEach(function (q) {
      if (q.sectionIndex !== lastSection) {
        lastSection = q.sectionIndex;
        h.push('<div class="section-title">' + esc(q.sectionTitle || '') + '</div>');
      }
      h.push('<div class="q"><span class="no">' + q.no + '.</span>' + M(q.stem) +
        '<span class="score">（' + q.score + ' 分）</span>' +
        (state.showKp ? '<span class="kp-tag">' + esc(kpName(q.kp)) + '</span>' : ''));
      if (q.opts && q.opts.length) {
        h.push('<div class="opts">' + q.opts.map(function (o) { return '<span>' + M(o) + '</span>'; }).join('') + '</div>');
      }
      var ws = WS_MAP[q.type];
      if (ws) {
        h.push('<div class="ws ' + ws[0] + '" data-label="' + ws[1] + '"></div>');
      }
      if (mode === 'web' && KB.WrongBook) {
        var wk = KB.WrongBook.keyOf(q);
        var rec = wbIdx[wk];
        var ek = encodeURIComponent(wk);
        h.push('<span class="q-act">' +
          '<button class="act wrong' + (rec && rec.result === 'wrong' ? ' on' : '') + '" data-k="' + ek + '" title="记为错题">✗</button>' +
          '<button class="act ok' + (rec && rec.result === 'right' ? ' on' : '') + '" data-k="' + ek + '" title="标记已掌握">✓</button>' +
          '</span>');
      }
      h.push('</div>');
    });

    if (state.showAnswer) {
      h.push('<div class="answers"><h3>参考答案与解析</h3>');
      p.questions.forEach(function (q) {
        h.push('<div class="ans-item"><b>' + q.no + '.</b> ' + M(q.answer) +
          (q.analysis ? ' <span class="ana">' + M(q.analysis).replace(/\n/g, '<br>') + '</span>' : '') + '</div>');
      });
      h.push('</div>');
    }
    return h.join('');
  }

  function renderPaper() {
    var p = state.paper;
    var el = $('#paper');
    if (!p || !p.questions.length) {
      el.className = 'paper empty';
      el.innerHTML = '<div class="empty-inner"><div class="empty-icon">📄</div><h3>没有生成出题目</h3><p>试试多选几个知识点，或换一种题型。</p></div>';
      return;
    }
    el.className = 'paper';
    el.innerHTML = buildPaperHTML('web');
  }

  function kpName(id) {
    var d = stageData();
    return d.kpMap[id] ? d.kpMap[id].name : id;
  }

  function renderMeta() {
    var p = state.paper, bar = $('#metaBar');
    if (!p) { bar.innerHTML = ''; return; }
    var diffNames = ['', '易', '较易', '中', '较难', '难'];
    var chips = [];
    [1, 2, 3, 4, 5].forEach(function (d) {
      var n = p.meta.byDiff[d] || 0;
      if (n) chips.push('<span class="bar"><i style="height:' + Math.min(14, 3 + n * 2) + 'px;width:' + Math.min(28, 6 + n * 2) + 'px"></i></span><span>' + diffNames[d] + ' ' + n + '</span>');
    });
    bar.innerHTML =
      '<span>题量 <b>' + p.questions.length + '</b></span>' +
      '<span>总分 <b>' + p.totalScore + '</b></span>' +
      '<span>知识点 <b>' + p.meta.kpCount + '</b></span>' +
      '<span>难度 <b>' + esc(state.paperDiffLabel || '混合') + '</b> ' + chips.join(' ') + '</span>' +
      (p.meta.requested !== p.questions.length ? '<span style="color:#c2410c">⚠ 计划 ' + p.meta.requested + ' 题，实际生成 ' + p.questions.length + ' 题</span>' : '');
  }

  /* ---------- 导出 ---------- */
  function paperHTML() {
    return $('#paper').innerHTML;
  }

  function exportWord() {
    if (!state.paper) return alert('先生成一份试卷');
    var css = 'body{font-family:"宋体",serif;font-size:12pt;line-height:1.9}' +
      'h2.title{text-align:center;font-size:16pt}' +
      '.subtitle{text-align:center;font-size:9pt;color:#666}' +
      '.fill-line{text-align:center;font-size:10pt;margin:10pt 0}' +
      '.section-title{font-weight:bold;margin:12pt 0 6pt}' +
      '.q{margin:0 0 8pt}' +
      '.q .ws{height:80pt;border:1px dashed #999;margin:4pt 0}' +
      '.q .ws-vertical{height:160pt}' +
      '.q .ws-calc{height:100pt}' +
      '.q .ws-app{height:130pt}' +
      '.q .ws-proof{height:150pt}' +
      '.q .ws-short{height:110pt}' +
      '.opts span{display:inline-block;min-width:120pt}' +
      '.q .kp-tag{color:#0e6b5c;font-size:8pt}' +
      '.answers{page-break-before:always;border-top:1pt solid #000;padding-top:8pt}' +
      '.ans-item{font-size:10pt;margin-bottom:4pt}.ana{color:#666}';
    var html = '<html xmlns:o="urn:schemas-microsoft-com:office:office" ' +
      'xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">' +
      '<head><meta charset="utf-8"><title>' + state.paper.title + '</title>' +
      '<style>' + css + '</style></head><body>' + buildPaperHTML('word') + '</body></html>';
    var blob = new Blob(['\ufeff' + html], { type: 'application/msword' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = state.paper.title.replace(/[\\/:*?"<>|]/g, '_') + '.doc';
    a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 3000);
  }

  function copyText() {
    if (!state.paper) return alert('先生成一份试卷');
    var p = state.paper, lines = [];
    lines.push(p.title);
    lines.push('（满分 ' + p.totalScore + ' 分，建议用时 ' + p.duration + ' 分钟）');
    lines.push('');
    var lastSection = -1;
    p.questions.forEach(function (q) {
      if (q.sectionIndex !== lastSection) { lastSection = q.sectionIndex; lines.push(q.sectionTitle || ''); }
      lines.push(q.no + '. ' + KB.MathRender.plain(q.stem) + (q.opts && q.opts.length ? '  ' + q.opts.map(function (o) { return KB.MathRender.plain(o); }).join('   ') : ''));
    });
    if (state.showAnswer) {
      lines.push('', '参考答案：');
      p.questions.forEach(function (q) { lines.push(q.no + '. ' + KB.MathRender.plain(q.answer)); });
    }
    var txt = lines.join('\n');
    if (navigator.clipboard) {
      navigator.clipboard.writeText(txt).then(function () { alert('已复制到剪贴板'); },
        function () { fallbackCopy(txt); });
    } else fallbackCopy(txt);
  }
  function fallbackCopy(txt) {
    var ta = document.createElement('textarea');
    ta.value = txt; document.body.appendChild(ta); ta.select();
    try { document.execCommand('copy'); alert('已复制到剪贴板'); } catch (e) { alert('复制失败，请手动选择文本'); }
    document.body.removeChild(ta);
  }

  /* ---------- 统计 ---------- */
  function renderStats() {
    var bank = 0;
    SUBJECTS.forEach(function (s) {
      Object.keys(s.stages).forEach(function (st) {
        (s.stages[st].kps || []).forEach(function () { bank++; });
      });
    });
    var gen = 0;
    Generators.stats().forEach(function (x) { gen += x.kps; });
    $('#statBank').textContent = '知识点 ' + bank;
    $('#statGen').textContent = '已覆盖 ' + gen;
    var build = window.KB_BUILD;
    $('#ver').textContent = 'v' + KB.version + (build ? ' · ' + build.revision.slice(0, 7) : '');
    $('#ver').title = build ? '构建版本 ' + build.revision : '未构建的开发版本';
  }

  /* ---------- 事件 ---------- */
  function bind() {
    $('#gradeSel').onchange = function (e) {
      state.grade = Number(e.target.value);
      state.kps = {};
      renderKpList();
    };
    $('#termSel').onchange = function (e) {
      state.term = Number(e.target.value);
      state.kps = {};
      renderKpList();
    };
    $('#kpAll').onclick = function () {
      var supported = Generators.support(state.subject, state.stage) || [];
      var d = stageData();
      Object.keys(d.kpMap).forEach(function (kid) {
        if (supported.indexOf(kid) >= 0) state.kps[kid] = true;
      });
      renderKpList();
    };
    $('#kpNone').onclick = function () { state.kps = {}; renderKpList(); };

    $('#addSection').onclick = function () {
      state.sections.push({ type: typePool()[0], count: 5, score: 5 });
      renderSections();
    };

    $('#btnBuild').onclick = function () { buildPaper(); };
    $('#btnShuffle').onclick = function () { buildPaper(); };
    $('#chkAnswer').onchange = function (e) { state.showAnswer = e.target.checked; renderPaper(); };
    $('#chkKpTag').onchange = function (e) { state.showKp = e.target.checked; renderPaper(); };
    $('#btnWord').onclick = exportWord;
    $('#btnTxt').onclick = copyText;
    $('#btnPrint').onclick = function () { window.print(); };

    // 错题本
    $('#btnWrong').onclick = openWrong;
    $('#wbClose').onclick = closeWrong;
    $('#wrongModal').onclick = function (e) { if (e.target.id === 'wrongModal') closeWrong(); };
    Array.prototype.forEach.call(document.querySelectorAll('.modal-tabs .tab'), function (t) {
      t.onclick = function () {
        Array.prototype.forEach.call(document.querySelectorAll('.modal-tabs .tab'), function (x) { x.classList.remove('on'); });
        t.classList.add('on');
        wbTab = t.getAttribute('data-tab');
        renderWrong();
      };
    });
    $('#wbClear').onclick = function () {
      if (confirm('确定清空错题本？所有记录都会被删除。')) {
        KB.WrongBook.clear(); refreshWrongCount(); renderWrong();
      }
    };
    $('#wbBuild').onclick = buildFromWeak;
    $('#wbBody').addEventListener('click', function (e) {
      var b = e.target.closest ? e.target.closest('.wb-rm') : null;
      if (!b) return;
      KB.WrongBook.remove(decodeURIComponent(b.getAttribute('data-k')));
      refreshWrongCount(); renderWrong();
    });
    $('#paper').addEventListener('click', function (e) {
      var b = e.target.closest ? e.target.closest('.act') : null;
      if (!b) return;
      var k = decodeURIComponent(b.getAttribute('data-k'));
      var isWrong = b.classList.contains('wrong');
      var group = b.parentNode;
      if (b.classList.contains('on')) {
        KB.WrongBook.mark(k, null);
        b.classList.remove('on');
      } else {
        KB.WrongBook.mark(k, isWrong ? true : false);
        Array.prototype.forEach.call(group.children, function (x) { x.classList.remove('on'); });
        b.classList.add('on');
      }
      refreshWrongCount();
    });
  }

  /* ---------- 错题本 ---------- */
  var wbTab = 'wrong';

  function refreshWrongCount() {
    if (!KB.WrongBook) return;
    var c = KB.WrongBook.counts();
    var el = $('#wrongCount');
    if (el) el.textContent = c.wrong;
  }

  function openWrong() {
    $('#wrongModal').style.display = 'flex';
    renderWrong();
  }
  function closeWrong() { $('#wrongModal').style.display = 'none'; }

  function renderWrong() {
    var body = $('#wbBody');
    var c = KB.WrongBook.counts();
    $('#wbSummary').textContent = '共记录 ' + c.total + ' 题 · 错题 ' + c.wrong + ' 题';

    if (wbTab === 'weak') {
      var weak = KB.WrongBook.weakKps();
      if (!weak.length) { body.innerHTML = '<div class="wb-empty">还没有错题。在试卷上点 ✗ 标记错题后，这里会按知识点统计薄弱项。</div>'; return; }
      var max = weak[0].wrong || 1;
      body.innerHTML = weak.map(function (w) {
        return '<div class="wb-weak-row">' +
          '<span class="wb-weak-name">' + esc(w.name) + '<span style="color:#a3b0ac;font-size:11px"> · ' + esc(w.subject) + '/' + esc(w.stage) + '</span></span>' +
          '<span class="wb-weak-bar"><i style="width:' + Math.round(w.wrong / max * 100) + '%"></i></span>' +
          '<span class="wb-weak-n">' + w.wrong + ' 错</span></div>';
      }).join('');
      return;
    }

    var list = wbTab === 'wrong' ? KB.WrongBook.wrongList() : KB.WrongBook.all();
    if (!list.length) {
      body.innerHTML = '<div class="wb-empty">' + (wbTab === 'wrong'
        ? '还没有错题。在试卷上把做错的题点一下 ✗，就会出现在这里。'
        : '还没有记录。生成任意一份试卷后，题目会自动入库。') + '</div>';
      return;
    }
    body.innerHTML = list.map(function (it) {
      var ek = encodeURIComponent(it.key);
      return '<div class="wb-item">' +
        '<div class="wb-stem">' + KB.MathRender.html(it.stem) + '</div>' +
        (it.opts ? '<div class="wb-ops">' + it.opts.map(function (o) { return '<span class="mini">' + KB.MathRender.html(o) + '</span>'; }).join('') + '</div>' : '') +
        '<div class="wb-meta">' +
        '<span>' + esc(it.kpName || it.kp) + '</span>' +
        '<span>出现 ' + it.seen + ' 次</span>' +
        (it.wrong ? '<span>错 <b>' + it.wrong + '</b></span>' : '') +
        (it.result === 'right' ? '<span style="color:#0e6b5c">已掌握</span>' : '') +
        '<span style="margin-left:auto">' +
        '<button class="mini wb-rm" data-k="' + ek + '">移除</button></span>' +
        '</div></div>';
    }).join('');
  }

  function buildFromWeak() {
    var weak = KB.WrongBook.weakKps();
    if (!weak.length) { alert('还没有错题。先在试卷上点 ✗ 标记几道错题。'); return; }
    var top = weak[0];
    var same = weak.filter(function (w) { return w.subject === top.subject && w.stage === top.stage; }).slice(0, 6);

    if (state.subject !== top.subject || state.stage !== top.stage) {
      state.subject = top.subject;
      state.stage = top.stage;
      state.grade = firstGrade(top.stage);
      state.term = 1;
    }
    state.kps = {};
    same.forEach(function (w) { state.kps[w.kp] = true; });
    state.sections = presetFor().slice();
    renderAll();
    closeWrong();
    buildPaper();
  }

  /* ---------- 启动 ---------- */
  function renderAll() {
    renderSubjects(); renderStages(); renderGrades(); renderDiff(); renderKpList(); renderSections();
  }

  // 支持通过 URL 预选：index.html?subject=physics&stage=junior&grade=8&term=1
  (function initFromQuery() {
    try {
      var q = new URLSearchParams(location.search);
      var subj = q.get('subject'), stage = q.get('stage'), grade = q.get('grade'), term = q.get('term');
      if (subj && Registry.SUBJECTS[subj]) {
        state.subject = subj;
        var sts = stageStages(subj);
        state.stage = (stage && Registry.SUBJECTS[subj].stages[stage]) ? stage : sts[0];
        state.grade = grade ? Number(grade) : firstGrade(state.stage);
        state.term = term ? Number(term) : 1;
      }
    } catch (e) { /* 忽略 */ }
  })();

  state.sections = presetFor().slice();
  renderAll();
  renderStats();
  bind();
  buildPaper('demo-seed-1');
  refreshWrongCount();

  window.__KB_STATE__ = state;
})();



