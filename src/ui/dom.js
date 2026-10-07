// Small DOM helpers: HTML escaping and an in-place DOM patcher so periodic re-renders
// don't destroy elements the player is hovering or clicking.

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ESC[c]);

function isEditing(el) {
  return el === document.activeElement && (el.tagName === 'INPUT' || el.tagName === 'SELECT' || el.tagName === 'TEXTAREA');
}

function morphAttrs(from, to) {
  for (const a of [...from.attributes]) if (!to.hasAttribute(a.name)) from.removeAttribute(a.name);
  for (const a of [...to.attributes]) if (from.getAttribute(a.name) !== a.value) from.setAttribute(a.name, a.value);
  if (from.tagName === 'INPUT' && !isEditing(from)) {
    if (to.hasAttribute('value') && from.value !== to.getAttribute('value')) from.value = to.getAttribute('value');
    if (from.type === 'checkbox' || from.type === 'radio') from.checked = to.hasAttribute('checked');
  }
}

function sameKind(a, b) {
  if (a.nodeType !== b.nodeType || a.nodeName !== b.nodeName) return false;
  if (a.nodeType === 1) {
    const ka = a.getAttribute('data-key');
    const kb = b.getAttribute('data-key');
    if (ka !== kb) return false;
  }
  return true;
}

function morphChildren(from, to) {
  const fromKids = [...from.childNodes];
  const toKids = [...to.childNodes];
  for (let i = 0; i < toKids.length; i++) {
    const t = toKids[i];
    const f = fromKids[i];
    if (!f) { from.appendChild(t); continue; }
    if (!sameKind(f, t)) { from.replaceChild(t, f); continue; }
    if (f.nodeType === 3 || f.nodeType === 8) {
      if (f.nodeValue !== t.nodeValue) f.nodeValue = t.nodeValue;
      continue;
    }
    if (f.nodeType === 1) {
      if (f.hasAttribute('data-static')) continue;
      morphAttrs(f, t);
      if (!isEditing(f) && f.tagName !== 'CANVAS') morphChildren(f, t);
    }
  }
  for (let i = fromKids.length - 1; i >= toKids.length; i--) from.removeChild(fromKids[i]);
}

/** Replace the contents of `container` with `html`, reusing existing nodes where possible. */
export function patch(container, html) {
  const tpl = document.createElement('template');
  tpl.innerHTML = html;
  morphChildren(container, tpl.content);
}

export function stars(q) {
  const v = Math.max(0, Math.min(5, Math.round(q * 5)));
  let s = '';
  for (let i = 1; i <= 5; i++) s += i <= v ? '★' : '<span class="off">★</span>';
  return `<span class="stars" title="Quality ${Math.round(q * 100)}%">${s}</span>`;
}

export function bar(frac, cls = '', title = '') {
  const w = Math.max(0, Math.min(1, frac)) * 100;
  return `<div class="bar ${cls}"${title ? ` title="${esc(title)}"` : ''}><i style="width:${w.toFixed(1)}%"></i></div>`;
}
