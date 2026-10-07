// Modal dialogs. While any modal is open the game is paused.
import { esc } from './dom.js';

const stack = [];

export const modalOpen = () => stack.length > 0;
export const topModal = () => stack[stack.length - 1];

/**
 * opts: { title, body (html), foot (html), size: ''|'medium'|'wide', closable, onClose, onMount(el, modal), kind }
 */
export function openModal(opts) {
  const root = document.getElementById('modal-root');
  const backdrop = document.createElement('div');
  backdrop.className = 'modal-backdrop';
  backdrop.innerHTML = `
    <div class="modal ${opts.size || ''}" role="dialog" aria-modal="true" aria-label="${esc(opts.title || '')}">
      <div class="modal-head">${opts.icon ? `<span style="font-size:22px">${opts.icon}</span>` : ''}<h2>${esc(opts.title || '')}</h2>
        ${opts.closable === false ? '' : '<button class="icon-btn" data-close title="Close">✕</button>'}</div>
      <div class="modal-body"></div>
      <div class="modal-foot"></div>
    </div>`;
  const modal = {
    kind: opts.kind,
    el: backdrop,
    body: backdrop.querySelector('.modal-body'),
    foot: backdrop.querySelector('.modal-foot'),
    closable: opts.closable !== false,
    onClose: opts.onClose,
    close() {
      const i = stack.indexOf(modal);
      if (i >= 0) stack.splice(i, 1);
      backdrop.remove();
      if (modal.onClose) modal.onClose();
    },
    setBody(html) { modal.body.innerHTML = html; },
    setFoot(html) { modal.foot.innerHTML = html; modal.foot.hidden = !html; },
  };
  modal.setBody(opts.body || '');
  modal.setFoot(opts.foot || '');
  backdrop.addEventListener('click', (e) => {
    if (e.target.closest('[data-close]')) modal.close();
    else if (e.target === backdrop && modal.closable) modal.close();
  });
  root.appendChild(backdrop);
  stack.push(modal);
  if (opts.onMount) opts.onMount(modal.el, modal);
  const focusable = backdrop.querySelector('[autofocus]') || backdrop.querySelector('.modal-foot .btn-primary');
  if (focusable) setTimeout(() => focusable.focus(), 30);
  return modal;
}

export function closeTop() {
  const m = topModal();
  if (m && m.closable) m.close();
}

export function closeAll() {
  while (stack.length) stack[stack.length - 1].close();
}

export function confirmModal(title, text, okLabel = 'OK', onOk, danger = false) {
  const m = openModal({
    title,
    body: `<p>${text}</p>`,
    foot: `<button class="btn" data-close>Cancel</button><button class="btn ${danger ? 'btn-danger' : 'btn-primary'}" data-ok>${esc(okLabel)}</button>`,
  });
  m.foot.querySelector('[data-ok]').addEventListener('click', () => { m.close(); onOk(); });
  return m;
}

export function alertModal(title, html, icon) {
  return openModal({ title, icon, body: html, foot: '<button class="btn btn-primary" data-close>OK</button>' });
}

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && stack.length) {
    e.preventDefault();
    closeTop();
  }
});
