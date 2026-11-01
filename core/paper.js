/* =========================================================
 * 组卷内核：根据「蓝图」自动抽题成卷
 * 蓝图 = 学科 + 学段 + 年级 + 学期 + 若干大题（题型/题量/分值/难度分布/知识点）
 * ======================================================= */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(
      require('./rng.js'), require('./schema.js'), require('./registry.js'), require('../generators/index.js')
    );
  } else {
    root.KB = root.KB || {};
    root.KB.Paper = factory(root.KB.RNG, root.KB.Schema, root.KB.Registry, root.KB.Generators);
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (RNG, Schema, Registry, Generators) {

  /** 默认难度分布：易/较易/中/较难/难 */
  var DEFAULT_MIX = [0.25, 0.35, 0.25, 0.1, 0.05];

  /** 按分布抽一个难度等级 */
  function pickDiff(rng, mix) {
    var items = [], i;
    var m = mix && mix.length === 5 ? mix : DEFAULT_MIX;
    for (i = 0; i < 5; i++) items.push({ v: i + 1, w: m[i] });
    return rng.weighted(items) || 3;
  }

  /** 解析知识点池：优先用用户所选，其次本年级课程，最后按需补充全学段可用知识点 */
  function resolveKps(bp) {
    if (bp.kps && bp.kps.length) return bp.kps.slice();

    var gen = Generators.get(bp.subject, bp.stage);
    var supported = gen && gen.kps && gen.kps.length ? gen.kps : null;

    function keep(list) {
      return list.filter(function (id) { return !supported || supported.indexOf(id) >= 0; });
    }

    var list = keep(Registry.curriculum(bp.subject, bp.stage, bp.grade, bp.term));

    // 本册可用知识点太少时，补充该学段其它有生成器的知识点，避免出不满卷
    if (list.length < 6) {
      var all = keep(Registry.kps(bp.subject, bp.stage).map(function (k) { return k.id; }));
      all.forEach(function (id) { if (list.indexOf(id) < 0) list.push(id); });
    }
    if (!list.length) {
      list = supported ? supported.slice() : Registry.kps(bp.subject, bp.stage).map(function (k) { return k.id; });
    }
    return list;
  }

  /** 题干+答案指纹，用于去重（只看题干会把"同一问法不同题"误杀） */
  function fingerprint(q) {
    return ((q.stem || '') + '|' + (q.answer || '') + '|' + ((q.opts || []).join(',')))
      .replace(/\s+/g, '').slice(0, 200);
  }

  /**
   * 生成一份试卷
   * @param {object} bp 蓝图
   * @returns {{title, questions, totalScore, meta}}
   */
  function generatePaper(bp) {
    if (!bp || !bp.subject || !bp.stage) throw new Error('蓝图缺少 subject / stage');
    var gen = Generators.get(bp.subject, bp.stage);
    if (!gen) throw new Error('「' + bp.subject + ' · ' + bp.stage + '」暂无可用的题目生成器');

    var seed = bp.seed || ('paper-' + bp.subject + '-' + Date.now());
    var rng = RNG.create(seed);
    var kpPool = resolveKps(bp);
    var used = {};            // 题干指纹去重
    var questions = [];
    var failures = [];
    var sections = bp.sections || [];

    sections.forEach(function (sec, si) {
      var type = sec.type || 'choice';
      var count = Math.max(0, Number(sec.count) || 0);
      var perScore = Number(sec.score) || 0;
      var kps = (sec.kps && sec.kps.length) ? sec.kps : kpPool;
      var got = 0, guard = 0;

      while (got < count && guard < count * 40 + 40) {
        guard++;
        var kp = rng.pick(kps);
        var diff = sec.diff ? rng.int(sec.diff[0], sec.diff[1]) : pickDiff(rng, sec.diffMix);
        var q = null;
        try {
          q = gen.generate({
            subject: bp.subject, stage: bp.stage,
            grade: bp.grade || 7, term: bp.term || 1,
            kp: kp, type: type, diff: diff, rng: rng, bp: bp
          });
        } catch (e) {
          failures.push({ kp: kp, type: type, error: String(e && e.message || e) });
          continue;
        }
        if (!q) { failures.push({ kp: kp, type: type, error: '生成器返回空' }); continue; }

        q.subject = bp.subject; q.stage = bp.stage;
        q.grade = q.grade || bp.grade; q.term = q.term || bp.term;
        q.type = q.type || type; q.kp = q.kp || kp; q.diff = q.diff || diff;
        q.version = q.version || bp.version || 'rjb';
        var norm = Schema.normalize(q);
        if (!norm.ok) { failures.push({ kp: kp, type: type, error: norm.errors.join('；') }); continue; }

        var f = fingerprint(norm.question);
        if (used[f]) continue;
        used[f] = 1;

        var qq = norm.question;
        qq.score = perScore > 0 ? perScore : Schema.defaultScore(qq.type);
        qq.sectionIndex = si;
        if (sec.title) qq.sectionTitle = sec.title;
        questions.push(qq);
        got++;
      }
    });

    // 按大题顺序编号
    var bySection = {};
    questions.forEach(function (q, i) {
      q.no = i + 1;
      bySection[q.sectionIndex] = bySection[q.sectionIndex] || [];
      bySection[q.sectionIndex].push(q);
    });

    var totalScore = questions.reduce(function (s, q) { return s + (q.score || 0); }, 0);

    return {
      title: bp.title || (bp.grade + '年级' + (bp.term === 2 ? '下' : '上') + '练习卷'),
      subject: bp.subject,
      stage: bp.stage,
      grade: bp.grade,
      term: bp.term,
      version: bp.version || 'rjb',
      seed: seed,
      duration: bp.duration || Math.max(30, Math.round(totalScore * 1.2)),
      questions: questions,
      totalScore: totalScore,
      meta: {
        requested: sections.reduce(function (s, x) { return s + (Number(x.count) || 0); }, 0),
        generated: questions.length,
        failures: failures,
        kpCount: Object.keys(questions.reduce(function (m, q) { m[q.kp] = 1; return m; }, {})).length,
        byType: questions.reduce(function (m, q) { m[q.type] = (m[q.type] || 0) + 1; return m; }, {}),
        byDiff: questions.reduce(function (m, q) { m[q.diff] = (m[q.diff] || 0) + 1; return m; }, {})
      }
    };
  }

  /** 常见蓝图模板 */
  var TEMPLATES = {
    '小学·同步小卷': function (subject, stage, grade, term) {
      return {
        subject: subject, stage: stage, grade: grade, term: term,
        title: grade + '年级' + (term === 2 ? '下' : '上') + '同步小卷',
        duration: 40,
        sections: [
          { title: '一、直接写出得数', type: 'oral', count: 8, score: 2 },
          { title: '二、竖式计算', type: 'vertical', count: 4, score: 4 },
          { title: '三、填空', type: 'fill', count: 6, score: 2 },
          { title: '四、选择', type: 'choice', count: 5, score: 2 },
          { title: '五、解决问题', type: 'app', count: 4, score: 5 }
        ]
      };
    },
    '单元测试卷': function (subject, stage, grade, term) {
      return {
        subject: subject, stage: stage, grade: grade, term: term,
        title: grade + '年级' + (term === 2 ? '下' : '上') + '单元测试卷',
        duration: 90,
        sections: [
          { title: '一、选择题', type: 'choice', count: 10, score: 3 },
          { title: '二、填空题', type: 'fill', count: 8, score: 3 },
          { title: '三、计算题', type: 'calc', count: 6, score: 5 },
          { title: '四、解答题', type: 'solve', count: 4, score: 8 }
        ]
      };
    },
    '期中/期末卷': function (subject, stage, grade, term) {
      return {
        subject: subject, stage: stage, grade: grade, term: term,
        title: grade + '年级' + (term === 2 ? '下' : '上') + '期末模拟卷',
        duration: 120,
        sections: [
          { title: '一、选择题', type: 'choice', count: 12, score: 3 },
          { title: '二、填空题', type: 'fill', count: 8, score: 3 },
          { title: '三、计算题', type: 'calc', count: 6, score: 6 },
          { title: '四、解答题', type: 'solve', count: 5, score: 10 }
        ]
      };
    }
  };

  return {
    DEFAULT_MIX: DEFAULT_MIX,
    TEMPLATES: TEMPLATES,
    generatePaper: generatePaper,
    resolveKps: resolveKps,
    pickDiff: pickDiff
  };
});
