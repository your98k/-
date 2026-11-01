/* =========================================================
 * 英语生成器（小学 / 初中 / 高中）
 * 用"模板 + 随机词表"组合出题，保证同一份卷子不重复
 * ======================================================= */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./util.js'));
  else { root.KB = root.KB || {}; root.KB.GenEnglish = factory(root.KB.GenUtil); }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (U) {

  var WORDS = [
    { en: 'apple', zh: '苹果' }, { en: 'banana', zh: '香蕉' }, { en: 'orange', zh: '橙子' },
    { en: 'teacher', zh: '老师' }, { en: 'student', zh: '学生' }, { en: 'school', zh: '学校' },
    { en: 'library', zh: '图书馆' }, { en: 'hospital', zh: '医院' }, { en: 'weather', zh: '天气' },
    { en: 'favourite', zh: '最喜爱的' }, { en: 'beautiful', zh: '美丽的' }, { en: 'different', zh: '不同的' },
    { en: 'important', zh: '重要的' }, { en: 'interesting', zh: '有趣的' }, { en: 'delicious', zh: '美味的' },
    { en: 'holiday', zh: '假期' }, { en: 'question', zh: '问题' }, { en: 'exercise', zh: '锻炼' }
  ];

  var NAMES = ['Tom', 'Mary', 'Jack', 'Lily', 'Peter', 'Anna', 'Mike', 'Lucy'];
  var PLACES = ['the park', 'the library', 'the zoo', 'the museum', 'the beach', 'the cinema'];
  var NOUNS = ['book', 'bike', 'computer', 'letter', 'picture', 'kite', 'window', 'garden'];

  var IRREGULAR = [
    { base: 'go', past: 'went', pp: 'gone' }, { base: 'eat', past: 'ate', pp: 'eaten' },
    { base: 'see', past: 'saw', pp: 'seen' }, { base: 'take', past: 'took', pp: 'taken' },
    { base: 'write', past: 'wrote', pp: 'written' }, { base: 'buy', past: 'bought', pp: 'bought' },
    { base: 'teach', past: 'taught', pp: 'taught' }, { base: 'run', past: 'ran', pp: 'run' },
    { base: 'give', past: 'gave', pp: 'given' }, { base: 'know', past: 'knew', pp: 'known' },
    { base: 'come', past: 'came', pp: 'come' }, { base: 'find', past: 'found', pp: 'found' }
  ];

  var ADJ = [
    { base: 'big', comp: 'bigger', sup: 'biggest' },
    { base: 'happy', comp: 'happier', sup: 'happiest' },
    { base: 'easy', comp: 'easier', sup: 'easiest' },
    { base: 'good', comp: 'better', sup: 'best' },
    { base: 'tall', comp: 'taller', sup: 'tallest' },
    { base: 'hot', comp: 'hotter', sup: 'hottest' },
    { base: 'beautiful', comp: 'more beautiful', sup: 'most beautiful' },
    { base: 'difficult', comp: 'more difficult', sup: 'most difficult' }
  ];

  var TENSE = [
    { pat: 'Every day, {N} ______ ( {V} ) to school by bike.', form: function (v) { return v === 'go' ? 'goes' : v + (/(s|sh|ch|x|o)$/.test(v) ? 'es' : 's'); }, wrong: function (v) { return [v, v + 'ing', v + 'ed']; }, name: '一般现在时第三人称单数' },
    { pat: 'Look! {N} ______ ( {V} ) football now.', form: function (v) { return /e$/.test(v) ? v.replace(/e$/, 'ing') : v + 'ing'; }, wrong: function (v) { return [v, v + 's', v + 'ed']; }, name: '现在进行时' },
    { pat: 'Yesterday {N} ______ ( {V} ) a new book.', form: function (v) { return v + 'ed'; }, wrong: function (v) { return [v, v + 'ing', v + 's']; }, name: '一般过去时' },
    { pat: 'Next week {N} ______ ( {V} ) to Beijing.', form: function (v) { return 'will ' + v; }, wrong: function (v) { return [v, v + 's', 'was ' + v + 'ing']; }, name: '一般将来时' }
  ];

  var VERBS = ['go', 'play', 'watch', 'study', 'visit', 'clean', 'help', 'read'];

  var PRIMARY = {
    'eng.p.word': function (c) {
      var r = c.rng, w = r.pick(WORDS);
      var pool = WORDS.filter(function (x) { return x.en !== w.en; });
      return {
        stem: '“' + w.zh + '”的英文是',
        answer: w.en,
        wrongs: r.sample(pool, 3).map(function (x) { return x.en; }),
        analysis: w.zh + ' → ' + w.en
      };
    },
    'eng.p.tense': function (c) {
      var r = c.rng;
      var name = r.pick(NAMES);
      var v = r.pick(VERBS);
      var subj = r.pick(['He', 'She', 'Tom', 'My mother', name]);
      var form = { go: 'goes', play: 'plays', watch: 'watches', study: 'studies', visit: 'visits', clean: 'cleans', help: 'helps', read: 'reads' }[v];
      return {
        stem: subj + ' ______ ( ' + v + ' ) English every day.',
        answer: form,
        wrongs: [v, v + 'ing', v + 'ed'],
        analysis: '一般现在时第三人称单数，动词加 -s / -es。'
      };
    },
    'eng.p.past': function (c) {
      var r = c.rng, v = r.pick(IRREGULAR), name = r.pick(NAMES), place = r.pick(PLACES);
      return {
        stem: 'Yesterday ' + name + ' ______ ( ' + v.base + ' ) to ' + place + '.',
        answer: v.past,
        wrongs: [v.base, v.pp, v.base + 'ed'],
        analysis: v.base + ' 的过去式是 ' + v.past + '。'
      };
    }
  };

  var JUNIOR = {
    'eng.j.tense': function (c) {
      var r = c.rng;
      var t = r.pick(TENSE);
      var name = r.pick(NAMES);
      var v = r.pick(VERBS);
      var opt = r.bool(0.5) ? { N: name } : { N: r.pick(['He', 'She', 'They']) };
      var stem = t.pat.replace('{N}', opt.N).replace('{V}', v);
      var ans = t.form(v);
      return { stem: stem, answer: ans, wrongs: t.wrong(v), analysis: '本题考查' + t.name + '。' };
    },
    'eng.j.word': function (c) {
      var r = c.rng, a = r.pick(ADJ);
      var frame = r.pick([
        'This book is ______ ( ' + a.base + ' ) than that one.',
        'Of the two, this one is ______ ( ' + a.base + ' ).',
        'It is the ______ ( ' + a.base + ' ) story I have ever read.'
      ]);
      var isSup = frame.indexOf('the ______') >= 0;
      return {
        stem: frame,
        answer: isSup ? a.sup : a.comp,
        wrongs: isSup ? [a.comp, a.base, a.base + 'er'] : [a.base, a.sup, a.base + 'er'],
        analysis: /more/.test(a.comp) ? '多音节形容词用 more / most + 原级。' : '单音节形容词比较级加 -er，最高级加 -est。'
      };
    },
    'eng.j.voice': function (c) {
      var r = c.rng;
      var n = r.pick(NOUNS), name = r.pick(NAMES);
      var t = r.pick([
        { s: 'The ' + n + ' ______ ( repair ) by ' + name + ' yesterday.', a: 'was repaired', w: ['repaired', 'is repaired', 'has repaired'], n: '一般过去时的被动语态' },
        { s: 'The ' + n + ' ______ ( clean ) every morning.', a: 'is cleaned', w: ['cleans', 'cleaned', 'is cleaning'], n: '一般现在时的被动语态' },
        { s: 'A new ' + n + ' ______ ( buy ) tomorrow.', a: 'will be bought', w: ['will buy', 'is bought', 'bought'], n: '一般将来时的被动语态' }
      ]);
      return { stem: t.s, answer: t.a, wrongs: t.w, analysis: t.n + '：be + 过去分词。' };
    },
    'eng.j.clause': function (c) {
      var r = c.rng;
      var t = r.pick([
        { s: 'Could you tell me ______ ?', a: 'where he lives', w: ['where does he live', 'where he live', 'where did he lives'] },
        { s: 'I don\'t know ______ .', a: 'what he wants', w: ['what does he want', 'what he want', 'what did he wants'] },
        { s: 'She asked me ______ .', a: 'if I was ready', w: ['if was I ready', 'that I was ready', 'if I am ready yesterday'] },
        { s: 'Do you know ______ ?', a: 'when the meeting will start', w: ['when will the meeting start', 'when the meeting start', 'when does the meeting start'] }
      ]);
      return { stem: t.s, answer: t.a, wrongs: t.w, analysis: '宾语从句要用陈述语序。' };
    }
  };

  var SENIOR = {
    'eng.s.grammar': function (c) {
      var r = c.rng;
      var t = r.pick([
        { s: '______ (walk) along the street, I met an old friend.', a: 'Walking', w: ['Walked', 'To walk', 'Walk'], n: '现在分词作状语' },
        { s: 'The book ______ (write) by him is very popular.', a: 'written', w: ['writing', 'wrote', 'is written'], n: '过去分词作定语' },
        { s: 'It is the third time that he ______ (visit) the museum.', a: 'has visited', w: ['visited', 'visits', 'will visit'], n: '固定句型用现在完成时' },
        { s: 'Hardly ______ (he) arrived when it began to rain.', a: 'had he', w: ['he had', 'did he', 'he has'], n: 'hardly 置句首用部分倒装' },
        { s: 'If I ______ (be) you, I would accept the offer.', a: 'were', w: ['am', 'was', 'will be'], n: '虚拟语气中 be 动词用 were' },
        { s: 'The reason ______ he was late is that he missed the bus.', a: 'why', w: ['which', 'that', 'when'], n: '先行词 reason 后接 why' }
      ]);
      return { stem: t.s, answer: t.a, wrongs: t.w, analysis: t.n + '。' };
    },
    'eng.s.clause': function (c) {
      var r = c.rng;
      var t = r.pick([
        { s: 'This is the house ______ I lived last year.', a: 'where', w: ['which', 'that', 'when'], n: '先行词表地点，从句缺状语用 where' },
        { s: 'The man ______ is standing there is my teacher.', a: 'who', w: ['whom', 'whose', 'which'], n: '先行词指人，从句缺主语用 who' },
        { s: 'I know the reason ______ he was late.', a: 'why', w: ['which', 'that', 'when'], n: '先行词 reason，从句缺原因状语用 why' },
        { s: '______ he said at the meeting surprised us all.', a: 'What', w: ['That', 'Which', 'It'], n: '主语从句缺主语用 what' }
      ]);
      return { stem: t.s, answer: t.a, wrongs: t.w, analysis: t.n + '。' };
    }
  };

  function emit(type, core, c) {
    var r = c.rng;
    if (type === 'choice' || type === 'cloze') {
      if (!core.wrongs || core.wrongs.length < 3) return null;
      return U.choice(r, core.stem, core.answer, core.wrongs, core.analysis);
    }
    if (type === 'fill' || type === 'translation') {
      return { stem: core.stem, answer: core.answer, analysis: core.analysis };
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
      q.subject = 'english'; q.stage = stage;
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
