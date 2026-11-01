/* =========================================================
 * 题目数据模型与校验
 * 所有学科共用同一套结构，新增学科只加注册表 + 生成器
 * ======================================================= */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else { root.KB = root.KB || {}; root.KB.Schema = factory(); }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {

  /** 题型字典（跨学科通用，生成器只用自己需要的） */
  var TYPES = {
    oral:        { name: '口算题',   note: '直接写出得数',                objective: true },
    vertical:    { name: '竖式计算', note: '列竖式计算',                  objective: true },
    estimate:    { name: '估算题',   note: '估算结果，合理即可',          objective: true },
    error:       { name: '错题辨析', note: '判断对错并改正',              objective: false },
    choice:      { name: '选择题',   note: '四个选项中只有一个是正确的',  objective: true },
    multi:       { name: '多选题',   note: '选出所有正确的选项',          objective: true },
    judge:       { name: '判断题',   note: '正确的打√，错误的打×',        objective: true },
    fill:        { name: '填空题',   note: '把答案填在横线上',            objective: true },
    calc:        { name: '计算题',   note: '写出计算过程',                objective: false },
    solve:       { name: '解答题',   note: '写出完整解题过程',            objective: false },
    app:         { name: '应用题',   note: '列式解答，写出答语',          objective: false },
    proof:       { name: '证明题',   note: '写出已知、求证与证明过程',    objective: false },
    experiment:  { name: '实验题',   note: '根据实验现象或装置作答',      objective: false },
    short:       { name: '简答题',   note: '简要回答，说明理由',          objective: false },
    cloze:       { name: '完形填空', note: '从选项中选出最佳答案',        objective: true },
    reading:     { name: '阅读理解', note: '阅读材料后作答',              objective: false },
    translation: { name: '翻译题',   note: '把句子译成目标语言',          objective: false },
    writing:     { name: '写作题',   note: '按提示完成书面表达',          objective: false }
  };

  /** 难度：1 易 ~ 5 难 */
  var DIFFS = [
    { level: 1, name: '容易',   star: '★' },
    { level: 2, name: '较易',   star: '★★' },
    { level: 3, name: '中等',   star: '★★★' },
    { level: 4, name: '较难',   star: '★★★★' },
    { level: 5, name: '困难',   star: '★★★★★' }
  ];

  /** 学段 */
  var STAGES = {
    primary: { name: '小学', grades: [1, 2, 3, 4, 5, 6] },
    junior:  { name: '初中', grades: [7, 8, 9] },
    senior:  { name: '高中', grades: [10, 11, 12] }
  };

  /** 教材版本 */
  var VERSIONS = {
    rjb:   { name: '人教版' },
    bsb:   { name: '北师大版' },
    sjk:   { name: '苏教版' },
    hjb:   { name: '沪教版' },
    wsb:   { name: '外研版', subjects: ['english'] }
  };

  var seqCounter = 0;

  /** 生成题目 id：科目-学段-知识点-序号 */
  function makeId(subject, stage, kp, seedTag) {
    seqCounter = (seqCounter + 1) % 100000;
    var base = [subject, stage, kp].join('-').replace(/[^a-z0-9\-]/gi, '');
    var tail = String(seedTag == null ? seqCounter : seedTag).replace(/[^a-z0-9]/gi, '').slice(-6);
    return base + '-' + tail;
  }

  /**
   * 归一化并校验一道题
   * @returns {{ok:boolean, question?:object, errors?:string[]}}
   */
  function normalize(q) {
    var errors = [];
    if (!q || typeof q !== 'object') return { ok: false, errors: ['题目不是对象'] };

    var out = {
      id:       q.id || '',
      subject:  q.subject || '',
      stage:    q.stage || '',
      grade:    Number(q.grade) || 0,
      term:     Number(q.term) || 1,
      version:  q.version || 'rjb',
      chapter:  q.chapter || '',
      kp:       q.kp || '',
      type:     q.type || '',
      diff:     Number(q.diff) || 3,
      stem:     String(q.stem == null ? '' : q.stem).trim(),
      opts:     Array.isArray(q.opts) ? q.opts.map(function (s) { return String(s).trim(); }) : null,
      answer:   String(q.answer == null ? '' : q.answer).trim(),
      analysis: String(q.analysis == null ? '' : q.analysis).trim(),
      score:    Number(q.score) || 0,
      tags:     Array.isArray(q.tags) ? q.tags.slice(0, 8) : []
    };

    if (!out.subject) errors.push('缺少 subject');
    if (!out.stage) errors.push('缺少 stage');
    if (!STAGES[out.stage]) errors.push('未知学段：' + out.stage);
    if (!out.kp) errors.push('缺少知识点 kp');
    if (!out.type) errors.push('缺少题型 type');
    if (!TYPES[out.type]) errors.push('未知题型：' + out.type);
    if (!out.stem) errors.push('题干为空');
    if (out.stem.length > 1200) errors.push('题干过长');
    if (!out.answer) errors.push('答案为空');
    if (out.diff < 1 || out.diff > 5) errors.push('难度越界：' + out.diff);

    if (out.type === 'choice' || out.type === 'multi' || out.type === 'cloze') {
      if (!out.opts || out.opts.length < 2) errors.push('选择题缺选项');
      else if (out.opts.length > 6) errors.push('选项过多');
      if (out.opts) {
        for (var i = 0; i < out.opts.length; i++) {
          if (!out.opts[i]) errors.push('第 ' + (i + 1) + ' 个选项为空');
        }
      }
      if (out.type === 'choice') {
        if (!/^[A-F]$/.test(out.answer)) errors.push('单选答案必须是 A-F 字母');
        else if (out.opts && out.answer.charCodeAt(0) - 65 >= out.opts.length) {
          errors.push('答案字母超出选项范围');
        }
      }
    }
    if (out.type === 'judge' && !/^(√|×|对|错|T|F|true|false)$/i.test(out.answer)) {
      errors.push('判断题答案必须是 √ / ×');
    }

    if (errors.length) return { ok: false, errors: errors };
    if (!out.id) out.id = makeId(out.subject, out.stage, out.kp);
    return { ok: true, question: out };
  }

  /** 根据题型给默认分值 */
  function defaultScore(type) {
    var m = {
      choice: 3, multi: 4, judge: 2, fill: 3, cloze: 2,
      calc: 6, solve: 8, app: 8, proof: 8, experiment: 8,
      short: 6, reading: 10, translation: 5, writing: 20
    };
    return m[type] || 5;
  }

  /** 难度 → 分值系数 */
  function diffFactor(diff) {
    var m = { 1: 0.9, 2: 1.0, 3: 1.1, 4: 1.25, 5: 1.4 };
    return m[Number(diff)] || 1;
  }

  return {
    TYPES: TYPES,
    DIFFS: DIFFS,
    STAGES: STAGES,
    VERSIONS: VERSIONS,
    makeId: makeId,
    normalize: normalize,
    defaultScore: defaultScore,
    diffFactor: diffFactor
  };
});
