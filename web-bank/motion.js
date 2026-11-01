/* 六个手势：跟手、越界阻尼、窗口速度、吸附、可打断。只动 transform / opacity。 */
(function (root) {
  'use strict';

  function reduced() {
    return !!(root.matchMedia && root.matchMedia('(prefers-reduced-motion: reduce)').matches);
  }

  function vTracker(win) {
    var buf = [];
    return {
      reset: function () { buf.length = 0; },
      push: function (v) {
        buf.push([root.performance.now(), v]);
        while (buf.length > 8) buf.shift();
      },
      get: function () {
        if (buf.length < 2) return 0;
        var last = buf[buf.length - 1];
        var i = buf.length - 2;
        var span = win || 100;
        while (i > 0 && last[0] - buf[i][0] < span) i--;
        var dt = last[0] - buf[i][0];
        return dt > 0 ? (last[1] - buf[i][1]) / dt : 0;
      }
    };
  }

  function rubber(over, max) {
    var cap = max || 96;
    var sign = over < 0 ? -1 : 1;
    var x = Math.abs(over);
    return sign * cap * (1 - Math.exp(-x / cap));
  }

  function bindDrag(el, opts) {
    var st = null;
    var tracker = vTracker(100);
    function axisPos(e) { return opts.axis === 'y' ? e.clientY : e.clientX; }
    function crossPos(e) { return opts.axis === 'y' ? e.clientX : e.clientY; }
    function down(e) {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      if (opts.canStart && opts.canStart(e) === false) return;
      st = {
        id: e.pointerId,
        origin: axisPos(e),
        cross0: crossPos(e),
        claimed: false
      };
      tracker.reset();
      tracker.push(0);
      try { el.setPointerCapture(e.pointerId); } catch (err) { /* 旧浏览器忽略 */ }
      if (opts.onDown) opts.onDown(e);
    }
    function move(e) {
      if (!st || e.pointerId !== st.id) return;
      var pts = e.getCoalescedEvents ? e.getCoalescedEvents() : [e];
      var p = pts.length ? pts[pts.length - 1] : e;
      var delta = axisPos(p) - st.origin;
      var cross = crossPos(p) - st.cross0;
      if (!st.claimed) {
        if (Math.abs(delta) < 8 && Math.abs(cross) < 8) return;
        if (opts.axisLock !== false && Math.abs(cross) > Math.abs(delta)) {
          st = null;
          return;
        }
        st.claimed = true;
      }
      if (st.claimed && opts.prevent) e.preventDefault();
      tracker.push(delta);
      if (opts.onMove) opts.onMove(delta, tracker.get(), e);
    }
    function up(e) {
      if (!st || (e && e.pointerId != null && e.pointerId !== st.id)) return;
      var claimed = st.claimed;
      var delta = 0;
      if (claimed && e && e.clientX != null) delta = axisPos(e) - st.origin;
      if (claimed) tracker.push(delta);
      var velocity = claimed ? tracker.get() : 0;
      st = null;
      if (opts.onUp) opts.onUp({
        delta: delta,
        velocity: velocity,
        dragged: claimed,
        cancel: !!(e && e.type === 'pointercancel'),
        event: e
      });
    }
    el.addEventListener('pointerdown', down);
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerup', up);
    el.addEventListener('pointercancel', up);
  }

  function spring(get, set, target, velocityPxMs, done) {
    if (reduced() || !isFinite(target)) {
      if (isFinite(target)) set(target);
      if (done) done();
      return { stop: function () {} };
    }
    var pos = get();
    if (!isFinite(pos)) pos = target;
    var v = (velocityPxMs || 0) * 1000;
    var last = root.performance.now();
    var alive = true;
    var raf = 0;
    function frame(now) {
      if (!alive) return;
      var dt = Math.min(0.032, (now - last) / 1000);
      last = now;
      if (dt <= 0) { raf = root.requestAnimationFrame(frame); return; }
      var omega = 16;
      var acc = -omega * omega * (pos - target) - 2 * omega * v;
      v += acc * dt;
      pos += v * dt;
      if (!isFinite(pos) || Math.abs(pos - target) < 0.4 && Math.abs(v) < 12) {
        set(target);
        alive = false;
        if (done) done();
        return;
      }
      set(pos);
      raf = root.requestAnimationFrame(frame);
    }
    raf = root.requestAnimationFrame(frame);
    return {
      stop: function () {
        alive = false;
        if (raf) root.cancelAnimationFrame(raf);
      }
    };
  }

  function celebrate(button) {
    if (!button) return;
    if (button._kbFx) button._kbFx.stop();
    var face = button.querySelector('.btn-fx');
    if (!face) {
      face = document.createElement('span');
      face.className = 'btn-fx';
      face.setAttribute('aria-hidden', 'true');
      face.innerHTML = '<svg viewBox="0 0 36 36" class="btn-check"><circle cx="18" cy="18" r="15"></circle><path d="M10.5 18.5 l5 5.2 10.5-12"></path></svg>';
      button.appendChild(face);
    }
    var burst = null;
    if (!reduced()) {
      burst = document.createElement('span');
      burst.className = 'btn-burst';
      burst.setAttribute('aria-hidden', 'true');
      var i;
      for (i = 0; i < 10; i++) {
        var dot = document.createElement('i');
        var ang = (Math.PI * 2 * i) / 10 + 0.2;
        var dist = 26 + (i % 3) * 9;
        dot.style.setProperty('--dx', (Math.cos(ang) * dist).toFixed(1) + 'px');
        dot.style.setProperty('--dy', (Math.sin(ang) * dist).toFixed(1) + 'px');
        burst.appendChild(dot);
      }
      button.appendChild(burst);
    }
    button.classList.add('is-done');
    var timer = root.setTimeout(finish, reduced() ? 420 : 980);
    function finish() {
      button.classList.remove('is-done');
      if (burst && burst.parentNode) burst.parentNode.removeChild(burst);
      button._kbFx = null;
    }
    button._kbFx = {
      stop: function () {
        root.clearTimeout(timer);
        finish();
      }
    };
  }

  function roll(el) {
    var value = null;
    function paint(n, animate) {
      n = Math.max(0, Math.round(Number(n) || 0));
      var text = String(n);
      el.textContent = '';
      el.classList.add('roll');
      var i;
      for (i = 0; i < text.length; i++) {
        var col = document.createElement('span');
        col.className = 'roll-d';
        var strip = document.createElement('span');
        strip.className = 'roll-strip';
        var digit = text.charCodeAt(i) - 48;
        var k;
        for (k = 0; k <= 9; k++) {
          var cell = document.createElement('i');
          cell.textContent = String(k);
          strip.appendChild(cell);
        }
        col.appendChild(strip);
        el.appendChild(col);
        var shift = 'translateY(' + (-digit) + 'em)';
        if (!animate || reduced()) strip.style.transform = shift;
        else {
          strip.style.transform = 'translateY(0)';
          (function (node, next) {
            root.requestAnimationFrame(function () { node.style.transform = next; });
          })(strip, shift);
        }
      }
      el.setAttribute('aria-label', text);
      value = n;
    }
    return {
      set: function (n) {
        var next = Math.max(0, Math.round(Number(n) || 0));
        paint(next, value != null && value !== next);
      }
    };
  }

  function setRing(circle, ratio) {
    if (!circle) return;
    var r = Number(circle.getAttribute('r')) || 15;
    var c = 2 * Math.PI * r;
    var clamped = Math.max(0, Math.min(1, Number(ratio) || 0));
    circle.style.strokeDasharray = c.toFixed(2);
    circle.style.strokeDashoffset = ((1 - clamped) * c).toFixed(2);
  }

  function reveal(el, x, y) {
    if (!el || reduced()) return;
    var rect = el.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    var cx = x == null ? rect.width / 2 : x - rect.left;
    var cy = y == null ? rect.height / 2 : y - rect.top;
    el.style.setProperty('--rx', cx.toFixed(1) + 'px');
    el.style.setProperty('--ry', cy.toFixed(1) + 'px');
    el.classList.remove('is-revealing');
    void el.offsetWidth;
    el.classList.add('is-revealing');
    function done() {
      el.classList.remove('is-revealing');
      el.removeEventListener('animationend', done);
    }
    el.addEventListener('animationend', done);
  }

  function wheel(container, options) {
    var items = options.items || [];
    var onChange = options.onChange;
    var H = 40;
    var offset = 0;
    var anim = null;
    container.classList.add('wheel');
    container.setAttribute('tabindex', '0');
    container.setAttribute('role', 'listbox');
    container.innerHTML = '<div class="wheel-window"><div class="wheel-lens"></div><div class="wheel-col"></div></div>';
    var col = container.querySelector('.wheel-col');
    var windowEl = container.querySelector('.wheel-window');
    items.forEach(function (item, i) {
      var row = document.createElement('div');
      row.className = 'wheel-item';
      row.setAttribute('role', 'option');
      row.textContent = item.label;
      row.dataset.index = String(i);
      col.appendChild(row);
    });
    function maxOffset() { return Math.max(0, (items.length - 1) * H); }
    function paint() {
      var center = (windowEl.clientHeight - H) / 2;
      col.style.transform = 'translate3d(0,' + (center - offset).toFixed(2) + 'px,0)';
      var active = Math.round(offset / H);
      Array.prototype.forEach.call(col.children, function (row, i) {
        row.classList.toggle('is-active', i === active);
        row.setAttribute('aria-selected', i === active ? 'true' : 'false');
      });
    }
    function stop() {
      if (anim) { anim.stop(); anim = null; }
    }
    function commit(index, silent) {
      index = Math.max(0, Math.min(items.length - 1, index));
      offset = index * H;
      paint();
      if (!silent && onChange) onChange(items[index].value, items[index]);
    }
    function settle(fromVelocity) {
      var max = maxOffset();
      var v = fromVelocity || 0;
      if (offset < 0 || offset > max) {
        var edge = offset < 0 ? 0 : max;
        anim = spring(function () { return offset; }, function (p) { offset = p; paint(); }, edge, v, function () {
          anim = null;
          commit(Math.round(edge / H), false);
        });
        return;
      }
      var index;
      if (Math.abs(v) < 0.45) index = Math.round(offset / H);
      else index = Math.round((offset + v * 180) / H);
      index = Math.max(0, Math.min(items.length - 1, index));
      anim = spring(function () { return offset; }, function (p) { offset = p; paint(); }, index * H, v, function () {
        anim = null;
        commit(index, false);
      });
    }
    var grab = 0;
    var moved = false;
    bindDrag(container, {
      axis: 'y',
      axisLock: false,
      prevent: true,
      onDown: function () {
        stop();
        grab = offset;
        moved = false;
      },
      onMove: function (dy) {
        var raw = grab - dy;
        var max = maxOffset();
        if (raw < 0) offset = rubber(raw, H * 1.4);
        else if (raw > max) offset = max + rubber(raw - max, H * 1.4);
        else offset = raw;
        moved = true;
        paint();
      },
      onUp: function (info) {
        if (!info.dragged) return;
        if (info.cancel) { settle(0); return; }
        settle(-info.velocity);
      }
    });
    container.addEventListener('keydown', function (e) {
      var index = Math.round(offset / H);
      if (e.key === 'ArrowDown') { e.preventDefault(); commit(index + 1, false); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); commit(index - 1, false); }
      else if (e.key === 'Home') { e.preventDefault(); commit(0, false); }
      else if (e.key === 'End') { e.preventDefault(); commit(items.length - 1, false); }
    });
    col.addEventListener('click', function (e) {
      if (moved) { moved = false; return; }
      var row = e.target.closest ? e.target.closest('.wheel-item') : null;
      if (!row) return;
      commit(Number(row.dataset.index), false);
    });
    var initial = 0;
    items.forEach(function (item, i) { if (item.value === options.value) initial = i; });
    commit(initial, true);
    root.addEventListener('resize', paint);
    return {
      setValue: function (value) {
        var index = 0;
        items.forEach(function (item, i) { if (item.value === value) index = i; });
        stop();
        commit(index, true);
      },
      paint: paint
    };
  }

  function snapRail(container, options) {
    var cards = options.cards || [];
    container.classList.add('snap-rail');
    container.innerHTML = '';
    if (!cards.length) {
      container.innerHTML = '<p class="rail-empty">当前年级还没有章节</p>';
      return { setIndex: function () {} };
    }
    var viewport = document.createElement('div');
    viewport.className = 'rail-view';
    var track = document.createElement('div');
    track.className = 'rail-track';
    cards.forEach(function (card, i) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'unit-card';
      btn.dataset.index = String(i);
      var kick = document.createElement('span');
      kick.className = 'unit-kicker';
      kick.textContent = card.kicker || '';
      var title = document.createElement('span');
      title.className = 'unit-title';
      title.textContent = card.title || '';
      btn.appendChild(kick);
      btn.appendChild(title);
      track.appendChild(btn);
    });
    viewport.appendChild(track);
    var line = document.createElement('div');
    line.className = 'tl';
    line.setAttribute('aria-hidden', 'true');
    var s;
    for (s = 0; s < cards.length - 1; s++) {
      var seg = document.createElement('i');
      seg.style.setProperty('--d', String(s));
      line.appendChild(seg);
    }
    container.appendChild(viewport);
    if (cards.length > 1) container.appendChild(line);
    var x = 0;
    var anim = null;
    var index = 0;
    function centers() {
      var width = viewport.clientWidth || 1;
      return Array.prototype.map.call(track.children, function (card) {
        return width / 2 - (card.offsetLeft + card.offsetWidth / 2);
      });
    }
    function paint() {
      track.style.transform = 'translate3d(' + x.toFixed(2) + 'px,0,0)';
      Array.prototype.forEach.call(track.children, function (card, i) {
        card.classList.toggle('is-active', i === index);
      });
    }
    function paintLine(next) {
      Array.prototype.forEach.call(line.children, function (seg, i) {
        var on = i < next;
        if (on === seg.classList.contains('on')) return;
        seg.style.transitionDelay = (!reduced() && on) ? (i * 70) + 'ms' : '0ms';
        seg.classList.toggle('on', on);
      });
    }
    function go(next, velocity, silent) {
      var spots = centers();
      next = Math.max(0, Math.min(spots.length - 1, next));
      if (anim) anim.stop();
      var target = spots[next];
      anim = spring(function () { return x; }, function (p) { x = p; paint(); }, target, velocity || 0, function () {
        anim = null;
        index = next;
        paint();
        paintLine(next);
        if (!silent && options.onSettle) options.onSettle(next, cards[next]);
      });
      index = next;
      paint();
    }
    var grab = 0;
    var moved = false;
    bindDrag(viewport, {
      axis: 'x',
      prevent: true,
      onDown: function () {
        if (anim) { anim.stop(); anim = null; }
        grab = x;
        moved = false;
      },
      onMove: function (dx) {
        var spots = centers();
        var raw = grab + dx;
        var hi = spots[0];
        var lo = spots[spots.length - 1];
        if (raw > hi) x = hi + rubber(raw - hi, 80);
        else if (raw < lo) x = lo + rubber(raw - lo, 80);
        else x = raw;
        moved = true;
        paint();
      },
      onUp: function (info) {
        var spots = centers();
        if (!info.dragged || info.cancel) {
          var back = 0;
          var best = Infinity;
          spots.forEach(function (spot, i) {
            var d = Math.abs(spot - x);
            if (d < best) { best = d; back = i; }
          });
          go(back, 0, true);
          return;
        }
        var nearest = 0;
        var best = Infinity;
        spots.forEach(function (spot, i) {
          var d = Math.abs(spot - x);
          if (d < best) { best = d; nearest = i; }
        });
        if (Math.abs(info.velocity) > 0.5) nearest += info.velocity > 0 ? -1 : 1;
        go(nearest, info.velocity, false);
      }
    });
    track.addEventListener('click', function (e) {
      if (moved) { moved = false; return; }
      var btn = e.target.closest ? e.target.closest('.unit-card') : null;
      if (!btn) return;
      go(Number(btn.dataset.index), 0, false);
    });
    var start = options.index || 0;
    root.requestAnimationFrame(function () { go(start, 0, true); });
    return {
      setIndex: function (i) { go(i, 0, true); }
    };
  }

  function stack(rootEl) {
    var open = rootEl.classList.contains('is-open');
    function sync() {
      rootEl.classList.toggle('is-open', open);
      var cards = rootEl.querySelectorAll('.stack-card');
      var i;
      for (i = 0; i < cards.length; i++) {
        cards[i].style.setProperty('--i', String(i));
        var order = open ? i : (cards.length - 1 - i);
        cards[i].style.transitionDelay = (reduced() ? 0 : order * 52) + 'ms';
      }
      var toggle = rootEl.querySelector('[data-stack-toggle]');
      if (toggle) toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    }
    rootEl.addEventListener('click', function (e) {
      if (e.target.closest && e.target.closest('.stack-ignore, a, button:not([data-stack-toggle])')) return;
      var hit = e.target.closest && (e.target.closest('[data-stack-toggle]') || (!open && e.target.closest('.stack-stage')));
      if (!hit) return;
      open = !open;
      sync();
    });
    sync();
    return {
      refresh: sync,
      isOpen: function () { return open; },
      setOpen: function (v) { open = !!v; sync(); }
    };
  }

  root.KB = root.KB || {};
  root.KB.Motion = {
    reduced: reduced,
    celebrate: celebrate,
    roll: roll,
    setRing: setRing,
    reveal: reveal,
    wheel: wheel,
    snapRail: snapRail,
    stack: stack
  };
})(typeof window !== 'undefined' ? window : globalThis);
