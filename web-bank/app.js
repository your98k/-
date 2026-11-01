/* 组卷台工作台。出题仍走本地生成器或个人 API，不连接自建后端。 */
(function () {
  'use strict';

  var Registry = KB.Registry;
  var Paper = KB.Paper;
  var Schema = KB.Schema;
  var Generators = KB.Generators;
  var A = KB.Adapter;
  var Motion = KB.Motion;
  var $ = function (s) { return document.querySelector(s); };
  var $$ = function (s, root) { return Array.prototype.slice.call((root || document).querySelectorAll(s)); };

  var THEMES = {
    math: { icon: '∑', hint: '理科思维 · 公式渲染已启用', primary: '#10b981', dark: '#059669', soft: 'rgba(16,185,129,.16)', header: 'linear-gradient(135deg,#0b4636 0%,#0f5c46 55%,#0a3a2d 100%)' },
    physics: { icon: '⚛', hint: '物理公式与实验题已启用', primary: '#0ea5e9', dark: '#0284c7', soft: 'rgba(14,165,233,.16)', header: 'linear-gradient(135deg,#0c3b5e 0%,#075985 55%,#082f49 100%)' },
    chemistry: { icon: '⚗', hint: '化学方程式与实验题已启用', primary: '#8b5cf6', dark: '#7c3aed', soft: 'rgba(139,92,246,.16)', header: 'linear-gradient(135deg,#3b0764 0%,#5b21b6 55%,#2e1065 100%)' },
    english: { icon: 'Aa', hint: '语法词汇与阅读题已启用', primary: '#6366f1', dark: '#4f46e5', soft: 'rgba(99,102,241,.16)', header: 'linear-gradient(135deg,#1e1b4b 0%,#3730a3 55%,#312e81 100%)' },
    chinese: { icon: '文', hint: '古诗文与语言文字题已启用', primary: '#f43f5e', dark: '#e11d48', soft: 'rgba(244,63,94,.16)', header: 'linear-gradient(135deg,#4c0519 0%,#9f1239 55%,#881337 100%)' }
  };
  var TYPE_SETS = {
    primaryMath: ['oral', 'vertical', 'calc', 'simple', 'equation', 'fill', 'judge', 'choice', 'estimate', 'error', 'app'],
    general: ['choice', 'fill', 'judge', 'calc', 'solve', 'app', 'experiment', 'short', 'cloze', 'translation'],
    chinese: ['choice', 'fill', 'judge', 'short', 'translation'],
    english: ['choice', 'fill', 'cloze', 'translation']
  };
  var PRESET = {
    primary: [
      { type: 'oral', count: 10, score: 2 }, { type: 'vertical', count: 4, score: 4 },
      { type: 'fill', count: 6, score: 2 }, { type: 'choice', count: 5, score: 2 }, { type: 'app', count: 4, score: 5 }
    ],
    general: [
      { type: 'choice', count: 10, score: 3 }, { type: 'fill', count: 8, score: 3 },
      { type: 'calc', count: 6, score: 5 }, { type: 'solve', count: 4, score: 8 }
    ],
    chinese: [
      { type: 'choice', count: 8, score: 3 }, { type: 'fill', count: 8, score: 3 }, { type: 'short', count: 4, score: 6 }
    ],
    english: [
      { type: 'choice', count: 10, score: 2 }, { type: 'fill', count: 8, score: 2 }, { type: 'translation', count: 4, score: 5 }
    ]
  };
  var WS_MAP = {
    vertical: ['ws-vertical', '竖式'], calc: ['ws-calc', '计算'], simple: ['ws-calc', '简算'],
    equation: ['ws-calc', '解方程'], error: ['ws-calc', '改正'], app: ['ws-app', '解答'],
    solve: ['ws-app', '解答'], proof: ['ws-proof', '证明'], experiment: ['ws-proof', '实验'],
    short: ['ws-short', '作答'], translation: ['ws-short', '翻译']
  };
  var DIFF_OPTIONS = [
    { id: 'mix', name: '混合' }, { id: 'basic', name: '基础' }, { id: 'medium', name: '中等' },
    { id: 'advanced', name: '提高' }, { id: 'custom', name: '自定义' }
  ];
  var DIFF_COLORS = ['#10b981', '#84cc16', '#f59e0b', '#f97316', '#f43f5e'];
  var SAMPLES = [
    { label: '示例1: 三角形内角和', kw: '三角形内角', subject: 'math', stage: 'junior', text: '已知在 △ABC 中，∠A = 50°，∠B 比 ∠C 大 20°，求 ∠B 和 ∠C 的度数。' },
    { label: '示例2: 因式分解', kw: '因式分解', subject: 'math', stage: 'junior', text: '分解因式：x² + 5x + 6。' },
    { label: '示例3: 物理压强', kw: '压强', subject: 'physics', stage: 'junior', text: '一个重 400N 的物体放在水平地面上，与地面接触面积为 0.1m²，求物体对地面的压强。' }
  ];
  var SHARE_KEY = 'kb.shares.v1';
  var SUBJECTS = Registry.subjects();

  var state = {
    subject: 'math', stage: 'junior', grade: 8, term: 1, crossGrade: false,
    kps: {}, collapsed: {}, kpSearch: '', sections: [], paper: null,
    showAnswer: true, showKp: false, showSeal: true, darkPaper: false,
    difficulty: 'mix', diffMin: 2, diffMax: 4, customKind: 'range',
    weights: [20, 30, 30, 15, 5], source: 'local', aiController: null,
    mode: 'paper', theme: 'dark', wbTab: 'wrong', stackOpen: false,
    exam: blankExam(45), editing: -1, studioKp: ''
  };
  var rollApi = null;
  var wheelApi = null;

  function blankExam(mins) {
    return { left: (mins || 45) * 60, running: false, timer: null, answers: {}, self: {}, submitted: false, pen: '#10b981', scratch: false, report: null };
  }
  function esc(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function toast(msg, tone) {
    var el = document.createElement('div');
    el.className = 'toast' + (tone ? ' ' + tone : '');
    el.textContent = msg;
    $('#toasts').appendChild(el);
    setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, tone === 'rose' ? 4600 : 2400);
  }
  function stars(diff) {
    var s = '', i;
    for (i = 1; i <= 5; i++) s += i <= diff ? '★' : '☆';
    return s;
  }
  function typeName(t) { return (Schema.TYPES[t] && Schema.TYPES[t].name) || t; }
  function stageData() { return Registry.SUBJECTS[state.subject].stages[state.stage]; }
  function stageList(subject) {
    var s = Registry.SUBJECTS[subject];
    return Object.keys(s.stages).filter(function (k) { return s.stages[k].kps && s.stages[k].kps.length; });
  }
  function firstGrade(stage) {
    var d = Registry.SUBJECTS[state.subject].stages[stage];
    var keys = Object.keys(d.grades || {}).sort(function (a, b) { return Number(a.slice(1)) - Number(b.slice(1)); });
    return keys.length ? Number(keys[0].slice(1)) : 7;
  }
  function gradeNumbers() {
    var d = stageData();
    return Object.keys(d.grades || {}).map(function (k) { return Number(k.slice(1)); })
      .sort(function (a, b) { return a - b; });
  }
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
  function clonePreset() {
    return presetFor().map(function (s) { return { type: s.type, count: s.count, score: s.score }; });
  }
  function supportList() { return Generators.support(state.subject, state.stage) || []; }
  function selectableId(id) {
    if (state.source === 'ai') return true;
    return supportList().indexOf(id) >= 0;
  }
  function chapterPool() {
    return A.filterChapters(A.chaptersFromStage(stageData()), {
      grade: state.grade, term: state.term, crossGrade: state.crossGrade
    });
  }
  function railPool() {
    return A.filterChapters(A.chaptersFromStage(stageData()), {
      grade: state.grade, term: state.term, crossGrade: false
    });
  }
  function kpName(id, subject, stage) {
    var d = Registry.SUBJECTS[subject || state.subject].stages[stage || state.stage];
    return d && d.kpMap[id] ? d.kpMap[id].name : id;
  }
  function chapterTitle(id, subject, stage) {
    var d = Registry.SUBJECTS[subject || state.subject].stages[stage || state.stage];
    if (!d || !d.kpMap[id]) return '';
    var ch = d.chapters[d.kpMap[id].chapter];
    return ch ? ch.name : '';
  }
  function planTotals() {
    return state.sections.reduce(function (acc, sec) {
      acc.n += Number(sec.count) || 0;
      acc.s += (Number(sec.count) || 0) * (Number(sec.score) || 0);
      return acc;
    }, { n: 0, s: 0 });
  }
  function defaultKps() {
    var ids = [];
    chapterPool().forEach(function (ch) {
      ch.topics.forEach(function (topic) { if (selectableId(topic.id)) ids.push(topic.id); });
    });
    return ids;
  }
  function chosenKps() {
    var ids = Object.keys(state.kps).filter(selectableId);
    return ids.length ? ids : defaultKps();
  }

  function toastPaper(label) {
    var p = state.paper;
    if (!p) return;
    toast('已生成 ' + p.questions.length + ' 题 · ' + (label || ''));
  }

  function applyTheme() {
    var t = THEMES[state.subject] || THEMES.math;
    var root = document.documentElement;
    root.classList.toggle('light', state.theme === 'light');
    root.style.setProperty('--theme-primary', t.primary);
    root.style.setProperty('--theme-primary-dark', t.dark);
    root.style.setProperty('--theme-primary-soft', t.soft);
    root.style.setProperty('--header-bg', t.header);
    $('#themeIcon').textContent = state.theme === 'light' ? '🌙' : '☀';
    var hint = $('#subjectHint');
    if (hint) hint.textContent = t.icon + ' ' + t.hint;
    try { localStorage.setItem('kb.theme.v1', state.theme); } catch (e) { /* 隐私模式忽略 */ }
  }

  function renderSource() {
    var ai = state.source === 'ai';
    $('#modeLocal').classList.toggle('on', !ai);
    $('#modeAI').classList.toggle('on', ai);
    $('#modeLocal').setAttribute('aria-pressed', String(!ai));
    $('#modeAI').setAttribute('aria-pressed', String(ai));
    $('#sourceHint').textContent = ai
      ? '按所选知识点调用你的个人 API 生成原创题，不是最新真题。最多 40 题，答案请自行核验。'
      : '本地模板随机出题，无需联网、不产生 API 费用。';
    $('#btnBuildLabel').textContent = ai ? 'AI 生成试卷' : '智能生成试卷';
    var mobile = document.querySelector('#btnBuildMobile .btn-label');
    if (mobile) mobile.textContent = ai ? 'AI 生成' : '生成试卷';
  }

  function renderSubjects() {
    var box = $('#subjectChips');
    box.innerHTML = '';
    SUBJECTS.forEach(function (s) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'chip' + (s.id === state.subject ? ' on' : '');
      b.textContent = s.name;
      b.addEventListener('click', function () { setSubject(s.id); });
      box.appendChild(b);
    });
  }
  function renderStages() {
    var box = $('#stageChips');
    box.innerHTML = '';
    stageList(state.subject).forEach(function (st) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'chip' + (st === state.stage ? ' on' : '');
      b.textContent = Registry.SUBJECTS[state.subject].stages[st].name;
      b.addEventListener('click', function () {
        state.stage = st;
        state.grade = firstGrade(st);
        state.term = 1;
        state.kps = {};
        state.sections = clonePreset();
        renderAll();
      });
      box.appendChild(b);
    });
  }
  function renderGrades() {
    var grades = gradeNumbers();
    if (grades.indexOf(state.grade) < 0) state.grade = grades[0] || 7;
    $('#termSel').value = String(state.term);
    var host = $('#gradeWheel');
    host.innerHTML = '';
    wheelApi = Motion.wheel(host, {
      items: grades.map(function (g) { return { value: g, label: A.gradeLabel(g) }; }),
      value: state.grade,
      onChange: function (g) {
        if (state.aiController) return;
        if (Number(g) === Number(state.grade)) return;
        state.grade = Number(g);
        state.kps = {};
        renderRail();
        renderKp();
      }
    });
  }

  function paintDiff() {
    var view = A.difficultyView(state);
    $('#diffCoef').textContent = view.text;
    var bar = $('#diffBar');
    bar.innerHTML = '';
    view.weights.forEach(function (w, i) {
      if (w <= 0) return;
      var seg = document.createElement('i');
      seg.style.width = w + '%';
      seg.style.background = DIFF_COLORS[i];
      bar.appendChild(seg);
    });
    var legend = $('#diffLegend');
    legend.innerHTML = '';
    A.DIFF_NAMES.forEach(function (name, i) {
      var n = Math.round(view.weights[i]);
      if (!n) return;
      var span = document.createElement('span');
      span.innerHTML = '<b style="color:' + DIFF_COLORS[i] + '">' + name + '</b> ' + n + '%';
      legend.appendChild(span);
    });
  }
  function renderDiff() {
    var box = $('#diffChips');
    box.innerHTML = '';
    DIFF_OPTIONS.forEach(function (d) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'chip' + (state.difficulty === d.id ? ' on' : '');
      b.textContent = d.name;
      b.addEventListener('click', function () {
        state.difficulty = d.id;
        if (d.id !== 'custom') state.customKind = 'range';
        renderDiff();
      });
      box.appendChild(b);
    });
    var custom = $('#diffCustom');
    custom.hidden = state.difficulty !== 'custom';
    if (! $('#diffMin').options.length) {
      A.DIFF_NAMES.forEach(function (name, i) {
        ['diffMin', 'diffMax'].forEach(function (id) {
          var o = document.createElement('option');
          o.value = String(i + 1);
          o.textContent = name;
          $('#' + id).appendChild(o);
        });
      });
    }
    $('#diffMin').value = String(state.diffMin);
    $('#diffMax').value = String(state.diffMax);
    var sliders = $('#diffSliders');
    sliders.innerHTML = '';
    state.weights.forEach(function (w, i) {
      var row = document.createElement('label');
      row.className = 'slider-row';
      row.innerHTML = '<span>' + A.DIFF_NAMES[i] + '</span>';
      var input = document.createElement('input');
      input.type = 'range'; input.min = '0'; input.max = '100'; input.step = '5';
      input.value = String(w);
      input.addEventListener('input', function () {
        state.weights[i] = Number(input.value);
        state.customKind = 'weights';
        row.querySelector('em').textContent = input.value;
        paintDiff();
      });
      var em = document.createElement('em');
      em.textContent = String(w);
      row.appendChild(input);
      row.appendChild(em);
      sliders.appendChild(row);
    });
    paintDiff();
  }

  function renderRail() {
    var cards = railPool().map(function (ch) {
      return { id: ch.id, title: ch.title, kicker: A.gradeLabel(ch.grade) + ' · ' + A.termLabel(ch.term) };
    });
    Motion.snapRail($('#chapterRail'), {
      cards: cards,
      onSettle: function (_index, card) {
        if (!card) return;
        state.collapsed[card.id] = false;
        renderKp();
        var node = document.getElementById('ch-' + card.id);
        if (node && node.scrollIntoView) {
          node.scrollIntoView({ block: 'nearest', behavior: Motion.reduced() ? 'auto' : 'smooth' });
        }
      }
    });
  }

  function updateMeter() {
    var total = 0, picked = 0;
    chapterPool().forEach(function (ch) {
      ch.topics.forEach(function (topic) {
        if (!selectableId(topic.id)) return;
        total += 1;
        if (state.kps[topic.id]) picked += 1;
      });
    });
    document.documentElement.style.setProperty('--kp-progress', total ? String(picked / total) : '0');
    Motion.setRing($('#kpRing'), total ? picked / total : 0);
    if (!rollApi) rollApi = Motion.roll($('#kpRoll'));
    rollApi.set(picked);
    $('#kpCount').textContent = picked ? ('已选 ' + picked + ' / ' + total) : '未选（用本年级全部）';
  }
  function renderKp() {
    var box = $('#kpList');
    box.innerHTML = '';
    var list = A.searchChapters(chapterPool(), state.kpSearch);
    if (!list.length) {
      box.innerHTML = '<div class="empty">没有匹配的章节</div>';
      updateMeter();
      return;
    }
    list.forEach(function (ch) {
      var wrap = document.createElement('div');
      wrap.className = 'kp-ch';
      wrap.id = 'ch-' + ch.id;
      var title = document.createElement('div');
      title.className = 'kp-ch-title';
      var toggle = document.createElement('button');
      toggle.type = 'button';
      toggle.textContent = (state.collapsed[ch.id] ? '▸ ' : '▾ ') + ch.title;
      var allOn = ch.topics.filter(function (t) { return selectableId(t.id); })
        .every(function (t) { return state.kps[t.id]; });
      var boxInput = document.createElement('input');
      boxInput.type = 'checkbox';
      boxInput.checked = allOn && ch.topics.some(function (t) { return selectableId(t.id); });
      boxInput.addEventListener('change', function () {
        ch.topics.forEach(function (t) {
          if (!selectableId(t.id)) return;
          if (boxInput.checked) state.kps[t.id] = true;
          else delete state.kps[t.id];
        });
        renderKp();
      });
      toggle.addEventListener('click', function () {
        state.collapsed[ch.id] = !state.collapsed[ch.id];
        renderKp();
      });
      title.appendChild(boxInput);
      title.appendChild(toggle);
      wrap.appendChild(title);
      if (!state.collapsed[ch.id]) {
        ch.topics.forEach(function (topic) {
          var ok = selectableId(topic.id);
          var label = document.createElement('label');
          label.className = 'kp-row' + (ok ? '' : ' pending');
          var cb = document.createElement('input');
          cb.type = 'checkbox';
          cb.checked = !!state.kps[topic.id];
          cb.disabled = !ok;
          cb.addEventListener('change', function () {
            if (cb.checked) state.kps[topic.id] = true;
            else delete state.kps[topic.id];
            updateMeter();
          });
          label.appendChild(cb);
          label.appendChild(document.createTextNode(topic.name + (ok ? '' : '（暂无生成器）')));
          wrap.appendChild(label);
        });
      }
      box.appendChild(wrap);
    });
    updateMeter();
  }

  function renderSections() {
    var box = $('#sectionEditor');
    box.innerHTML = '';
    var pool = typePool();
    state.sections.forEach(function (sec, i) {
      if (pool.indexOf(sec.type) < 0) sec.type = pool[0];
      var row = document.createElement('div');
      row.className = 'sec-row';
      var sel = document.createElement('select');
      sel.className = 'sel';
      sel.setAttribute('aria-label', '大题题型');
      pool.forEach(function (t) {
        var o = document.createElement('option');
        o.value = t; o.textContent = typeName(t);
        if (t === sec.type) o.selected = true;
        sel.appendChild(o);
      });
      sel.addEventListener('change', function () { sec.type = sel.value; });
      var cnt = document.createElement('input');
      cnt.className = 'text'; cnt.type = 'number'; cnt.min = '1'; cnt.max = '60'; cnt.value = sec.count;
      cnt.setAttribute('aria-label', '题量');
      cnt.addEventListener('change', function () {
        sec.count = Math.max(1, Math.min(60, Number(cnt.value) || 1));
        cnt.value = sec.count;
        renderPlan();
      });
      var sc = document.createElement('input');
      sc.className = 'text'; sc.type = 'number'; sc.min = '1'; sc.max = '50'; sc.value = sec.score;
      sc.setAttribute('aria-label', '单题分值');
      sc.addEventListener('change', function () {
        sec.score = Math.max(1, Math.min(50, Number(sc.value) || 1));
        sc.value = sec.score;
        renderPlan();
      });
      var del = document.createElement('button');
      del.type = 'button'; del.className = 'sec-del'; del.textContent = '×'; del.title = '删除大题';
      del.addEventListener('click', function () {
        state.sections.splice(i, 1);
        renderSections();
      });
      row.appendChild(sel); row.appendChild(cnt); row.appendChild(sc); row.appendChild(del);
      box.appendChild(row);
    });
    renderPlan();
  }
  function renderPlan() {
    var t = planTotals();
    $('#planCount').textContent = t.n;
    $('#planScore').textContent = t.s;
    $('#mobileCount').textContent = t.n;
    $('#mobileScore').textContent = t.s;
  }
  function renderStats() {
    var bank = 0, gen = 0;
    SUBJECTS.forEach(function (s) {
      Object.keys(s.stages).forEach(function (st) {
        bank += (s.stages[st].kps || []).length;
      });
    });
    Generators.stats().forEach(function (x) { gen += x.kps; });
    $('#headerTotalKp').textContent = bank;
    $('#headerCoveredKp').textContent = gen;
    var build = window.KB_BUILD;
    $('#ver').textContent = 'v' + (KB.version || '2');
    $('#ver').title = build ? ('构建 ' + build.revision) : '';
  }

  function setSubject(id) {
    state.subject = id;
    var stages = stageList(id);
    if (stages.indexOf(state.stage) < 0) state.stage = stages[0];
    state.grade = firstGrade(state.stage);
    state.term = 1;
    state.kps = {};
    state.sections = clonePreset();
    renderAll();
  }
  function setSource(source) {
    if (state.aiController) return;
    state.source = source;
    if (source === 'local') {
      var ok = supportList();
      Object.keys(state.kps).forEach(function (id) { if (ok.indexOf(id) < 0) delete state.kps[id]; });
    }
    renderSource();
    renderKp();
  }

  function renderAll() {
    applyTheme();
    renderSource();
    renderSubjects();
    renderStages();
    renderGrades();
    renderDiff();
    renderRail();
    renderKp();
    renderSections();
    renderStats();
  }

  function autoTitle() {
    var book = state.term === 0 ? '全学年' : (state.term === 2 ? '下册' : '上册');
    return A.gradeLabel(state.grade) + book + ' · ' + Registry.SUBJECTS[state.subject].name + '练习卷';
  }
  function blueprint(seed) {
    var spec = A.difficultySpec(state);
    var term = state.term === 0 ? 1 : state.term;
    var title = (state.paper && state.paper.meta && state.paper.meta.titleEdited && state.paper.title)
      ? state.paper.title : autoTitle();
    return {
      subject: state.subject, stage: state.stage, grade: state.grade, term: term, version: 'rjb',
      title: title, seed: seed, kps: chosenKps(),
      sections: state.sections.map(function (s, i) {
        var sec = {
          type: s.type, count: s.count, score: s.score,
          title: (A.CN[i] || (i + 1)) + '、' + typeName(s.type) + '（每题 ' + s.score + ' 分，共 ' + s.count + ' 题）'
        };
        if (spec.diff) sec.diff = spec.diff.slice();
        else sec.diffMix = spec.diffMix.slice();
        return sec;
      })
    };
  }

  function setAIBusy(busy) {
    $('#conditionFields').disabled = busy;
    ['btnBuild', 'btnBuildMobile', 'btnShuffle', 'wbBuild', 'pwaUpdateApply'].forEach(function (id) {
      var el = $('#' + id);
      if (el) el.disabled = busy;
    });
    $$('.ai-replace').forEach(function (button) { button.disabled = busy; });
    $('#aiProgress').hidden = !busy;
    if (busy) $('#aiProgressText').textContent = '正在请求 AI；原试卷会保留到整卷生成成功。';
  }
  function resetExam() {
    if (state.exam.timer) clearInterval(state.exam.timer);
    var mins = state.paper && state.paper.duration ? state.paper.duration : 45;
    var pen = state.exam.pen;
    state.exam = blankExam(mins);
    state.exam.pen = pen;
  }
  function commitPaper(paper, label) {
    state.paper = paper;
    paper.meta = paper.meta || {};
    paper.meta.diffLabel = label;
    paper.meta.source = paper.meta.source || (state.source === 'ai' ? 'ai' : 'local');
    if (paper.meta.diverged == null) paper.meta.diverged = paper.meta.source === 'ai';
    if (KB.WrongBook) {
      var names = {};
      var d = Registry.SUBJECTS[paper.subject].stages[paper.stage];
      Object.keys(d.kpMap).forEach(function (id) { names[id] = d.kpMap[id].name; });
      KB.WrongBook.recordPaper(paper, { kpNames: names });
      refreshWrongCount();
    }
    resetExam();
    renderMeta();
    renderMode();
  }
  function paperSource(paper) {
    var aiCount = paper.questions.filter(function (q) { return q.source === 'ai'; }).length;
    if (!aiCount) return '本地模板';
    return (aiCount === paper.questions.length ? 'AI 原创' : '含 AI 原创 ' + aiCount + ' 题') + ' · 答案需核验';
  }
  function recount(paper) {
    var byDiff = {}, byType = {}, kps = {};
    paper.questions.forEach(function (q, i) {
      q.no = i + 1;
      byDiff[q.diff] = (byDiff[q.diff] || 0) + 1;
      byType[q.type] = (byType[q.type] || 0) + 1;
      kps[q.kp] = 1;
    });
    paper.totalScore = paper.questions.reduce(function (s, q) { return s + (Number(q.score) || 0); }, 0);
    paper.meta = paper.meta || {};
    paper.meta.generated = paper.questions.length;
    paper.meta.kpCount = Object.keys(kps).length;
    paper.meta.byDiff = byDiff;
    paper.meta.byType = byType;
    if (!paper.meta.requested) paper.meta.requested = paper.questions.length;
  }
  function markDiverged() {
    if (!state.paper) return;
    state.paper.meta = state.paper.meta || {};
    state.paper.meta.diverged = true;
  }
  function groupsOf(paper) {
    var groups = [], map = {};
    (paper.questions || []).forEach(function (q) {
      var key = q.sectionIndex == null ? 0 : q.sectionIndex;
      if (!map[key]) {
        map[key] = { index: key, title: q.sectionTitle || ('第 ' + (groups.length + 1) + ' 部分'), questions: [] };
        groups.push(map[key]);
      }
      map[key].questions.push(q);
    });
    return groups;
  }

  async function buildPaper(seed, opts) {
    opts = opts || {};
    if (state.aiController) return;
    if (!state.sections.length) { toast('至少设置一个大题', 'rose'); return; }
    var kps = chosenKps();
    if (!kps.length) { toast('当前范围没有可出的知识点', 'rose'); return; }
    var diff = A.difficultySpec(state);
    var bp = blueprint(seed);
    if (state.paper && state.paper.title && !opts.keepTitle) {
      /* 新卷使用当前条件标题，除非分享还原指定了标题 */
    }
    if (opts.title) bp.title = opts.title;
    var total = planTotals().n;
    if (state.source === 'local' || opts.forceLocal) {
      try {
        var paper = Paper.generatePaper(bp);
        paper.meta = paper.meta || {};
        paper.meta.source = 'local';
        paper.meta.diverged = false;
        commitPaper(paper, diff.label);
        if (opts.celebrate) Motion.celebrate(opts.button || $('#btnBuild'));
        else if (!opts.quiet) toastPaper(diff.label);
      } catch (error) { toast('生成失败：' + error.message, 'rose'); }
      return;
    }
    if (total > 40) { toast('AI 每份试卷最多 40 题，请减少题量', 'rose'); return; }
    var config = null;
    try { config = KB.AI.validateConfig(KB.AISettings.read()); }
    catch (e) { KB.AISettings.open(); return; }
    var controller = new AbortController();
    state.aiController = controller;
    setAIBusy(true);
    try {
      var saved = KB.WrongBook ? KB.WrongBook.all().slice(0, 160) : [];
      var excludes = saved.concat(state.paper ? state.paper.questions : [])
        .map(function (q) { return q.stem; })
        .filter(function (stem) { return typeof stem === 'string' && stem.length <= 1200; })
        .slice(-200);
      var aiPaper = await KB.AI.generatePaper(bp, config, {
        signal: controller.signal,
        excludeStems: excludes,
        onProgress: function (progress) {
          $('#aiProgressText').textContent = 'AI 已完成 ' + progress.completed + ' / ' + progress.total +
            ' 题，已发起 ' + progress.requests + ' 次请求。取消后，已发出的请求仍可能计费。';
        }
      });
      if (!controller.signal.aborted) {
        commitPaper(aiPaper, diff.label);
        if (opts.celebrate) Motion.celebrate(opts.button || $('#btnBuild'));
      }
    } catch (error) {
      if (!controller.signal.aborted) toast('AI 生成失败，原试卷已保留。' + error.message, 'rose');
    } finally {
      state.aiController = null;
      setAIBusy(false);
    }
  }

  function makeQuestion(spec) {
    var gen = Generators.get(spec.subject, spec.stage);
    if (!gen) return null;
    var rng = KB.RNG.create(spec.seed || ('q-' + Date.now() + '-' + Math.random()));
    var i;
    for (i = 0; i < 24; i++) {
      try {
        var raw = gen.generate({
          subject: spec.subject, stage: spec.stage, grade: spec.grade, term: spec.term || 1,
          kp: spec.kp, type: spec.type, diff: spec.diff || 3, rng: rng
        });
        var norm = Schema.normalize(raw);
        if (!norm.ok) continue;
        if (spec.avoid && norm.question.stem === spec.avoid) continue;
        norm.question.score = spec.score || Schema.defaultScore(norm.question.type);
        return norm.question;
      } catch (e) { /* 换参数再试 */ }
    }
    return null;
  }
  function takeSlot(next, prev) {
    next.score = prev.score;
    next.no = prev.no;
    next.sectionIndex = prev.sectionIndex;
    next.sectionTitle = prev.sectionTitle;
    next.subject = prev.subject;
    next.stage = prev.stage;
    next.grade = prev.grade;
    next.term = prev.term;
    return next;
  }
  function replaceLocal(index) {
    var q = state.paper.questions[index];
    var made = makeQuestion({
      subject: q.subject, stage: q.stage, grade: q.grade || state.grade,
      term: q.term || (state.term || 1), kp: q.kp, type: q.type, diff: q.diff,
      score: q.score, avoid: q.stem
    });
    if (!made) { toast('没有换出另一道同考点题', 'amber'); return; }
    state.paper.questions[index] = takeSlot(made, q);
    markDiverged();
    recount(state.paper);
    renderMeta();
    renderMode();
    toast('已换一道同考点题');
  }
  async function replaceAI(index) {
    if (state.aiController || !state.paper) return;
    var old = state.paper.questions[index];
    var config;
    try { config = KB.AI.validateConfig(KB.AISettings.read()); }
    catch (e) { KB.AISettings.open(); return; }
    var controller = new AbortController();
    state.aiController = controller;
    setAIBusy(true);
    try {
      var replacement = await KB.AI.generatePaper({
        subject: old.subject, stage: old.stage, grade: old.grade, term: old.term,
        version: state.paper.version, title: state.paper.title, kps: [old.kp],
        sections: [{ type: old.type, count: 1, score: old.score, diff: [old.diff, old.diff], title: old.sectionTitle }]
      }, config, { signal: controller.signal });
      if (controller.signal.aborted) return;
      var next = replacement.questions[0];
      var duplicate = state.paper.questions.some(function (q, i) {
        return i !== index && q.stem.replace(/\s+/g, '') === next.stem.replace(/\s+/g, '');
      });
      if (duplicate || old.stem.replace(/\s+/g, '') === next.stem.replace(/\s+/g, '')) {
        throw new Error('新题与本卷已有题目重复');
      }
      state.paper.questions[index] = takeSlot(next, old);
      state.paper.questions[index].source = 'ai';
      markDiverged();
      recount(state.paper);
      if (KB.WrongBook) KB.WrongBook.recordPaper(state.paper, {});
      renderMeta();
      renderMode();
      toast('已用 AI 换题，请核验答案');
    } catch (error) {
      if (!controller.signal.aborted) toast('换题失败，原题已保留。' + error.message, 'rose');
    } finally {
      state.aiController = null;
      setAIBusy(false);
    }
  }
  function moveQuestion(index, dir) {
    var qs = state.paper.questions;
    var j = index + dir;
    if (j < 0 || j >= qs.length) return;
    if (qs[j].sectionIndex !== qs[index].sectionIndex) return;
    var tmp = qs[index];
    qs[index] = qs[j];
    qs[j] = tmp;
    markDiverged();
    recount(state.paper);
    renderMode();
  }
  function ensurePaper() {
    if (state.paper) return;
    state.paper = {
      title: A.gradeLabel(state.grade) + '练习卷',
      subject: state.subject, stage: state.stage, grade: state.grade,
      term: state.term === 0 ? 1 : state.term, version: 'rjb', seed: 'manual',
      duration: 40, questions: [], totalScore: 0,
      meta: { requested: 0, generated: 0, failures: [], kpCount: 0, byType: {}, byDiff: {}, source: 'local', diverged: true, diffLabel: '自定义' }
    };
  }
  function insertQuestions(list) {
    ensurePaper();
    var si = state.paper.questions.reduce(function (m, q) { return Math.max(m, q.sectionIndex || 0); }, -1) + 1;
    list.forEach(function (q) {
      q.sectionIndex = si;
      q.sectionTitle = '变式巩固';
      q.score = q.score || 5;
      q.subject = q.subject || state.subject;
      q.stage = q.stage || state.stage;
      state.paper.questions.push(q);
    });
    markDiverged();
    recount(state.paper);
    state.paper.duration = Math.max(20, Math.round(state.paper.totalScore * 0.9));
    renderMeta();
    renderMode();
    toast('已插入 ' + list.length + ' 道变式');
  }

  function renderMeta() {
    var p = state.paper;
    var bar = $('#metaBar');
    if (!p) { bar.textContent = '还没有试卷'; return; }
    var warn = p.meta && p.meta.requested && p.meta.requested !== p.questions.length
      ? ' · 计划 ' + p.meta.requested + ' 题，实际 ' + p.questions.length + ' 题' : '';
    bar.innerHTML = '总题量 <b>' + p.questions.length + '</b> 题 · 满分 <b>' + p.totalScore +
      '</b> 分 · 覆盖考点 <b>' + (p.meta.kpCount || 0) + '</b> 个 · ' + esc(paperSource(p)) +
      ' · 难度 ' + esc(p.meta.diffLabel || '') + esc(warn);
  }

  function toolButton(label, act, index, extra) {
    return '<button type="button" data-act="' + act + '" data-i="' + index + '"' + (extra || '') + '>' + label + '</button>';
  }
  function renderPaper() {
    var host = $('#viewPaper');
    var p = state.paper;
    if (!p || !p.questions.length) {
      host.innerHTML = '<div class="empty">还没有试卷。选好学科和年级后点「生成试卷」。</div>';
      return;
    }
    var M = KB.MathRender.html;
    var wb = {};
    if (KB.WrongBook) KB.WrongBook.all().forEach(function (it) { wb[it.key] = it; });
    var groups = groupsOf(p);
    var head = '<div class="a4' + (state.darkPaper ? ' paper-dark' : '') + '" id="printableArea"><div class="seal"' +
      (state.showSeal ? '' : ' hidden') + '><span>学校________ 班级________ 姓名________ 考号________</span>' +
      '<span>密封线内不要答题</span></div><div class="paper-body">';
    head += '<p class="paper-tip note no-print">点击标题可改卷名。悬停题目可换题、变式、编辑或调整顺序。</p>';
    head += '<h2 class="paper-title serif" id="paperTitle" contenteditable="true" spellcheck="false">' + esc(p.title) + '</h2>';
    head += '<p class="paper-sub">' + esc(Registry.SUBJECTS[p.subject].name) + ' · ' + esc(A.gradeLabel(p.grade)) + ' · ' +
      esc(p.term === 2 ? '下册' : '上册') + ' · 难度 ' + esc(p.meta.diffLabel || '混合') + ' · 满分 ' + p.totalScore +
      ' 分 · 建议用时 ' + p.duration + ' 分钟</p>';
    head += '<p class="paper-source">来源：' + esc(paperSource(p)) + '</p>';
    if (state.showSeal) {
      head += '<div class="paper-tools"><div>注意事项：答卷前写清密封线内信息，并在指定区域作答。</div><table class="score-table"><tr><th>题号</th>';
      groups.forEach(function (_g, i) { head += '<th>' + esc(A.CN[i] || (i + 1)) + '</th>'; });
      head += '<th>总分</th></tr><tr><td>得分</td>';
      groups.forEach(function () { head += '<td>&nbsp;</td>'; });
      head += '<td>&nbsp;</td></tr></table></div>';
    }
    groups.forEach(function (g) {
      head += '<h3 class="section-title">' + esc(g.title) + '</h3>';
      g.questions.forEach(function (q) {
        var index = p.questions.indexOf(q);
        var key = KB.WrongBook ? KB.WrongBook.keyOf(q) : '';
        var rec = wb[key];
        head += '<article class="q"><div class="q-top"><span class="no">' + q.no + '.</span><div><div>' + M(q.stem) +
          '<span class="score">（' + q.score + ' 分）</span>';
        if (state.showKp) {
          head += '<span class="kp-tag">' + esc(kpName(q.kp, q.subject, q.stage)) + '</span>';
          head += '<span class="diff-tag">' + esc(A.DIFF_NAMES[(q.diff || 3) - 1] || '') + ' ' + stars(q.diff || 3) + '</span>';
        }
        head += '</div>';
        if (q.opts && q.opts.length) {
          head += '<div class="opts">' + q.opts.map(function (o) { return '<span>' + M(o) + '</span>'; }).join('') + '</div>';
        }
        var ws = WS_MAP[q.type];
        if (ws) head += '<div class="ws ' + ws[0] + '" data-label="' + ws[1] + '"></div>';
        head += '<div class="q-tools no-print">';
        head += toolButton('换同考点', 'swap', index);
        head += toolButton('变式', 'variant', index);
        if (q.source === 'ai') head += toolButton('AI 换题', 'ai', index, ' class="ai-replace"');
        head += toolButton('编辑', 'edit', index);
        head += toolButton('上移', 'up', index);
        head += toolButton('下移', 'down', index);
        head += toolButton('错题', 'wrong', index, ' class="danger' + (rec && rec.result === 'wrong' ? ' on' : '') + '"');
        head += toolButton('掌握', 'right', index, ' class="ok' + (rec && rec.result === 'right' ? ' on' : '') + '"');
        head += '</div></div></div></article>';
      });
    });
    if (state.showAnswer) {
      head += '<div class="answers"><h3>参考答案与解析</h3>';
      p.questions.forEach(function (q) {
        head += '<div class="ans-item"><b>' + q.no + '.</b> ' + M(q.answer) +
          (q.analysis ? ' <span class="ana">' + M(q.analysis) + '</span>' : '') + '</div>';
      });
      head += '</div>';
    }
    head += '</div></div>';
    host.innerHTML = head;
    var title = $('#paperTitle');
    if (title) title.addEventListener('blur', function () {
      var text = title.textContent.replace(/\s+/g, ' ').trim().slice(0, 80);
      if (!text) text = p.title;
      if (text !== p.title) {
        p.meta.titleEdited = true;
        markDiverged();
      }
      p.title = text;
      title.textContent = text;
    });
  }

  function renderSheet() {
    var host = $('#viewSheet');
    var p = state.paper;
    if (!p || !p.questions.length) { host.innerHTML = '<div class="empty">生成试卷后这里会出现答题卡。</div>'; return; }
    var html = '<div class="sheet"><div class="marks"><i class="mark"></i><i class="mark"></i></div>';
    html += '<h2 class="serif">标准化答题卡</h2><p class="paper-sub">' + esc(p.title) + '</p>';
    html += '<p class="note">姓名________ 班级________ 考号________ 。选择题涂黑选项，其余题写在横线区。此卡由浏览器排版，打印即可当 PDF。</p>';
    html += '<div class="omr">';
    var c, n;
    for (c = 0; c < 8; c++) {
      html += '<div>';
      for (n = 0; n <= 9; n++) html += '<div class="bubble">' + n + '</div>';
      html += '</div>';
    }
    html += '</div>';
    groupsOf(p).forEach(function (g) {
      html += '<h3>' + esc(g.title) + '</h3>';
      g.questions.forEach(function (q) {
        html += '<div class="q"><b>' + q.no + '.</b> ';
        if (q.opts && q.opts.length && (q.type === 'choice' || q.type === 'multi' || q.type === 'cloze' || q.type === 'judge')) {
          var letters = q.type === 'judge' ? ['√', '×'] : q.opts.map(function (_o, i) { return String.fromCharCode(65 + i); });
          letters.forEach(function (letter) { html += '<span class="bubble">' + letter + '</span>'; });
        } else {
          html += '<div class="ws ws-short" data-label="作答"></div>';
        }
        html += '</div>';
      });
    });
    html += '<div class="marks"><i class="mark"></i><i class="mark"></i></div></div>';
    host.innerHTML = html;
  }

  function fmtTime(sec) {
    sec = Math.max(0, sec | 0);
    var m = Math.floor(sec / 60), s = sec % 60;
    return (m < 10 ? '0' : '') + m + ':' + (s < 10 ? '0' : '') + s;
  }
  function renderExam() {
    var host = $('#viewExam');
    var p = state.paper;
    if (!p || !p.questions.length) { host.innerHTML = '<div class="empty">生成试卷后可以在这里限时作答。</div>'; return; }
    var html = '<div class="exam-bar"><div class="export-row"><span class="timer" id="examClock">' + fmtTime(state.exam.left) +
      '</span><button class="btn" type="button" id="examToggle">' + (state.exam.running ? '暂停' : '开始') +
      '</button><button class="btn" type="button" id="examReset">重置</button></div><div class="export-row">' +
      '<button class="btn" type="button" id="examScratch">' + (state.exam.scratch ? '收起草稿纸' : '草稿纸') +
      '</button><button class="btn primary" type="button" id="examSubmit">交卷批改</button></div></div>';
    if (state.exam.report) {
      var r = state.exam.report;
      html += '<div class="report"><b>得分 ' + r.score + ' / ' + r.full + '</b><p class="note">客观题按规范化文本比对。解答题用你填的自评分。错题已记入错题本。</p></div>';
    }
    html += '<div class="exam-q-list">';
    p.questions.forEach(function (q, index) {
      html += '<article class="exam-q"><div><b>' + q.no + '.</b> ' + KB.MathRender.html(q.stem) + '（' + q.score + ' 分）</div>';
      if (q.type === 'choice' || q.type === 'cloze' || q.type === 'multi') {
        (q.opts || []).forEach(function (opt, i) {
          var letter = String.fromCharCode(65 + i);
          var on = state.exam.answers[q.id] === letter || (q.type === 'multi' && String(state.exam.answers[q.id] || '').indexOf(letter) >= 0);
          html += '<button type="button" class="opt-btn' + (on ? ' on' : '') + '" data-exam="' + index + '" data-letter="' + letter + '">' + KB.MathRender.html(opt) + '</button>';
        });
      } else if (q.type === 'judge') {
        ['√', '×'].forEach(function (letter) {
          var on = state.exam.answers[q.id] === letter;
          html += '<button type="button" class="opt-btn' + (on ? ' on' : '') + '" data-exam="' + index + '" data-letter="' + letter + '">' + letter + '</button>';
        });
      } else {
        html += '<textarea class="sel" data-exam-text="' + index + '" rows="3" placeholder="写下答案或关键步骤">' + esc(state.exam.answers[q.id] || '') + '</textarea>';
        if (!objective(q)) {
          html += '<label class="note">自评分 <input class="text" style="width:72px;padding-left:8px" type="number" min="0" max="' + q.score + '" data-self="' + index + '" value="' + (state.exam.self[q.id] == null ? '' : state.exam.self[q.id]) + '"></label>';
        }
      }
      if (state.exam.submitted && state.showAnswer) {
        html += '<p class="note">参考答案：' + KB.MathRender.html(q.answer) + '</p>';
      }
      html += '</article>';
    });
    html += '</div>';
    html += '<div class="scratch" id="scratchPad"' + (state.exam.scratch ? '' : ' hidden') + '><div class="split"><b>草稿纸</b><div class="export-row">';
    ['#10b981', '#f59e0b', '#f43f5e', '#e2e8f0'].forEach(function (color) {
      html += '<button type="button" class="pen' + (state.exam.pen === color ? ' on' : '') + '" data-pen="' + color + '" style="background:' + color + '"></button>';
    });
    html += '<button type="button" class="mini" id="scratchClear">清空</button></div></div><div class="scratch-board"><canvas id="scratchCanvas"></canvas></div></div>';
    host.innerHTML = html;
    bindScratch();
  }
  function bindScratch() {
    var canvas = $('#scratchCanvas');
    if (!canvas) return;
    var board = canvas.parentNode;
    var dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = board.clientWidth * dpr;
    canvas.height = 420 * dpr;
    canvas.style.height = '420px';
    var ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    var drawing = false;
    function pos(e) {
      var rect = canvas.getBoundingClientRect();
      return { x: e.clientX - rect.left, y: e.clientY - rect.top };
    }
    canvas.addEventListener('pointerdown', function (e) {
      drawing = true;
      canvas.setPointerCapture(e.pointerId);
      var p = pos(e);
      ctx.strokeStyle = state.exam.pen;
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
    });
    canvas.addEventListener('pointermove', function (e) {
      if (!drawing) return;
      var events = e.getCoalescedEvents ? e.getCoalescedEvents() : [e];
      events.forEach(function (ev) {
        var p = pos(ev);
        ctx.lineTo(p.x, p.y);
      });
      ctx.stroke();
    });
    function end() { drawing = false; }
    canvas.addEventListener('pointerup', end);
    canvas.addEventListener('pointercancel', end);
  }
  function startTimer() {
    if (state.exam.timer) return;
    state.exam.timer = setInterval(function () {
      if (!state.exam.running) return;
      state.exam.left = Math.max(0, state.exam.left - 1);
      var clock = $('#examClock');
      if (clock) clock.textContent = fmtTime(state.exam.left);
      if (state.exam.left <= 0) {
        state.exam.running = false;
        submitExam();
      }
    }, 1000);
  }
  function objective(q) {
    return q.type === 'choice' || q.type === 'multi' || q.type === 'cloze' || q.type === 'judge' || q.type === 'fill' || q.type === 'oral';
  }
  function submitExam() {
    var p = state.paper;
    if (!p) return;
    state.exam.submitted = true;
    state.exam.running = false;
    var score = 0, full = p.totalScore;
    p.questions.forEach(function (q) {
      var got = 0;
      if (objective(q)) {
        if (A.answersMatch(q.type, q.answer, state.exam.answers[q.id])) got = q.score;
      } else {
        var self = Number(state.exam.self[q.id]);
        if (!isFinite(self) || self < 0) self = 0;
        got = Math.min(q.score, self);
      }
      score += got;
      var answered = state.exam.answers[q.id] != null && String(state.exam.answers[q.id]).trim() !== '';
      var graded = objective(q) ? answered : state.exam.self[q.id] != null && state.exam.self[q.id] !== '';
      if (got < q.score && graded && KB.WrongBook) KB.WrongBook.mark(KB.WrongBook.keyOf(q), true);
    });
    state.exam.report = { score: score, full: full };
    refreshWrongCount();
    renderMode();
    toast('批改完成：' + score + ' / ' + full);
  }

  function renderBlueprint() {
    var host = $('#viewBlueprint');
    var p = state.paper;
    if (!p || !p.questions.length) { host.innerHTML = '<div class="empty">生成试卷后这里会列出双向细目表。</div>'; return; }
    var diffs = [0, 0, 0, 0, 0];
    var types = {};
    var cogn = {};
    p.questions.forEach(function (q) {
      diffs[(q.diff || 3) - 1] += q.score;
      var name = typeName(q.type);
      types[name] = (types[name] || 0) + q.score;
      var c = A.cognitiveOf(q);
      cogn[c] = (cogn[c] || 0) + q.score;
    });
    function bars(map) {
      var max = 0;
      Object.keys(map).forEach(function (k) { max = Math.max(max, map[k]); });
      return Object.keys(map).map(function (k) {
        var w = max ? Math.round(map[k] / max * 100) : 0;
        return '<div class="bar-row"><span>' + esc(k) + '</span><span><i style="width:' + w + '%"></i></span><b>' + map[k] + '</b></div>';
      }).join('');
    }
    var diffMap = {};
    A.DIFF_NAMES.forEach(function (name, i) { if (diffs[i]) diffMap[name] = diffs[i]; });
    var html = '<div class="bp-grid"><section class="card"><h3 class="kicker">难度分值</h3>' + bars(diffMap) +
      '</section><section class="card"><h3 class="kicker">题型分值</h3>' + bars(types) +
      '</section><section class="card"><h3 class="kicker">认知层次</h3>' + bars(cogn) + '</section></div>';
    html += '<section class="card"><div class="split"><div><h3>命题双向细目表</h3><p class="note">认知层次由难度估算：易为识记，中档为应用，较难及以上为综合。用时按分值估算。</p></div>' +
      '<button class="btn" type="button" id="btnCsv">导出 CSV</button></div><div class="table-wrap"><table class="data"><thead><tr>' +
      '<th>题号</th><th>题型</th><th>章节</th><th>知识点</th><th>认知层次</th><th>难度</th><th>分值</th><th>预估用时</th></tr></thead><tbody>';
    p.questions.forEach(function (q) {
      html += '<tr><td>' + q.no + '</td><td>' + esc(typeName(q.type)) + '</td><td>' + esc(chapterTitle(q.kp, q.subject, q.stage)) +
        '</td><td>' + esc(kpName(q.kp, q.subject, q.stage)) + '</td><td>' + esc(A.cognitiveOf(q)) + '</td><td>' +
        esc(A.DIFF_NAMES[(q.diff || 3) - 1] || '') + '</td><td>' + q.score + '</td><td>' + A.estMinutes(q) + ' 分钟</td></tr>';
    });
    html += '</tbody></table></div></section>';
    host.innerHTML = html;
  }
  function exportCsv() {
    var p = state.paper;
    if (!p) return;
    var lines = ['题号,题型,章节,知识点,认知层次,难度,分值,预估用时'];
    p.questions.forEach(function (q) {
      var cells = [q.no, typeName(q.type), chapterTitle(q.kp, q.subject, q.stage), kpName(q.kp, q.subject, q.stage),
        A.cognitiveOf(q), A.DIFF_NAMES[(q.diff || 3) - 1] || '', q.score, A.estMinutes(q)];
      lines.push(cells.map(function (cell) { return '"' + String(cell).replace(/"/g, '""') + '"'; }).join(','));
    });
    var blob = new Blob(['\ufeff' + lines.join('\n')], { type: 'text/csv;charset=utf-8' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = (p.title || '细目表') + '.csv';
    a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 1500);
  }

  function renderMode() {
    if (state.mode === 'paper') renderPaper();
    else if (state.mode === 'sheet') renderSheet();
    else if (state.mode === 'exam') renderExam();
    else renderBlueprint();
  }
  function setMode(mode, x, y) {
    state.mode = mode;
    $$('#modeBar .mode-tab').forEach(function (btn) {
      btn.classList.toggle('on', btn.getAttribute('data-mode') === mode);
    });
    [['paper', 'viewPaper'], ['sheet', 'viewSheet'], ['exam', 'viewExam'], ['blueprint', 'viewBlueprint']].forEach(function (pair) {
      var el = document.getElementById(pair[1]);
      var on = pair[0] === mode;
      el.hidden = !on;
      el.classList.toggle('is-active', on);
    });
    renderMode();
    Motion.reveal($('#viewHost'), x, y);
  }

  function exportWord() {
    if (!state.paper) return toast('先生成一份试卷', 'amber');
    var p = state.paper;
    var M = KB.MathRender.word;
    var html = '<h2 style="text-align:center">' + esc(p.title) + '</h2>';
    html += '<p style="text-align:center">' + esc(paperSource(p)) + ' · 满分 ' + p.totalScore + ' 分</p>';
    var last = null;
    p.questions.forEach(function (q) {
      if (q.sectionIndex !== last) { last = q.sectionIndex; html += '<p><b>' + esc(q.sectionTitle || '') + '</b></p>'; }
      html += '<p>' + q.no + '. ' + M(q.stem) + '（' + q.score + '分）</p>';
      if (q.opts && q.opts.length) html += '<p>' + q.opts.map(function (o) { return M(o); }).join('&nbsp;&nbsp;') + '</p>';
      var ws = WS_MAP[q.type];
      if (ws) html += '<p style="border:1px dashed #999;height:90px">' + ws[1] + '</p>';
    });
    if (state.showAnswer) {
      html += '<h3>参考答案</h3>';
      p.questions.forEach(function (q) { html += '<p>' + q.no + '. ' + M(q.answer) + '</p>'; });
    }
    var doc = '<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word"><head><meta charset="utf-8"></head><body>' + html + '</body></html>';
    var blob = new Blob(['\ufeff' + doc], { type: 'application/msword' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = p.title.replace(/[\\/:*?"<>|]/g, '_') + '.doc';
    a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 2000);
  }
  function copyText() {
    if (!state.paper) return toast('先生成一份试卷', 'amber');
    var p = state.paper, lines = [p.title, '来源：' + paperSource(p), ''];
    var last = null;
    p.questions.forEach(function (q) {
      if (q.sectionIndex !== last) { last = q.sectionIndex; lines.push(q.sectionTitle || ''); }
      lines.push(q.no + '. ' + KB.MathRender.plain(q.stem));
    });
    if (state.showAnswer) {
      lines.push('', '参考答案');
      p.questions.forEach(function (q) { lines.push(q.no + '. ' + KB.MathRender.plain(q.answer)); });
    }
    var txt = lines.join('\n');
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(txt).then(function () { toast('已复制全卷'); }, function () { fallbackCopy(txt); });
    } else fallbackCopy(txt);
  }
  function fallbackCopy(txt) {
    var ta = document.createElement('textarea');
    ta.value = txt;
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); toast('已复制全卷'); }
    catch (e) { toast('复制失败，请手动选择文本', 'rose'); }
    document.body.removeChild(ta);
  }

  function findKp(keyword) {
    var subjects = SUBJECTS;
    var i, j, d, ids, kp;
    for (i = 0; i < subjects.length; i++) {
      var stages = stageList(subjects[i].id);
      for (j = 0; j < stages.length; j++) {
        d = Registry.SUBJECTS[subjects[i].id].stages[stages[j]];
        ids = Object.keys(d.kpMap);
        for (var k = 0; k < ids.length; k++) {
          kp = d.kpMap[ids[k]];
          if (kp.name.indexOf(keyword) >= 0 || keyword.indexOf(kp.name) >= 0) {
            return { subject: subjects[i].id, stage: stages[j], kp: kp };
          }
        }
      }
    }
    return null;
  }
  function runStudio() {
    var text = $('#studioText').value.trim();
    var kw = state.studioKp || text.slice(0, 12);
    var found = findKp(kw) || findKp(text.slice(0, 8));
    if (!found) { toast('没有匹配到考点，换一个示例或关键词', 'amber'); return; }
    if (found.subject !== state.subject || found.stage !== state.stage) {
      state.subject = found.subject;
      state.stage = found.stage;
      state.grade = found.kp.grade || firstGrade(found.stage);
      state.term = found.kp.term || 1;
      state.kps = {};
      state.sections = clonePreset();
      renderAll();
    }
    var type = typePool().indexOf('choice') >= 0 ? 'choice' : typePool()[0];
    var made = [1, 3, 5].map(function (diff, i) {
      var q = makeQuestion({
        subject: found.subject, stage: found.stage, grade: found.kp.grade, term: found.kp.term,
        kp: found.kp.id, type: type, diff: diff, seed: 'var-' + diff + '-' + i + '-' + Date.now()
      });
      if (q) q.variantNote = ['基础巩固', '条件变化', '综合提高'][i];
      return q;
    }).filter(Boolean);
    var out = $('#studioOut');
    if (!made.length) { out.innerHTML = '<p class="note">这个考点暂时生成不出变式。</p>'; return; }
    out.innerHTML = made.map(function (q, i) {
      return '<article class="variant"><b>' + esc(q.variantNote) + ' · ' + esc(found.kp.name) + '</b><div>' +
        KB.MathRender.html(q.stem) + '</div><p class="note">答案：' + KB.MathRender.html(q.answer) +
        '</p><button type="button" class="btn" data-insert="' + i + '">插入试卷</button></article>';
    }).join('') + '<button type="button" class="btn primary" id="studioInsertAll">全部插入</button>';
    out._qs = made;
  }

  function refreshWrongCount() {
    if (!KB.WrongBook) return;
    $('#wrongCount').textContent = KB.WrongBook.counts().wrong;
  }
  function renderWrong() {
    var body = $('#wbBody');
    var c = KB.WrongBook.counts();
    $('#wbSummary').textContent = '共记录 ' + c.total + ' 题 · 错题 ' + c.wrong + ' 题';
    if (state.wbTab === 'weak') {
      var weak = KB.WrongBook.weakKps();
      if (!weak.length) { body.innerHTML = '<div class="empty">还没有错题。做题时点「错题」，这里会按知识点汇总。</div>'; return; }
      var max = weak[0].wrong || 1;
      body.innerHTML = weak.map(function (w) {
        return '<div class="weak-row"><span style="flex:1">' + esc(w.name) + '</span><span class="weak-bar"><i style="width:' +
          Math.round(w.wrong / max * 100) + '%"></i></span><b>' + w.wrong + '</b></div>';
      }).join('');
      return;
    }
    if (state.wbTab === 'session') {
      var session = state.paper ? state.paper.questions : [];
      if (!session.length) { body.innerHTML = '<div class="empty">这次还没有生成试卷。</div>'; return; }
      body.innerHTML = session.map(function (q) {
        return '<article class="wb-card"><div>' + KB.MathRender.html(q.stem) + '</div><div class="wb-meta"><span>第 ' + q.no +
          ' 题</span><span>' + esc(kpName(q.kp, q.subject, q.stage)) + '</span></div></article>';
      }).join('');
      return;
    }
    var list = state.wbTab === 'wrong' ? KB.WrongBook.wrongList() : KB.WrongBook.all();
    if (!list.length) {
      body.innerHTML = '<div class="empty">' + (state.wbTab === 'wrong' ? '还没有错题。' : '生成试卷后，题目会记在这里。') + '</div>';
      return;
    }
    var cards = list.map(function (it) {
      return '<article class="wb-card stack-card"><div>' + KB.MathRender.html(it.stem) + '</div><div class="wb-meta"><span>' +
        esc(it.kpName || it.kp) + '</span><span>' + (it.source === 'ai' ? 'AI 原创' : '本地模板') + '</span><span>出现 ' + it.seen +
        ' 次</span>' + (it.wrong ? '<span>错 ' + it.wrong + '</span>' : '') +
        '<button type="button" class="mini stack-ignore wb-rm" data-k="' + encodeURIComponent(it.key) + '">移除</button></div></article>';
    }).join('');
    if (state.wbTab === 'wrong' && list.length >= 2) {
      body.innerHTML = '<div class="stack' + (state.stackOpen ? ' is-open' : '') + '"><button type="button" class="btn stack-toggle" data-stack-toggle="1">' +
        (state.stackOpen ? '收起错题叠卡' : '错题叠卡 · ' + list.length + ' 张 · 点按展开') +
        '</button><div class="stack-stage">' + cards + '</div></div>';
      var stackEl = body.querySelector('.stack');
      Motion.stack(stackEl);
      stackEl.addEventListener('click', function () {
        state.stackOpen = stackEl.classList.contains('is-open');
        var toggle = stackEl.querySelector('[data-stack-toggle]');
        if (toggle) toggle.textContent = state.stackOpen ? '收起错题叠卡' : ('错题叠卡 · ' + list.length + ' 张 · 点按展开');
      });
    } else body.innerHTML = cards;
  }
  function openModal(id) { $(id).style.display = 'flex'; }
  function closeModal(id) { $(id).style.display = 'none'; }

  function sharePayload() {
    var p = state.paper;
    return {
      v: 1, subject: state.subject, stage: state.stage, grade: state.grade, term: state.term,
      crossGrade: state.crossGrade, difficulty: state.difficulty, diffMin: state.diffMin, diffMax: state.diffMax,
      customKind: state.customKind, weights: state.weights, kps: Object.keys(state.kps),
      sections: state.sections.map(function (s) { return { type: s.type, count: s.count, score: s.score }; }),
      source: state.source, title: p ? p.title : '',
      seed: p && p.meta && !p.meta.diverged ? p.seed : '',
      diverged: !!(p && p.meta && p.meta.diverged)
    };
  }
  function readShares() {
    try { return JSON.parse(localStorage.getItem(SHARE_KEY) || '{}') || {}; }
    catch (e) { return {}; }
  }
  function writeShare(code, payload) {
    var all = readShares();
    var slim = null;
    if (payload.diverged && state.paper) {
      slim = {
        title: state.paper.title, subject: state.paper.subject, stage: state.paper.stage,
        grade: state.paper.grade, term: state.paper.term, duration: state.paper.duration,
        seed: state.paper.seed, totalScore: state.paper.totalScore,
        meta: state.paper.meta,
        questions: state.paper.questions.map(function (q) {
          return {
            id: q.id, no: q.no, subject: q.subject, stage: q.stage, grade: q.grade, term: q.term,
            kp: q.kp, type: q.type, diff: q.diff, stem: q.stem, opts: q.opts, answer: q.answer,
            analysis: q.analysis, score: q.score, sectionIndex: q.sectionIndex, sectionTitle: q.sectionTitle, source: q.source
          };
        })
      };
    }
    all[code] = { payload: payload, paper: slim, at: Date.now() };
    var keys = Object.keys(all).sort(function (a, b) { return all[a].at - all[b].at; });
    keys.slice(0, Math.max(0, keys.length - 20)).forEach(function (k) { delete all[k]; });
    localStorage.setItem(SHARE_KEY, JSON.stringify(all));
  }
  function openShare() {
    if (!state.paper) { toast('先生成一份试卷', 'amber'); return; }
    var payload = sharePayload();
    var code = String(100000 + Math.floor(Math.random() * 900000));
    try { writeShare(code, payload); }
    catch (e) { toast('本机空间不足，只生成了链接', 'amber'); }
    var hash = '#s=' + A.encodeShare(payload);
    var path = location.pathname + location.search.replace(/([?&])code=\d+/, '').replace(/[?&]$/, '');
    var join = path.indexOf('?') >= 0 ? '&' : '?';
    var url = location.origin + path + join + 'code=' + code + hash;
    $('#shareCode').textContent = code;
    $('#shareUrl').value = url;
    $('#shareNote').textContent = payload.diverged
      ? '这套题改过或来自 AI，提取码只在这台设备有效。别的设备打开链接会按条件重新出一份本地卷。'
      : '链接里带有随机种子，别的设备打开后会复现同一套本地题。提取码只是这台设备的快捷方式。';
    var box = $('#shareQr');
    box.innerHTML = '';
    try {
      var qr = qrcode(0, 'M');
      qr.addData(url);
      qr.make();
      box.innerHTML = qr.createSvgTag(4, 2);
    } catch (e) {
      box.textContent = '链接较长，请直接复制。';
    }
    openModal('#shareModal');
  }
  function applyPayload(payload) {
    if (!payload || payload.v !== 1) return false;
    if (!Registry.SUBJECTS[payload.subject]) return false;
    state.subject = payload.subject;
    state.stage = payload.stage;
    state.grade = Number(payload.grade) || state.grade;
    state.term = payload.term === 0 || payload.term === '0' ? 0 : Number(payload.term) || 1;
    state.crossGrade = !!payload.crossGrade;
    state.difficulty = payload.difficulty || 'mix';
    state.diffMin = payload.diffMin || 2;
    state.diffMax = payload.diffMax || 4;
    state.customKind = payload.customKind || 'range';
    if (Array.isArray(payload.weights) && payload.weights.length === 5) state.weights = payload.weights.slice();
    state.kps = {};
    (payload.kps || []).forEach(function (id) { state.kps[id] = true; });
    if (Array.isArray(payload.sections) && payload.sections.length) {
      state.sections = payload.sections.map(function (s) {
        return { type: s.type, count: s.count, score: s.score };
      });
    }
    state.source = payload.source === 'ai' ? 'ai' : 'local';
    $('#chkCross').checked = state.crossGrade;
    return true;
  }

  function markQuestion(index, wrong) {
    if (!KB.WrongBook || !state.paper) return;
    var q = state.paper.questions[index];
    var key = KB.WrongBook.keyOf(q);
    var rec = null;
    KB.WrongBook.all().forEach(function (it) { if (it.key === key) rec = it; });
    var next = wrong ? 'wrong' : 'right';
    if (rec && rec.result === next) KB.WrongBook.mark(key, null);
    else KB.WrongBook.mark(key, wrong);
    refreshWrongCount();
    renderMode();
  }
  function openEdit(index) {
    var q = state.paper.questions[index];
    state.editing = index;
    $('#editStem').value = q.stem || '';
    $('#editOpts').value = (q.opts || []).join('\n');
    $('#editAnswer').value = q.answer || '';
    $('#editScore').value = q.score || 1;
    $('#editAnalysis').value = q.analysis || '';
    openModal('#editModal');
  }
  function saveEdit() {
    var q = state.paper && state.paper.questions[state.editing];
    if (!q) return;
    var draft = {
      id: q.id, subject: q.subject, stage: q.stage, grade: q.grade, term: q.term,
      kp: q.kp, type: q.type, diff: q.diff, version: q.version || 'rjb',
      stem: $('#editStem').value.trim(),
      answer: $('#editAnswer').value.trim(),
      analysis: $('#editAnalysis').value.trim(),
      score: Math.max(1, Math.min(50, Number($('#editScore').value) || q.score))
    };
    var lines = $('#editOpts').value.split(/\n/).map(function (s) { return s.trim(); }).filter(Boolean);
    draft.opts = lines.length ? lines : null;
    var norm = Schema.normalize(draft);
    if (!norm.ok) { toast(norm.errors[0], 'rose'); return; }
    var next = takeSlot(norm.question, q);
    next.analysis = draft.analysis;
    next.score = draft.score;
    next.source = q.source;
    state.paper.questions[state.editing] = next;
    markDiverged();
    recount(state.paper);
    closeModal('#editModal');
    renderMeta();
    renderMode();
    toast('已保存修改');
  }

  function buildFromWeak() {
    if (state.aiController) return;
    var weak = KB.WrongBook.weakKps();
    if (!weak.length) { toast('还没有错题', 'amber'); return; }
    var top = weak[0];
    var same = weak.filter(function (w) { return w.subject === top.subject && w.stage === top.stage; }).slice(0, 6);
    state.subject = top.subject;
    state.stage = top.stage;
    state.grade = firstGrade(top.stage);
    state.term = 1;
    state.kps = {};
    same.forEach(function (w) { state.kps[w.kp] = true; });
    state.sections = clonePreset();
    state.source = 'local';
    renderAll();
    closeModal('#wrongModal');
    buildPaper(undefined, { forceLocal: true, celebrate: true, button: $('#btnBuild') });
  }

  function bind() {
    $('#termSel').addEventListener('change', function () {
      state.term = Number($('#termSel').value);
      state.kps = {};
      renderRail();
      renderKp();
    });
    $('#chkCross').addEventListener('change', function () {
      state.crossGrade = $('#chkCross').checked;
      renderKp();
    });
    $('#diffMin').addEventListener('change', function () {
      state.diffMin = Number($('#diffMin').value);
      if (state.diffMin > state.diffMax) state.diffMax = state.diffMin;
      state.customKind = 'range';
      renderDiff();
    });
    $('#diffMax').addEventListener('change', function () {
      state.diffMax = Number($('#diffMax').value);
      if (state.diffMax < state.diffMin) state.diffMin = state.diffMax;
      state.customKind = 'range';
      renderDiff();
    });
    $('#kpSearch').addEventListener('input', function () {
      state.kpSearch = $('#kpSearch').value;
      $('#kpSearchClear').hidden = !state.kpSearch;
      renderKp();
    });
    $('#kpSearchClear').addEventListener('click', function () {
      $('#kpSearch').value = '';
      state.kpSearch = '';
      $('#kpSearchClear').hidden = true;
      renderKp();
    });
    $('#kpAll').addEventListener('click', function () {
      A.searchChapters(chapterPool(), state.kpSearch).forEach(function (ch) {
        ch.topics.forEach(function (t) { if (selectableId(t.id)) state.kps[t.id] = true; });
      });
      renderKp();
    });
    $('#kpNone').addEventListener('click', function () { state.kps = {}; renderKp(); });
    $('#addSection').addEventListener('click', function () {
      state.sections.push({ type: typePool()[0], count: 5, score: 5 });
      renderSections();
    });
    document.body.addEventListener('click', function (e) {
      var preset = e.target.closest && e.target.closest('[data-preset]');
      if (!preset) return;
      state.sections = A.scaleToScore(clonePreset(), Number(preset.getAttribute('data-preset')));
      renderSections();
      toast('已按 ' + preset.getAttribute('data-preset') + ' 分调整大题');
    });
    $('#modeLocal').addEventListener('click', function () { setSource('local'); });
    $('#modeAI').addEventListener('click', function () { setSource('ai'); });
    $('#btnAISettings').addEventListener('click', function () { KB.AISettings.open(); });
    $('#btnAICancel').addEventListener('click', function () { if (state.aiController) state.aiController.abort(); });
    $('#btnBuild').addEventListener('click', function () { buildPaper(undefined, { celebrate: true, button: $('#btnBuild') }); });
    $('#btnBuildMobile').addEventListener('click', function () { buildPaper(undefined, { celebrate: true, button: $('#btnBuildMobile') }); });
    $('#btnShuffle').addEventListener('click', function () { buildPaper(); });
    $('#btnJumpPaper').addEventListener('click', function () {
      setMode('paper');
      $('#mainPreview').scrollIntoView({ behavior: Motion.reduced() ? 'auto' : 'smooth' });
    });
    $('#chkAnswer').addEventListener('change', function () { state.showAnswer = $('#chkAnswer').checked; renderMode(); });
    $('#chkKpTag').addEventListener('change', function () { state.showKp = $('#chkKpTag').checked; renderMode(); });
    $('#chkSeal').addEventListener('change', function () { state.showSeal = $('#chkSeal').checked; renderMode(); });
    $('#chkDarkPaper').addEventListener('change', function () { state.darkPaper = $('#chkDarkPaper').checked; renderMode(); });
    $('#btnWord').addEventListener('click', exportWord);
    $('#btnTxt').addEventListener('click', copyText);
    $('#btnPrint').addEventListener('click', function () { window.print(); });
    $('#modeBar').addEventListener('click', function (e) {
      var btn = e.target.closest('[data-mode]');
      if (!btn) return;
      setMode(btn.getAttribute('data-mode'), e.clientX, e.clientY);
    });
    $('#btnTheme').addEventListener('click', function () {
      state.theme = state.theme === 'light' ? 'dark' : 'light';
      applyTheme();
    });
    $('#btnWrong').addEventListener('click', function () { openModal('#wrongModal'); renderWrong(); });
    $('#wbClose').addEventListener('click', function () { closeModal('#wrongModal'); });
    $('#wrongModal').addEventListener('click', function (e) { if (e.target.id === 'wrongModal') closeModal('#wrongModal'); });
    $('#wbTabs').addEventListener('click', function (e) {
      var tab = e.target.closest('[data-tab]');
      if (!tab) return;
      $$('#wbTabs .tab').forEach(function (b) { b.classList.toggle('on', b === tab); });
      state.wbTab = tab.getAttribute('data-tab');
      renderWrong();
      Motion.reveal($('#wbBody'), e.clientX, e.clientY);
    });
    $('#wbClear').addEventListener('click', function () {
      if (!confirm('确定清空错题本？所有记录都会被删除。')) return;
      KB.WrongBook.clear();
      refreshWrongCount();
      renderWrong();
    });
    $('#wbBuild').addEventListener('click', buildFromWeak);
    $('#wbBody').addEventListener('click', function (e) {
      var b = e.target.closest && e.target.closest('.wb-rm');
      if (!b) return;
      KB.WrongBook.remove(decodeURIComponent(b.getAttribute('data-k')));
      refreshWrongCount();
      renderWrong();
    });
    $('#viewPaper').addEventListener('click', function (e) {
      var btn = e.target.closest && e.target.closest('[data-act]');
      if (!btn || !state.paper) return;
      var index = Number(btn.getAttribute('data-i'));
      var act = btn.getAttribute('data-act');
      if (act === 'swap') replaceLocal(index);
      else if (act === 'ai') replaceAI(index);
      else if (act === 'variant') {
        var q = state.paper.questions[index];
        state.studioKp = kpName(q.kp, q.subject, q.stage);
        $('#studioText').value = q.stem;
        openModal('#studioModal');
        runStudio();
      }
      else if (act === 'edit') openEdit(index);
      else if (act === 'up') moveQuestion(index, -1);
      else if (act === 'down') moveQuestion(index, 1);
      else if (act === 'wrong') markQuestion(index, true);
      else if (act === 'right') markQuestion(index, false);
    });
    $('#viewExam').addEventListener('click', function (e) {
      var opt = e.target.closest && e.target.closest('[data-exam]');
      if (opt && state.paper && !state.exam.submitted) {
        var q = state.paper.questions[Number(opt.getAttribute('data-exam'))];
        var letter = opt.getAttribute('data-letter');
        if (q.type === 'multi') {
          var cur = String(state.exam.answers[q.id] || '');
          state.exam.answers[q.id] = cur.indexOf(letter) >= 0 ? cur.replace(letter, '') : (cur + letter).split('').sort().join('');
        } else state.exam.answers[q.id] = letter;
        renderExam();
        return;
      }
      if (e.target.id === 'examToggle') {
        state.exam.running = !state.exam.running;
        startTimer();
        renderExam();
      } else if (e.target.id === 'examReset') {
        resetExam();
        renderExam();
      } else if (e.target.id === 'examSubmit') submitExam();
      else if (e.target.id === 'examScratch') {
        state.exam.scratch = !state.exam.scratch;
        renderExam();
      } else if (e.target.id === 'scratchClear') {
        var canvas = $('#scratchCanvas');
        if (canvas) canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
      } else if (e.target.getAttribute && e.target.getAttribute('data-pen')) {
        state.exam.pen = e.target.getAttribute('data-pen');
        $$('.pen').forEach(function (p) { p.classList.toggle('on', p === e.target); });
      }
    });
    $('#viewExam').addEventListener('input', function (e) {
      if (!state.paper) return;
      if (e.target.getAttribute('data-exam-text') != null) {
        var q1 = state.paper.questions[Number(e.target.getAttribute('data-exam-text'))];
        state.exam.answers[q1.id] = e.target.value;
      }
      if (e.target.getAttribute('data-self') != null) {
        var q2 = state.paper.questions[Number(e.target.getAttribute('data-self'))];
        state.exam.self[q2.id] = Number(e.target.value);
      }
    });
    $('#viewBlueprint').addEventListener('click', function (e) { if (e.target.id === 'btnCsv') exportCsv(); });
    $('#btnStudio').addEventListener('click', function () { openModal('#studioModal'); });
    $('#studioClose').addEventListener('click', function () { closeModal('#studioModal'); });
    $('#studioModal').addEventListener('click', function (e) { if (e.target.id === 'studioModal') closeModal('#studioModal'); });
    var samples = $('#studioSamples');
    SAMPLES.forEach(function (sample) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'mini';
      b.textContent = sample.label;
      b.addEventListener('click', function () {
        state.studioKp = sample.kw;
        $('#studioText').value = sample.text;
        if (sample.subject !== state.subject) setSubject(sample.subject);
      });
      samples.appendChild(b);
    });
    $('#studioRun').addEventListener('click', runStudio);
    $('#studioOut').addEventListener('click', function (e) {
      var one = e.target.closest && e.target.closest('[data-insert]');
      var made = $('#studioOut')._qs || [];
      if (one) insertQuestions([made[Number(one.getAttribute('data-insert'))]]);
      if (e.target.id === 'studioInsertAll') insertQuestions(made);
    });
    $('#editClose').addEventListener('click', function () { closeModal('#editModal'); });
    $('#editCancel').addEventListener('click', function () { closeModal('#editModal'); });
    $('#editSave').addEventListener('click', saveEdit);
    $('#editModal').addEventListener('click', function (e) { if (e.target.id === 'editModal') closeModal('#editModal'); });
    $('#btnShare').addEventListener('click', openShare);
    $('#shareClose').addEventListener('click', function () { closeModal('#shareModal'); });
    $('#shareModal').addEventListener('click', function (e) { if (e.target.id === 'shareModal') closeModal('#shareModal'); });
    $('#shareCopy').addEventListener('click', function () {
      var url = $('#shareUrl').value;
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(url).then(function () { toast('链接已复制'); }, function () { fallbackCopy(url); });
      } else fallbackCopy(url);
    });
    document.addEventListener('keydown', function (e) {
      if (e.key !== 'Escape') return;
      if ($('#aiModal').style.display === 'flex') return;
      ['#wrongModal', '#studioModal', '#editModal', '#shareModal'].forEach(closeModal);
    });
  }

  function boot() {
    try {
      var savedTheme = localStorage.getItem('kb.theme.v1');
      if (savedTheme === 'light' || savedTheme === 'dark') state.theme = savedTheme;
    } catch (e) { /* 忽略 */ }
    var shared = null;
    var code = '';
    try {
      var q = new URLSearchParams(location.search);
      code = q.get('code') || '';
      var subj = q.get('subject'), stage = q.get('stage'), grade = q.get('grade'), term = q.get('term');
      if (subj && Registry.SUBJECTS[subj]) {
        state.subject = subj;
        var stages = stageList(subj);
        state.stage = (stage && stages.indexOf(stage) >= 0) ? stage : stages[0];
        state.grade = grade ? Number(grade) : firstGrade(state.stage);
        state.term = term === 'all' || term === '0' ? 0 : (term ? Number(term) : 1);
      }
      if (location.hash.indexOf('#s=') === 0) shared = A.decodeShare(location.hash.slice(3));
    } catch (e) { shared = null; }
    if (shared) applyPayload(shared);
    state.sections = state.sections.length ? state.sections : clonePreset();
    $('#chkCross').checked = state.crossGrade;
    renderAll();
    bind();
    refreshWrongCount();
    var restored = false;
    if (code) {
      var saved = readShares()[code];
      if (saved && saved.paper && saved.paper.questions && saved.paper.questions.length) {
        state.paper = saved.paper;
        recount(state.paper);
        renderMeta();
        renderMode();
        toast('已从本机提取码恢复试卷');
        restored = true;
      }
    }
    if (!restored) {
      var seed = shared && shared.seed ? shared.seed : 'demo-seed-1';
      if (shared && shared.diverged && !restored) toast('这份分享改过题，已按原条件重新出卷', 'amber');
      buildPaper(seed, { forceLocal: true, quiet: true, title: shared && shared.title ? shared.title : '' });
    }
    window.__KB_STATE__ = state;
  }

  boot();
})();
