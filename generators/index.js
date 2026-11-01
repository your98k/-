/* =========================================================
 * 生成器注册表
 * 新增学科/学段：写好生成器模块后在这里挂一行即可
 * ======================================================= */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(
      require('./math-primary.js'), require('./math-junior.js'), require('./math-senior.js'),
      require('./physics.js'), require('./chemistry.js'), require('./english.js'), require('./chinese.js')
    );
  } else {
    root.KB = root.KB || {};
    root.KB.Generators = factory(
      root.KB.GenMathPrimary, root.KB.GenMathJunior, root.KB.GenMathSenior,
      root.KB.GenPhysics, root.KB.GenChemistry, root.KB.GenEnglish, root.KB.GenChinese
    );
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (mp, mj, ms, ph, ch, en, cn) {

  var REG = {
    'math:primary': mp,
    'math:junior': mj,
    'math:senior': ms,
    'physics:junior': ph && ph.junior,
    'physics:senior': ph && ph.senior,
    'chemistry:junior': ch && ch.junior,
    'chemistry:senior': ch && ch.senior,
    'english:primary': en && en.primary,
    'english:junior': en && en.junior,
    'english:senior': en && en.senior,
    'chinese:primary': cn && cn.primary,
    'chinese:junior': cn && cn.junior,
    'chinese:senior': cn && cn.senior
  };

  function get(subject, stage) {
    var g = REG[subject + ':' + stage];
    if (!g) return null;
    // 有的生成器导出的是函数（函数自带 kps 属性），有的是 {generate, kps}
    if (typeof g === 'function') {
      return { generate: g, kps: g.kps || [], coverage: g.coverage || 'partial' };
    }
    if (typeof g.generate === 'function') return g;
    return null;
  }

  /** 某学科某学段支持的知识点 id 列表 */
  function support(subject, stage) {
    var g = get(subject, stage);
    if (!g || !g.kps) return null;
    return g.kps.slice();
  }

  /** 全局覆盖统计 */
  function stats() {
    var out = [];
    Object.keys(REG).forEach(function (k) {
      var parts = k.split(':');
      var g = REG[k];
      if (!g) return;
      out.push({
        subject: parts[0], stage: parts[1],
        kps: (g.kps || []).length,
        coverage: g.coverage || 'partial'
      });
    });
    return out;
  }

  return { REG: REG, get: get, support: support, stats: stats };
});
