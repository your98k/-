/* =========================================================
 * 错题本：生成过的题自动入库，标记对错，按知识点统计薄弱项
 * 存储：localStorage（不可用时退回内存）
 * ======================================================= */
(function (root) {
  'use strict';
  var KEY = 'kb.wrongbook.v1';
  var MAX = 3000;
  var mem = null;

  function blank() { return { v: 1, items: {}, updatedAt: 0 }; }

  function load() {
    try {
      var raw = localStorage.getItem(KEY);
      if (!raw) return blank();
      var db = JSON.parse(raw);
      if (!db || !db.items) return blank();
      return db;
    } catch (e) {
      return mem || blank();
    }
  }

  function save(db) {
    db.updatedAt = Date.now();
    try { localStorage.setItem(KEY, JSON.stringify(db)); }
    catch (e) { mem = db; }
  }

  function keyOf(q) {
    return [q.subject, q.stage, q.kp, q.type, (q.stem || '').slice(0, 120)].join('|');
  }

  /** 生成一份卷子后调用：整卷题目入库（已存在则累加出现次数） */
  function recordPaper(paper, meta) {
    var db = load();
    var now = Date.now();
    var added = 0;
    (paper.questions || []).forEach(function (q) {
      var k = keyOf(q);
      var it = db.items[k];
      if (it) {
        it.seen += 1;
        it.lastAt = now;
      } else {
        db.items[k] = {
          key: k,
          subject: q.subject,
          stage: q.stage,
          grade: q.grade,
          term: q.term,
          kp: q.kp,
          kpName: (meta && meta.kpNames && meta.kpNames[q.kp]) || q.kp,
          type: q.type,
          diff: q.diff,
          stem: q.stem,
          opts: q.opts || null,
          answer: q.answer,
          analysis: q.analysis || '',
          seen: 1,
          wrong: 0,
          right: 0,
          firstAt: now,
          lastAt: now
        };
        added++;
      }
    });
    // 超出上限时按最近使用淘汰
    var keys = Object.keys(db.items);
    if (keys.length > MAX) {
      keys.sort(function (a, b) { return db.items[a].lastAt - db.items[b].lastAt; });
      keys.slice(0, keys.length - MAX).forEach(function (k) { delete db.items[k]; });
    }
    save(db);
    return { added: added, total: Object.keys(db.items).length };
  }

  /** 标记某题：wrong=true 记为错，false 记为对，null 清除标记 */
  function mark(key, result) {
    var db = load();
    var it = db.items[key];
    if (!it) return false;
    if (result === true) { it.wrong += 1; it.result = 'wrong'; }
    else if (result === false) { it.right += 1; it.result = 'right'; }
    else { it.result = null; }
    it.lastAt = Date.now();
    save(db);
    return true;
  }

  function remove(key) {
    var db = load();
    delete db.items[key];
    save(db);
  }

  function clear() { save(blank()); }

  /** 全部记录，按最近出现排序 */
  function all() {
    var db = load();
    return Object.keys(db.items).map(function (k) { return db.items[k]; })
      .sort(function (a, b) { return b.lastAt - a.lastAt; });
  }

  /** 错题：wrong > right，且 wrong > 0 */
  function wrongList() {
    return all().filter(function (it) { return it.result === 'wrong'; });
  }

  /** 按知识点聚合，返回薄弱知识点（按错题数降序） */
  function weakKps(subject, stage) {
    var map = {};
    wrongList().forEach(function (it) {
      if (subject && it.subject !== subject) return;
      if (stage && it.stage !== stage) return;
      var k = it.subject + ':' + it.stage + ':' + it.kp;
      if (!map[k]) map[k] = { subject: it.subject, stage: it.stage, kp: it.kp, name: it.kpName, wrong: 0, total: 0 };
      map[k].wrong += it.wrong;
      map[k].total += 1;
    });
    return Object.keys(map).map(function (k) { return map[k]; })
      .sort(function (a, b) { return b.wrong - a.wrong; });
  }

  function counts() {
    var a = all();
    var w = wrongList();
    return { total: a.length, wrong: w.length };
  }

  root.KB = root.KB || {};
  root.KB.WrongBook = {
    keyOf: keyOf, recordPaper: recordPaper, mark: mark, remove: remove, clear: clear,
    all: all, wrongList: wrongList, weakKps: weakKps, counts: counts
  };
})(typeof window !== 'undefined' ? window : globalThis);
