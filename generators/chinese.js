/* =========================================================
 * 语文生成器（小学 / 初中 / 高中）
 * 成语、古诗均为公有领域内容；病句、字音等按规则生成
 * ======================================================= */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./util.js'));
  else { root.KB = root.KB || {}; root.KB.GenChinese = factory(root.KB.GenUtil); }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (U) {

  var IDIOMS = [
    { w: '画蛇添足', m: '比喻做了多余的事，反而不好' },
    { w: '守株待兔', m: '比喻不主动努力，而存万一的侥幸心理' },
    { w: '亡羊补牢', m: '比喻出了问题以后想办法补救' },
    { w: '掩耳盗铃', m: '比喻自己欺骗自己' },
    { w: '刻舟求剑', m: '比喻不懂事物已发展变化而仍静止地看问题' },
    { w: '井底之蛙', m: '比喻见识狭窄的人' },
    { w: '拔苗助长', m: '比喻违反事物发展规律，急于求成' },
    { w: '滥竽充数', m: '比喻没有真才实学的人混在行家里面充数' },
    { w: '胸有成竹', m: '比喻做事之前已有通盘的考虑' },
    { w: '一鸣惊人', m: '比喻平时没有突出表现，一下子做出惊人的成绩' }
  ];

  var POEMS = [
    { up: '床前明月光', down: '疑是地上霜', title: '静夜思', author: '李白' },
    { up: '白日依山尽', down: '黄河入海流', title: '登鹳雀楼', author: '王之涣' },
    { up: '春眠不觉晓', down: '处处闻啼鸟', title: '春晓', author: '孟浩然' },
    { up: '锄禾日当午', down: '汗滴禾下土', title: '悯农', author: '李绅' },
    { up: '离离原上草', down: '一岁一枯荣', title: '赋得古原草送别', author: '白居易' },
    { up: '两个黄鹂鸣翠柳', down: '一行白鹭上青天', title: '绝句', author: '杜甫' },
    { up: '接天莲叶无穷碧', down: '映日荷花别样红', title: '晓出净慈寺送林子方', author: '杨万里' },
    { up: '欲穷千里目', down: '更上一层楼', title: '登鹳雀楼', author: '王之涣' },
    { up: '海内存知己', down: '天涯若比邻', title: '送杜少府之任蜀州', author: '王勃' },
    { up: '会当凌绝顶', down: '一览众山小', title: '望岳', author: '杜甫' },
    { up: '长风破浪会有时', down: '直挂云帆济沧海', title: '行路难', author: '李白' },
    { up: '山重水复疑无路', down: '柳暗花明又一村', title: '游山西村', author: '陆游' }
  ];

  var PINYIN = [
    { ch: '隘', py: 'ài' }, { ch: '濒', py: 'bīn' }, { ch: '忏', py: 'chàn' },
    { ch: '档', py: 'dàng' }, { ch: '遏', py: 'è' }, { ch: '氛', py: 'fēn' },
    { ch: '亘', py: 'gèn' }, { ch: '涸', py: 'hé' }, { ch: '恪', py: 'kè' },
    { ch: '莅', py: 'lì' }, { ch: '谬', py: 'miù' }, { ch: '匿', py: 'nì' },
    { ch: '惬', py: 'qiè' }, { ch: '冗', py: 'rǒng' }, { ch: '溯', py: 'sù' },
    { ch: '恬', py: 'tián' }, { ch: '唾', py: 'tuò' }, { ch: '纤', py: 'xiān' }
  ];

  var TYPO = [
    { right: '再接再厉', wrong: '再接再励' }, { right: '迫不及待', wrong: '迫不急待' },
    { right: '一如既往', wrong: '一如继往' }, { right: '按部就班', wrong: '按步就班' },
    { right: '川流不息', wrong: '穿流不息' }, { right: '世外桃源', wrong: '世外桃园' }
  ];

  var BAD_SENTENCE = [
    { bad: '通过这次活动，使我明白了许多道理。', fix: '这次活动使我明白了许多道理。', why: '“通过……使……”造成主语残缺' },
    { bad: '他不但学习好，而且身体也很好。', fix: '他不仅学习好，而且身体也很好。', why: '关联词搭配不当' },
    { bad: '我们要防止不再发生类似的事故。', fix: '我们要防止再发生类似的事故。', why: '否定不当，语义重复' },
    { bad: '这次考试，我们班的成绩比去年提高了两倍。', fix: '这次考试，我们班的成绩比去年提高了百分之二十。', why: '“提高两倍”说法不合逻辑' }
  ];

  var PRIMARY = {
    'chn.p.pinyin': function (c) {
      var r = c.rng, p = r.pick(PINYIN);
      var pool = PINYIN.filter(function (x) { return x.ch !== p.ch; });
      return {
        stem: '“' + p.ch + '”的正确读音是',
        answer: p.py,
        wrongs: r.sample(pool, 3).map(function (x) { return x.py; }),
        analysis: p.ch + ' → ' + p.py
      };
    },
    'chn.p.words': function (c) {
      var r = c.rng, t = r.pick(TYPO);
      return {
        stem: '下列词语中没有错别字的一项是',
        answer: t.right,
        wrongs: [t.wrong, t.wrong.slice(0, 2) + '礼' + t.wrong.slice(3), t.right.slice(0, 3) + '励'],
        analysis: '正确写法：' + t.right + '。'
      };
    },
    'chn.p.idiom': function (c) {
      var r = c.rng, t = r.pick(IDIOMS);
      var blank = t.w.slice(0, 1) + '____' + t.w.slice(3);
      return {
        stem: '写出成语：' + t.m + ' —— ' + blank,
        answer: t.w,
        analysis: '该成语是“' + t.w + '”，' + t.m + '。'
      };
    },
    'chn.p.poem': function (c) {
      var r = c.rng, p = r.pick(POEMS);
      return {
        stem: '“' + p.up + '，______。”出自' + p.author + '的《' + p.title + '》',
        answer: p.down,
        analysis: p.up + '，' + p.down + '。'
      };
    }
  };

  var JUNIOR = {
    'chn.j.pinyin': function (c) {
      var r = c.rng, p = r.pick(PINYIN);
      return {
        stem: '给下列加点字注音：' + p.ch + '（　）',
        answer: p.py,
        wrongs: [p.py.replace('ā', 'á').replace('ī', 'í'), p.py.toUpperCase(), p.py + 'g'],
        analysis: '正确读音是 ' + p.py + '。'
      };
    },
    'chn.j.idiom': function (c) {
      var r = c.rng, t = r.pick(IDIOMS);
      var use = r.pick([
        { s: '他做事总是' + t.w + '，深受大家赞赏。', ok: true },
        { s: '这次失败让他' + t.w + '，从此一蹶不振。', ok: false },
        { s: '面对困难，我们要' + t.w + '，不能盲目乐观。', ok: false }
      ]);
      return {
        stem: '下列句子中成语使用恰当的一项是',
        answer: use.s,
        wrongs: ['他做事总是' + t.w + '，结果把事情弄糟了。', '他' + t.w + '地放弃了比赛。', '这道题他' + t.w + '地做错了。'],
        analysis: '“' + t.w + '”' + t.m + '。'
      };
    },
    'chn.j.sentence': function (c) {
      var r = c.rng, t = r.pick(BAD_SENTENCE);
      return {
        stem: '修改病句：' + t.bad,
        answer: t.fix,
        wrongs: [t.bad, t.bad.replace('。', '吗？'), t.fix + '（语序不当）'],
        analysis: t.why + '，应改为：' + t.fix
      };
    },
    'chn.j.poem': function (c) {
      var r = c.rng, p = r.pick(POEMS);
      return {
        stem: '默写：' + p.up + '，______。',
        answer: p.down,
        analysis: '出自' + p.author + '《' + p.title + '》。'
      };
    }
  };

  var SENIOR = {
    'chn.s.words': function (c) {
      var r = c.rng, t = r.pick(IDIOMS);
      return {
        stem: '依次填入下列句子横线处的成语，最恰当的一项是：他做事______，从不拖泥带水。',
        answer: t.w,
        wrongs: r.sample(IDIOMS.filter(function (x) { return x.w !== t.w; }), 3).map(function (x) { return x.w; }),
        analysis: '“' + t.w + '”' + t.m + '。'
      };
    },
    'chn.s.sentence': function (c) {
      var r = c.rng, t = r.pick(BAD_SENTENCE);
      return {
        stem: '下列句子没有语病的一项是',
        answer: t.fix,
        wrongs: [t.bad, BAD_SENTENCE[0].bad, BAD_SENTENCE[2].bad].filter(function (x) { return x !== t.fix; }).slice(0, 3),
        analysis: t.why + '。'
      };
    },
    'chn.s.poem': function (c) {
      var r = c.rng, p = r.pick(POEMS);
      return {
        stem: '名句默写：' + p.up + '，______。',
        answer: p.down,
        analysis: p.author + '《' + p.title + '》'
      };
    }
  };

  function emit(type, core, c) {
    var r = c.rng;
    if (type === 'choice') {
      if (!core.wrongs || core.wrongs.length < 3) return null;
      return U.choice(r, core.stem, core.answer, core.wrongs, core.analysis);
    }
    if (type === 'fill' || type === 'short' || type === 'translation') {
      return { stem: core.stem, answer: core.answer, analysis: core.analysis };
    }
    if (type === 'judge' && core.judge) return U.judge(r, core.judge.stmt, core.judge.truth, core.analysis);
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
      q.subject = 'chinese'; q.stage = stage;
      q.kp = c.kp; q.type = c.type; q.diff = c.diff;
      q.grade = c.grade; q.term = c.term;
      return q;
    };
    gen.kps = Object.keys(table);
    gen.coverage = 'core';
    return gen;
  }

  return {
    primary: make(PRIMARY, 'primary'),
    junior: make(JUNIOR, 'junior'),
    senior: make(SENIOR, 'senior'),
    kps: Object.keys(PRIMARY).concat(Object.keys(JUNIOR), Object.keys(SENIOR))
  };
});


