/* =========================================================
 * 小学数学生成器（适配器）
 * 复用既有 utils/bank.js 的 33 个知识点 / 11 种题型生成逻辑
 * ======================================================= */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('../utils/bank.js'));
  else { root.KB = root.KB || {}; root.KB.GenMathPrimary = factory(root.KB.Bank); }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (bank) {

  var TYPESET = ['oral', 'vertical', 'calc', 'simple', 'equation', 'fill', 'judge', 'choice', 'estimate', 'error', 'app'];

  function generate(c) {
    if (!bank) return null;
    var type = c.type;
    if (TYPESET.indexOf(type) < 0) return null;
    bank.setContext(c.grade, null);
    var r = bank.buildQuestion(c.kp, type, c.diff);
    if (!r || !r.q || !r.a) return null;

    var answer = String(r.a);
    // 旧题库选择题答案是 "B（192.32）" 形式，这里归一成字母
    if (type === 'choice') {
      var m = answer.match(/^\s*([A-F])\s*[（(]/);
      if (m) answer = m[1];
      else if (/^[A-F]$/.test(answer)) answer = answer;
      else if (r.opts && r.opts.length) {
        // 答案文本与某个选项内容一致时反查字母
        for (var i = 0; i < r.opts.length; i++) {
          var body = String(r.opts[i]).replace(/^[A-F][.、．]\s*/, '');
          if (body && answer.indexOf(body) >= 0) { answer = String.fromCharCode(65 + i); break; }
        }
      }
    }

    var q = {
      subject: 'math', stage: 'primary',
      grade: c.grade, term: c.term,
      kp: c.kp, type: type, diff: c.diff,
      stem: r.q,
      answer: answer,
      analysis: '【答案】' + r.a,
      chapter: c.chapter
    };
    if (r.opts && r.opts.length) q.opts = r.opts.slice();
    if (r.wrong && r.wrong.length) {
      q.analysis += '\n【错解辨析】' + r.wrong.join('；');
    }
    return q;
  }

  var KP_LIST = bank && bank.KNOW ? Object.keys(bank.KNOW) : [];

  return { generate: generate, types: TYPESET, kps: KP_LIST, coverage: 'full' };
});
