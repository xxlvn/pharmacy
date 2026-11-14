// Общие UI-утилиты: экранирование, форматирование, иконки, тосты, диалоги, drawer.
import { t, localizeError, fmtNumber, fmtDate } from './i18n.js';

export function esc(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

// Форматы зависят от выбранного языка (см. fmtNumber и fmtDate в i18n.js).
export const tenge = (n) => `${fmtNumber(n)} ₸`;

export const formatDate = (iso) => fmtDate(iso, 'full');

export const STATUSES = ['PENDING', 'CONFIRMED', 'SHIPPED', 'DELIVERED', 'CANCELLED'];
export const statusLabel = (s) => t(`status.${s}`);

export const statusBadge = (s) => `<span class="status status-${esc(s)}">${esc(statusLabel(s))}</span>`;

// ---------- Иконки (собственные SVG, единый штрих 24×24) ----------

const PATHS = {
  search: '<circle cx="11" cy="11" r="6.5"/><path d="m20 20-4.2-4.2"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
  x: '<path d="M6 6l12 12M18 6 6 18"/>',
  trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 12.5a1.5 1.5 0 0 0 1.5 1.5h7a1.5 1.5 0 0 0 1.5-1.5L18 7M9 7V4.5A1.5 1.5 0 0 1 10.5 3h3A1.5 1.5 0 0 1 15 4.5V7"/>',
  edit: '<path d="M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16v4Z"/><path d="m13.5 6.5 4 4"/>',
  logout: '<path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3M10 16l-4-4 4-4M6 12h10"/>',
  truck: '<path d="M3 6h11v10H3zM14 9h4l3 3.5V16h-7"/><circle cx="7" cy="17.5" r="1.8"/><circle cx="17" cy="17.5" r="1.8"/>',
  shield: '<path d="M12 3 5 6v5.5c0 4.2 2.9 7.6 7 9.5 4.1-1.9 7-5.3 7-9.5V6l-7-3Z"/><path d="m9 12 2 2 4-4"/>',
  clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
  alert: '<path d="M12 3.5 2.5 20h19L12 3.5Z"/><path d="M12 10v4.5M12 17.5v.01"/>',
  info: '<circle cx="12" cy="12" r="8.5"/><path d="M12 11v5.5M12 7.8v.01"/>',
  doc: '<path d="M7 3h7l4 4v14H7z"/><path d="M14 3v4h4M10 12h5M10 16h5"/>',
  box: '<path d="M3.5 7.5 12 3l8.5 4.5v9L12 21l-8.5-4.5z"/><path d="M3.5 7.5 12 12l8.5-4.5M12 12v9"/>',
  bag: '<path d="M5 8h14l-1 12.5H6L5 8Z"/><path d="M9 10V6.5a3 3 0 0 1 6 0V10"/>',
  arrowLeft: '<path d="M19 12H5M11 6l-6 6 6 6"/>',
  upload: '<path d="M12 15V4M7.5 8.5 12 4l4.5 4.5"/><path d="M4.5 14.5v3A2.5 2.5 0 0 0 7 20h10a2.5 2.5 0 0 0 2.5-2.5v-3"/>',
  chevronLeft: '<path d="m14.5 6-6 6 6 6"/>',
  chevronRight: '<path d="m9.5 6 6 6-6 6"/>',

  // формы выпуска
  tablet: '<ellipse cx="12" cy="9.5" rx="8" ry="3.5"/><path d="M4 9.5v4c0 1.9 3.6 3.5 8 3.5s8-1.6 8-3.5v-4"/><path d="M8.5 9.5h7"/>',
  capsule: '<rect x="3.5" y="8.5" width="17" height="7" rx="3.5" transform="rotate(-40 12 12)"/><path d="m9.6 9.2 5.1 5.9"/>',
  bottle: '<path d="M9 3h6v3H9z"/><path d="M8.5 6h7l1 3v10.5a1.5 1.5 0 0 1-1.5 1.5H9a1.5 1.5 0 0 1-1.5-1.5V9l1-3Z"/><path d="M7.5 12h9M7.5 17h9"/>',
  drops: '<path d="M12 3.5c3 3.6 5.5 6.8 5.5 9.9a5.5 5.5 0 0 1-11 0c0-3.1 2.5-6.3 5.5-9.9Z"/><path d="M9.5 14a2.5 2.5 0 0 0 2.5 2.5"/>',
  spray: '<path d="M8 9h7v11.5H8z"/><path d="M9.5 9V6h4v3M13.5 6h2.5l1-1.5M18.5 7.5h.01M20 5.5h.01M20 9.5h.01"/>',
  sachet: '<path d="M5.5 4h13v16h-13z"/><path d="M5.5 7h13M5.5 17h13M9 11.5h6"/>',
  lozenge: '<rect x="4.5" y="4.5" width="15" height="15" rx="5"/><circle cx="12" cy="12" r="3"/>',
  bandage: '<rect x="2.5" y="8" width="19" height="8" rx="4" transform="rotate(-35 12 12)"/><path d="M10.6 10.4h.01M13.4 13.6h.01M13.6 10.6h.01M10.4 13.4h.01"/>',
  tube: '<path d="M8 3h8l-1 3H9L8 3Z"/><path d="M9 6h6l1.5 13.5a1.5 1.5 0 0 1-1.5 1.5H9a1.5 1.5 0 0 1-1.5-1.5L9 6Z"/><path d="M8.3 13h7.4"/>',
  cross: '<path d="M9.5 3.5h5v6h6v5h-6v6h-5v-6h-6v-5h6z"/>',
  device: '<rect x="5" y="3.5" width="14" height="17" rx="3"/><rect x="8" y="6.5" width="8" height="5" rx="1"/><path d="M10 15.5h4M12 13.5v4"/>',
  strip: '<rect x="9" y="2.5" width="6" height="19" rx="1.5"/><path d="M9 7h6M11 17h2"/>',
};

export function icon(name, cls = 'icon') {
  return `<svg class="${cls}" viewBox="0 0 24 24" aria-hidden="true">${PATHS[name] ?? PATHS.cross}</svg>`;
}

export function formIcon(form = '') {
  const f = form.toLowerCase();
  if (f.includes('капсул')) return 'capsule';
  if (f.includes('табл')) return 'tablet';
  if (f.includes('капли')) return 'drops';
  if (f.includes('сироп') || f.includes('раствор')) return 'bottle';
  if (f.includes('спрей')) return 'spray';
  if (f.includes('порош')) return 'sachet';
  if (f.includes('пастил')) return 'lozenge';
  if (f.includes('пластыр')) return 'bandage';
  if (f.includes('мазь') || f.includes('гель') || f.includes('крем')) return 'tube';
  if (f.includes('шампун')) return 'bottle';
  if (f.includes('прибор')) return 'device';
  if (f.includes('полоск')) return 'strip';
  return 'cross';
}

// ---------- Тосты ----------

export function toast(message, { type = 'success', duration = 3200 } = {}) {
  const root = document.querySelector('[data-toaster]');
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.setAttribute('role', type === 'error' ? 'alert' : 'status');
  el.innerHTML = `${icon(type === 'error' ? 'alert' : 'check')}<div>${message}</div>`;
  root.append(el);

  let timer;
  const close = () => {
    el.classList.add('leaving');
    setTimeout(() => el.remove(), 180);
  };
  const start = () => (timer = setTimeout(close, duration));
  el.addEventListener('mouseenter', () => clearTimeout(timer));
  el.addEventListener('mouseleave', start);
  start();

  // Не больше трёх одновременно
  const all = root.querySelectorAll('.toast:not(.leaving)');
  if (all.length > 3) all[0].classList.add('leaving'), setTimeout(() => all[0].remove(), 180);
}

export function errorToast(err) {
  toast(esc(localizeError(err).message), { type: 'error', duration: 5000 });
}

// ---------- Ошибки форм ----------

export function renderFormError(container, err) {
  if (!container) return;
  if (!err) {
    container.hidden = true;
    container.innerHTML = '';
    return;
  }
  err = localizeError(err);
  const details = Array.isArray(err.details) ? err.details : [];
  container.hidden = false;
  container.innerHTML = `<strong>${esc(err.message)}</strong>${
    details.length ? `<ul>${details.map((d) => `<li>${esc(d.message)}</li>`).join('')}</ul>` : ''
  }`;
}

export function setLoading(btn, loading) {
  if (!btn) return;
  btn.classList.toggle('is-loading', loading);
  btn.disabled = loading;
}

// ---------- Подтверждение ----------

export function confirmDialog({ title, text, confirmText = t('common.delete'), danger = true }) {
  return new Promise((resolve) => {
    const prevFocus = document.activeElement;
    const wrap = document.createElement('div');
    wrap.className = 'confirm';
    wrap.innerHTML = `
      <div class="confirm-box" role="alertdialog" aria-modal="true" aria-labelledby="cf-title" aria-describedby="cf-text">
        <h2 id="cf-title">${esc(title)}</h2>
        <p id="cf-text">${esc(text)}</p>
        <div class="actions">
          <button class="btn btn-ghost" data-act="cancel">${esc(t('common.cancel'))}</button>
          <button class="btn ${danger ? 'btn-dark' : 'btn-primary'}" data-act="ok">${esc(confirmText)}</button>
        </div>
      </div>`;
    document.body.append(wrap);
    requestAnimationFrame(() => wrap.classList.add('open'));
    wrap.querySelector('[data-act="cancel"]').focus();

    const done = (value) => {
      wrap.classList.remove('open');
      document.removeEventListener('keydown', onKey);
      setTimeout(() => wrap.remove(), 180);
      prevFocus?.focus?.();
      resolve(value);
    };
    const onKey = (e) => e.key === 'Escape' && done(false);
    document.addEventListener('keydown', onKey);
    wrap.addEventListener('click', (e) => {
      if (e.target === wrap) done(false);
      const act = e.target.closest('[data-act]')?.dataset.act;
      if (act) done(act === 'ok');
    });
  });
}

// ---------- Drawer ----------

export function openDrawer({ title, body, submitText = t('common.save'), onSubmit }) {
  const prevFocus = document.activeElement;
  const backdrop = document.createElement('div');
  backdrop.className = 'drawer-backdrop';
  const drawer = document.createElement('form');
  drawer.className = 'drawer';
  drawer.noValidate = true;
  drawer.setAttribute('role', 'dialog');
  drawer.setAttribute('aria-modal', 'true');
  drawer.setAttribute('aria-labelledby', 'drawer-title');
  drawer.innerHTML = `
    <div class="drawer-head">
      <h2 id="drawer-title">${esc(title)}</h2>
      <button type="button" class="icon-btn" data-close aria-label="${esc(t('common.close'))}">${icon('x')}</button>
    </div>
    <div class="drawer-body">
      <div class="form-error" data-form-error hidden></div>
      <div class="form">${body}</div>
    </div>
    <div class="drawer-foot">
      <button type="button" class="btn btn-ghost" data-close>${esc(t('common.cancel'))}</button>
      <button type="submit" class="btn btn-primary" data-submit>${esc(submitText)}</button>
    </div>`;

  document.body.append(backdrop, drawer);
  document.body.style.overflow = 'hidden';
  requestAnimationFrame(() => {
    backdrop.classList.add('open');
    drawer.classList.add('open');
  });
  setTimeout(() => drawer.querySelector('input, select, textarea')?.focus(), 60);

  const close = () => {
    backdrop.classList.remove('open');
    drawer.classList.remove('open');
    document.removeEventListener('keydown', onKey);
    document.body.style.overflow = '';
    setTimeout(() => {
      backdrop.remove();
      drawer.remove();
    }, 320);
    prevFocus?.focus?.();
  };
  const onKey = (e) => e.key === 'Escape' && close();
  document.addEventListener('keydown', onKey);
  backdrop.addEventListener('click', close);
  drawer.querySelectorAll('[data-close]').forEach((b) => b.addEventListener('click', close));

  drawer.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = drawer.querySelector('[data-submit]');
    const errBox = drawer.querySelector('[data-form-error]');
    renderFormError(errBox, null);
    setLoading(btn, true);
    try {
      await onSubmit(drawer);
      close();
    } catch (err) {
      renderFormError(errBox, err);
      drawer.querySelector('.drawer-body').scrollTop = 0;
    } finally {
      setLoading(btn, false);
    }
  });

  return { close, el: drawer };
}
