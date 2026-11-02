'use strict';
// Deliberately small DOM boundary, not an implementation of workbench behavior.
// Parses the real index.html and supports only the DOM operations app.js uses here.
const decode = s => s.replace(/&(amp|lt|gt|quot|#39|nbsp);/g, (_, k) => ({ amp: '&', lt: '<', gt: '>', quot: '"', '#39': "'", nbsp: ' ' })[k]);
class Element {
  constructor(tag) {
    this.tagName = tag.toUpperCase(); this.children = []; this.parentNode = null;
    this.attributes = {}; this.dataset = {}; this.listeners = {}; this.style = { setProperty(k, v) { this[k] = v; } };
    this.value = ''; this.checked = false; this.disabled = false; this.hidden = false;
    this.className = ''; this.id = ''; this._text = ''; this.scrolls = [];
    this.classList = {
      contains: c => this.className.split(/\s+/).includes(c),
      toggle: (c, on) => { const set = new Set(this.className.split(/\s+/).filter(Boolean));
        on = on === undefined ? !set.has(c) : !!on; on ? set.add(c) : set.delete(c); this.className = [...set].join(' '); return on; },
      add: (...cs) => cs.forEach(c => this.classList.toggle(c, true)),
      remove: (...cs) => cs.forEach(c => this.classList.toggle(c, false))
    };
  }
  appendChild(n) { if (n.parentNode) n.parentNode.removeChild(n); this.children.push(n); n.parentNode = this; return n; }
  removeChild(n) { this.children.splice(this.children.indexOf(n), 1); n.parentNode = null; return n; }
  get options() { return this.children.filter(n => n.tagName === 'OPTION'); }
  setAttribute(k, v) {
    v = String(v); this.attributes[k] = v;
    if (k === 'class') this.className = v;
    else if (['id', 'type', 'value'].includes(k)) this[k] = v;
    else if (['hidden', 'disabled', 'checked', 'selected'].includes(k)) this[k] = true;
    else if (k.startsWith('data-')) this.dataset[k.slice(5).replace(/-([a-z])/g, (_, c) => c.toUpperCase())] = v;
  }
  getAttribute(k) {
    if (k === 'class') return this.className || null;
    if (k === 'id') return this.id || null;
    if (k.startsWith('data-')) return this.dataset[k.slice(5).replace(/-([a-z])/g, (_, c) => c.toUpperCase())] ?? null;
    return this.attributes[k] ?? null;
  }
  removeAttribute(k) { delete this.attributes[k]; if (['hidden', 'disabled', 'checked'].includes(k)) this[k] = false; }
  get textContent() { return this._text + this.children.map(n => n.textContent).join(''); }
  set textContent(s) { this.children.forEach(n => { n.parentNode = null; }); this.children = []; this._text = String(s); }
  set innerHTML(html) { this.textContent = ''; parse(this, String(html)); }
  get innerHTML() { return this.textContent; } // Tests inspect parsed nodes/text, never serialized HTML.
  matches(selector) {
    const attrs = [...selector.matchAll(/\[([^=\]]+)(?:=["']?([^\]"']*)["']?)?\]/g)];
    if (attrs.some(([, k, v]) => this.getAttribute(k) === null || (v !== undefined && this.getAttribute(k) !== v))) return false;
    selector = selector.replace(/\[[^\]]*\]/g, '');
    const tag = selector.match(/^[a-z][\w-]*/i), id = selector.match(/#([\w-]+)/);
    return (!tag || this.tagName === tag[0].toUpperCase()) && (!id || this.id === id[1]) &&
      [...selector.matchAll(/\.([\w-]+)/g)].every(([, c]) => this.classList.contains(c));
  }
  closest(s) { for (let n = this; n; n = n.parentNode) if (n.matches(s)) return n; return null; }
  querySelectorAll(selector) {
    const out = [], groups = selector.split(',').map(s => s.trim().split(/\s+/));
    const visit = n => n.children.forEach(child => {
      if (child.tagName !== '#TEXT' && groups.some(parts => {
        if (!child.matches(parts[parts.length - 1])) return false;
        let p = child.parentNode;
        for (let i = parts.length - 2; i >= 0; i--) { while (p && !p.matches(parts[i])) p = p.parentNode; if (!p) return false; p = p.parentNode; }
        return true;
      })) out.push(child);
      visit(child);
    });
    visit(this); return out;
  }
  querySelector(s) { return this.querySelectorAll(s)[0] || null; }
  addEventListener(type, fn) { (this.listeners[type] ||= []).push(fn); }
  dispatchEvent(e) {
    e.target ||= this; e.currentTarget = this; e.preventDefault ||= () => {};
    for (const fn of this.listeners[e.type] || []) fn.call(this, e);
    if (e.bubbles !== false && this.parentNode) this.parentNode.dispatchEvent(e);
    return true;
  }
  click() { if (!this.disabled) this.dispatchEvent({ type: 'click', bubbles: true, clientX: 0, clientY: 0 }); }
  scrollIntoView(opts) { this.scrolls.push(opts); }
  focus() { this.focused = true; }
  getBoundingClientRect() { return { left: 0, top: 0, width: 600, height: 400 }; }
}
function parse(root, html) {
  const stack = [root];
  for (const token of html.replace(/<!--[\s\S]*?-->|<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, '').match(/<[^>]+>|[^<]+/g) || []) {
    if (/^<\//.test(token)) { const tag = token.slice(2, -1).trim().toUpperCase();
      for (let i = stack.length - 1; i > 0; i--) if (stack[i].tagName === tag) { stack.length = i; break; }
    } else if (/^<[a-z]/i.test(token)) {
      const tag = token.match(/^<([^\s/>]+)/)[1], node = new Element(tag);
      for (const [, k, a, b, c] of token.slice(tag.length + 1, -1).matchAll(/([^\s=/>]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g)) node.setAttribute(k, decode(a ?? b ?? c ?? ''));
      stack[stack.length - 1].appendChild(node);
      if (!/^(input|br|hr|img|meta|link|area|base|embed|source|wbr)$/i.test(tag) && !/\/>$/.test(token)) stack.push(node);
    } else if (!token.startsWith('<!')) { const n = new Element('#text'); n._text = decode(token); stack[stack.length - 1].appendChild(n); }
  }
}
module.exports = function documentFrom(html) {
  const document = new Element('document'); parse(document, html);
  document.documentElement = document.querySelector('html'); document.body = document.querySelector('body');
  document.createElement = tag => new Element(tag);
  document.createTextNode = s => { const n = new Element('#text'); n.textContent = s; return n; };
  document.getElementById = id => document.querySelector('#' + id);
  return document;
};
