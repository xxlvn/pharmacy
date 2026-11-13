// Панель администратора: заказы, товары (CRUD), категории (CRUD), пользователи.
import { api } from './api.js';
import { auth } from './store.js';
import {
  esc, tenge, formatDate, icon, formIcon as formIconName, statusBadge, statusLabel, STATUSES,
  toast, errorToast, confirmDialog, openDrawer,
} from './ui.js';
import { invalidateCategories } from './app.js';
import { t, unit, fmtDate, fmtCompact, formName, dosageText, categoryName as categoryLabel } from './i18n.js';

const TABS = ['overview', 'orders', 'products', 'categories', 'users'];

const NEXT_STATUSES = {
  PENDING: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['SHIPPED', 'CANCELLED'],
  SHIPPED: ['DELIVERED'],
  DELIVERED: [],
  CANCELLED: [],
};

let activeTab = 'overview';
let categories = [];
let periodDays = 30;

export async function renderAdmin() {
  document.title = `${t('admin.title')} — ${t('meta.title')}`;
  const main = document.getElementById('main');
  try {
    const saved = sessionStorage.getItem('mint.adminTab');
    if (TABS.includes(saved)) activeTab = saved;
  } catch { /* ignore */ }

  main.innerHTML = `
    <section class="section">
      <div class="container view">
        <div class="admin-head">
          <h1 class="page-title">${t('admin.title')}</h1>
        </div>
        <div class="tabs" role="tablist" aria-label="${t('admin.sections')}">
          ${TABS.map((id) => `<button class="tab" role="tab" id="tab-${id}" aria-controls="panel" aria-selected="${id === activeTab}" data-tab="${id}">${t(`tab.${id}`)}</button>`).join('')}
        </div>
        <div id="panel" role="tabpanel" data-panel></div>
      </div>
    </section>`;

  main.querySelector('.tabs').addEventListener('click', (e) => {
    const tab = e.target.closest('[data-tab]');
    if (!tab || tab.dataset.tab === activeTab) return;
    activeTab = tab.dataset.tab;
    try { sessionStorage.setItem('mint.adminTab', activeTab); } catch { /* ignore */ }
    main.querySelectorAll('[data-tab]').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.tab === activeTab)));
    renderPanel();
  });

  await renderPanel();
}

// Статистика теперь живёт на вкладке «Обзор»; другие вкладки её не перерисовывают.
function renderStats() {}

// ---------- Обзор (дашборд) ----------

const pct = (cur, prev) => {
  if (!prev) return cur ? t('dash.noPrev') : t('dash.same');
  const d = Math.round(((cur - prev) / prev) * 100);
  if (d === 0) return t('dash.same');
  return `${d > 0 ? '+' : '−'}${Math.abs(d)}%`;
};
const deltaClass = (cur, prev) => (!prev || cur === prev ? '' : cur > prev ? 'up' : 'down');

// Форматтеры создаются при каждом вызове, чтобы следовать выбранному языку.
const shortDate = { format: (d) => fmtDate(d, 'dayMonth') };
const fullDate = { format: (d) => fmtDate(d, 'dayMonthWeekday') };
const compact = { format: (n) => fmtCompact(n) };

async function overviewPanel(panel) {
  const draw = async () => {
    const { data: s } = await api('/stats/dashboard', { query: { days: periodDays } });
    const prevLabel = t('dash.vsPrev', { n: periodDays });
    const kpi = (label, value, cur, prev, fmt = (v) => v) => `
      <div class="kpi">
        <dt>${label}</dt>
        <dd class="kpi-value">${fmt(value)}</dd>
        <dd class="kpi-delta ${deltaClass(cur, prev)}">${pct(cur, prev)} <span>${prevLabel}</span></dd>
      </div>`;
    const maxSold = Math.max(1, ...s.topProducts.map((p) => p.sold));
    const totalStatuses = Object.values(s.statuses).reduce((a, b) => a + b, 0);

    panel.innerHTML = `
      <div class="overview-bar">
        <p class="muted">${t('dash.note', { n: periodDays })}</p>
        <div class="segmented" role="group" aria-label="${t('dash.period')}">
          ${[7, 30, 90].map((d) => `<button type="button" data-days="${d}" aria-pressed="${d === periodDays}">${t('dash.days', { n: d })}</button>`).join('')}
        </div>
      </div>

      <dl class="kpis">
        ${kpi(t('dash.revenue'), s.current.revenue, s.current.revenue, s.previous.revenue, tenge)}
        ${kpi(t('dash.orders'), s.current.orders, s.current.orders, s.previous.orders)}
        ${kpi(t('dash.avg'), s.current.avgCheck, s.current.avgCheck, s.previous.avgCheck, tenge)}
        ${kpi(t('dash.customers'), s.current.customers, s.current.customers, s.previous.customers)}
      </dl>

      <div class="dash-grid">
        <section class="panel chart-panel" aria-labelledby="rev-title">
          <div class="panel-head">
            <h2 id="rev-title">${t('dash.revByDay')}</h2>
            <span class="muted num" data-chart-readout></span>
          </div>
          <div class="chart" data-chart></div>
          <details class="chart-table">
            <summary>${t('dash.asTable')}</summary>
            <div class="table-wrap"><table>
              <thead><tr><th>${t('dash.date')}</th><th class="num">${t('dash.ordersCol')}</th><th class="num">${t('dash.revenue')}</th></tr></thead>
              <tbody>${s.daily.slice().reverse().map((d) => `<tr><td>${fullDate.format(new Date(d.date))}</td><td class="num">${d.orders}</td><td class="num">${tenge(d.revenue)}</td></tr>`).join('')}</tbody>
            </table></div>
          </details>
        </section>

        <section class="panel" aria-labelledby="st-title">
          <div class="panel-head"><h2 id="st-title">${t('dash.statuses')}</h2><span class="muted num">${totalStatuses}</span></div>
          <ul class="status-list">
            ${Object.entries(s.statuses).map(([k, v]) => `
              <li>
                <span class="dot dot-${k}" aria-hidden="true"></span>
                <span>${statusLabel(k)}</span>
                <span class="num">${v}</span>
              </li>`).join('')}
          </ul>
          ${s.statuses.PENDING ? `<button class="btn btn-ghost btn-sm btn-block" data-goto="orders">${t('dash.confirmN', { n: s.statuses.PENDING })}</button>` : ''}
        </section>

        <section class="panel" aria-labelledby="top-title">
          <div class="panel-head"><h2 id="top-title">${t('dash.top')}</h2><span class="muted">${t('common.pcs')}</span></div>
          ${s.topProducts.length === 0 ? `<p class="muted">${t('dash.noSales')}</p>` : `
          <ol class="rank-list">
            ${s.topProducts.map((p) => `
              <li>
                <div class="rank-row"><span class="rank-name">${esc(p.name)}</span><span class="num">${p.sold}</span></div>
                <div class="rank-bar"><span data-w="${Math.round((p.sold / maxSold) * 100)}"></span></div>
              </li>`).join('')}
          </ol>`}
        </section>

        <section class="panel" aria-labelledby="low-title">
          <div class="panel-head"><h2 id="low-title">${t('dash.low')}</h2><span class="muted">${t('dash.outOf', { n: s.catalog.outOfStock, total: s.catalog.products })}</span></div>
          ${s.lowStock.length === 0 ? `<p class="muted">${t('dash.allGood')}</p>` : `
          <ul class="stock-list">
            ${s.lowStock.map((p) => `
              <li>
                <span class="stock-dot ${p.stock === 0 ? 'out' : 'low'}" aria-hidden="true"></span>
                <span class="rank-name">${esc(p.name)}<span class="muted"> ${esc(dosageText(p.dosage))}</span></span>
                <span class="num">${p.stock === 0 ? t('product.none') : `${p.stock} ${t('common.pcs')}`}</span>
                <button class="icon-btn" data-restock="${p.id}" aria-label="${esc(t('dash.editStock', { name: p.name }))}" title="${t('common.edit')}">${icon('edit', 'icon icon-sm')}</button>
              </li>`).join('')}
          </ul>`}
        </section>
      </div>`;

    panel.querySelectorAll('[data-w]').forEach((el) => (el.style.width = `${el.dataset.w}%`));
    drawRevenueChart(panel.querySelector('[data-chart]'), s.daily, panel.querySelector('[data-chart-readout]'));
  };

  panel.addEventListener('click', async (e) => {
    const d = e.target.closest('[data-days]');
    if (d && Number(d.dataset.days) !== periodDays) {
      periodDays = Number(d.dataset.days);
      await draw().catch(errorToast);
    }
    const go = e.target.closest('[data-goto]');
    if (go) document.querySelector(`[data-tab="${go.dataset.goto}"]`)?.click();
    const r = e.target.closest('[data-restock]');
    if (r) {
      const { data: p } = await api(`/products/${r.dataset.restock}`);
      if (!categories.length) categories = (await api('/categories')).data;
      productForm(p, draw);
    }
  });

  await draw();
}

// График выручки: одна серия, линия 2px, мягкая заливка, перекрестие и подсказка при наведении.
function drawRevenueChart(box, daily, readout) {
  const W = 720;
  const H = 280;
  const pad = { t: 16, r: 16, b: 28, l: 56 };
  const iw = W - pad.l - pad.r;
  const ih = H - pad.t - pad.b;
  const max = Math.max(...daily.map((d) => d.revenue), 1);
  const niceMax = niceCeil(max);
  const x = (i) => pad.l + (daily.length === 1 ? iw / 2 : (i / (daily.length - 1)) * iw);
  const y = (v) => pad.t + ih - (v / niceMax) * ih;

  const pts = daily.map((d, i) => [x(i), y(d.revenue)]);
  const line = smoothPath(pts);
  const area = `${line} L${x(daily.length - 1)},${pad.t + ih} L${x(0)},${pad.t + ih} Z`;
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => niceMax * f);
  const step = Math.ceil(daily.length / 6);
  const last = pts[pts.length - 1];

  box.innerHTML = `
    <svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(t('dash.chartLabel', { n: daily.length, max: tenge(max) }))}">
      <defs>
        <linearGradient id="rev-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#84bf04" stop-opacity="0.22"/>
          <stop offset="1" stop-color="#84bf04" stop-opacity="0"/>
        </linearGradient>
      </defs>
      ${ticks.map((t) => `
        <line class="grid" x1="${pad.l}" x2="${W - pad.r}" y1="${y(t)}" y2="${y(t)}"/>
        <text class="axis" x="${pad.l - 10}" y="${y(t) + 4}" text-anchor="end">${t === 0 ? '0' : compact.format(t)}</text>`).join('')}
      ${daily.map((d, i) => (i % step === 0 || i === daily.length - 1) && !(i !== daily.length - 1 && daily.length - 1 - i < step / 2)
        ? `<text class="axis" x="${x(i)}" y="${H - 8}" text-anchor="middle">${shortDate.format(new Date(d.date))}</text>` : '').join('')}
      <path d="${area}" fill="url(#rev-fill)"/>
      <path class="series" d="${line}"/>
      <circle class="last-dot" cx="${last[0]}" cy="${last[1]}" r="5"/>
      <g class="hover" visibility="hidden">
        <line class="crosshair" y1="${pad.t}" y2="${pad.t + ih}"/>
        <circle class="hover-dot" r="5"/>
      </g>
      <rect class="hit" x="${pad.l}" y="${pad.t}" width="${iw}" height="${ih}" fill="transparent"/>
    </svg>
    <div class="chart-tip" hidden></div>`;

  const svg = box.querySelector('svg');
  const g = svg.querySelector('.hover');
  const tip = box.querySelector('.chart-tip');
  const showReadout = (i) => {
    const d = daily[i];
    readout.textContent = `${fullDate.format(new Date(d.date))}: ${tenge(d.revenue)}`;
  };
  showReadout(daily.length - 1);

  svg.querySelector('.hit').addEventListener('pointermove', (e) => {
    const rect = svg.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * W;
    const i = Math.max(0, Math.min(daily.length - 1, Math.round(((px - pad.l) / iw) * (daily.length - 1))));
    const [cx, cy] = pts[i];
    g.setAttribute('visibility', 'visible');
    g.querySelector('.crosshair').setAttribute('x1', cx);
    g.querySelector('.crosshair').setAttribute('x2', cx);
    g.querySelector('.hover-dot').setAttribute('cx', cx);
    g.querySelector('.hover-dot').setAttribute('cy', cy);
    const d = daily[i];
    tip.hidden = false;
    tip.innerHTML = `<strong>${tenge(d.revenue)}</strong><span>${fullDate.format(new Date(d.date))} · ${t('dash.tipOrders', { n: d.orders, orders: unit('orders', d.orders) })}</span>`;
    const left = (cx / W) * rect.width;
    tip.style.transform = `translate(${Math.min(Math.max(left - 80, 0), rect.width - 168)}px, ${(cy / H) * rect.height - 64}px)`;
    showReadout(i);
  });
  svg.querySelector('.hit').addEventListener('pointerleave', () => {
    g.setAttribute('visibility', 'hidden');
    tip.hidden = true;
    showReadout(daily.length - 1);
  });
}

function niceCeil(v) {
  const p = 10 ** Math.floor(Math.log10(v));
  const n = v / p;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * p;
}

// Сглаженная линия (монотонная кривая), чтобы не было выбросов выше реальных значений.
function smoothPath(pts) {
  if (pts.length < 2) return `M${pts[0][0]},${pts[0][1]}`;
  const n = pts.length;
  const dx = [], dy = [], m = [];
  for (let i = 0; i < n - 1; i++) {
    dx[i] = pts[i + 1][0] - pts[i][0];
    dy[i] = (pts[i + 1][1] - pts[i][1]) / dx[i];
  }
  m[0] = dy[0];
  m[n - 1] = dy[n - 2];
  for (let i = 1; i < n - 1; i++) m[i] = dy[i - 1] * dy[i] <= 0 ? 0 : (dy[i - 1] + dy[i]) / 2;
  let d = `M${pts[0][0]},${pts[0][1]}`;
  for (let i = 0; i < n - 1; i++) {
    const h = dx[i] / 3;
    d += ` C${pts[i][0] + h},${pts[i][1] + m[i] * h} ${pts[i + 1][0] - h},${pts[i + 1][1] - m[i + 1] * h} ${pts[i + 1][0]},${pts[i + 1][1]}`;
  }
  return d;
}

function renderPanel() {
  // Новый элемент панели на каждую вкладку — чтобы не копились обработчики событий.
  const old = document.querySelector('[data-panel]');
  const panel = old.cloneNode(false);
  old.replaceWith(panel);
  panel.setAttribute('aria-labelledby', `tab-${activeTab}`);
  panel.innerHTML = '<div class="skeleton skeleton-table"></div>';
  const views = { overview: overviewPanel, orders: ordersPanel, products: productsPanel, categories: categoriesPanel, users: usersPanel };
  return views[activeTab](panel).catch((err) => {
    panel.innerHTML = `<div class="empty"><h3>${t('admin.loadError')}</h3><p>${esc(err.message)}</p></div>`;
  });
}

// ---------- Заказы ----------

async function ordersPanel(panel) {
  let status = '';
  const draw = async () => {
    const { data } = await api('/orders', { query: { limit: 100, status } });
    panel.innerHTML = `
      <div class="panel-bar">
        <label>
          <span class="visually-hidden">${t('ao.filter')}</span>
          <select class="select" data-status-filter>
            <option value="">${t('ao.allStatuses')}</option>
            ${STATUSES.map((k) => `<option value="${k}" ${k === status ? 'selected' : ''}>${statusLabel(k)}</option>`).join('')}
          </select>
        </label>
      </div>
      ${data.length === 0 ? `<div class="empty"><h3>${t('ao.empty')}</h3><p>${t('ao.emptyText')}</p></div>` : `
      <div class="table-wrap">
        <table>
          <thead><tr><th>№</th><th>${t('ao.customer')}</th><th>${t('ao.items')}</th><th class="num">${t('ao.sum')}</th><th>${t('ao.date')}</th><th>${t('ao.status')}</th></tr></thead>
          <tbody>
            ${data.map((o) => `
              <tr>
                <td class="num">${o.id}</td>
                <td>${esc(o.user.name)}<div class="muted">${esc(o.user.email)}</div></td>
                <td>${o.items.map((i) => `${esc(i.product.name)} × ${i.quantity}`).join('<br>')}<div class="muted">${esc(o.address)}</div></td>
                <td class="num">${tenge(o.total)}</td>
                <td><span class="muted">${formatDate(o.createdAt)}</span></td>
                <td>
                  ${NEXT_STATUSES[o.status].length === 0 ? statusBadge(o.status) : `
                  <label>
                    <span class="visually-hidden">${t('ao.statusOf', { id: o.id })}</span>
                    <select class="select status-select" data-order="${o.id}">
                      <option value="" selected>${statusLabel(o.status)}</option>
                      ${NEXT_STATUSES[o.status].map((s) => `<option value="${s}">→ ${statusLabel(s)}</option>`).join('')}
                    </select>
                  </label>`}
                </td>
              </tr>`).join('')}
          </tbody>
        </table>
      </div>`}`;
  };

  panel.addEventListener('change', async (e) => {
    if (e.target.matches('[data-status-filter]')) {
      status = e.target.value;
      await draw().catch(errorToast);
    }
    if (e.target.matches('[data-order]') && e.target.value) {
      const id = e.target.dataset.order;
      const next = e.target.value;
      if (next === 'CANCELLED') {
        const ok = await confirmDialog({ title: t('orders.cancelTitle', { id }), text: t('ao.cancelText'), confirmText: t('orders.cancel') });
        if (!ok) { e.target.value = ''; return; }
      }
      e.target.disabled = true;
      try {
        await api(`/orders/${id}/status`, { method: 'PATCH', body: { status: next } });
        toast(t('ao.changed', { id, status: statusLabel(next).toLowerCase() }));
        renderStats();
        await draw();
      } catch (err) {
        errorToast(err);
        e.target.disabled = false;
        e.target.value = '';
      }
    }
  });

  await draw().catch((err) => (panel.innerHTML = `<div class="empty"><h3>${t('admin.error')}</h3><p>${esc(err.message)}</p></div>`));
}

// ---------- Товары ----------

async function productsPanel(panel) {
  let search = '';
  categories = (await api('/categories')).data;

  const draw = async () => {
    const { data, meta } = await api('/products', { query: { limit: 100, search } });
    const tbody = data.map((p) => `
      <tr>
        <td class="num">${p.id}</td>
        <td>
          <div class="product-cell">
            ${p.imageUrl ? `<img class="admin-thumb" src="${esc(p.imageUrl)}" alt="" loading="lazy" referrerpolicy="no-referrer">` : `<span class="admin-thumb admin-thumb-icon">${icon(formIconName(p.form), 'icon icon-sm')}</span>`}
            <div><strong>${esc(p.name)}</strong><div class="muted">${esc(formName(p.form))}${p.dosage ? ` · ${esc(dosageText(p.dosage))}` : ''} · ${esc(p.manufacturer)}</div></div>
          </div>
        </td>
        <td>${esc(categoryLabel(p.category))}</td>
        <td class="num">${tenge(p.price)}</td>
        <td class="num">${p.stock === 0 ? '<span class="badge badge-out">0</span>' : p.stock}</td>
        <td>${p.requiresPrescription ? `<span class="badge badge-rx">${t('ap.yes')}</span>` : `<span class="muted">${t('ap.no')}</span>`}</td>
        <td class="actions">
          <button class="icon-btn" data-edit="${p.id}" aria-label="${esc(t('common.edit'))} ${esc(p.name)}" title="${t('common.edit')}">${icon('edit', 'icon icon-sm')}</button>
          <button class="icon-btn" data-delete="${p.id}" data-name="${esc(p.name)}" aria-label="${esc(t('common.delete'))} ${esc(p.name)}" title="${t('common.delete')}">${icon('trash', 'icon icon-sm')}</button>
        </td>
      </tr>`).join('');

    panel.querySelector('[data-table]').innerHTML = data.length === 0
      ? `<div class="empty"><h3>${t('ap.empty')}</h3><p>${t('ap.emptyText')}</p></div>`
      : `<div class="table-wrap"><table>
          <thead><tr><th class="num">ID</th><th>${t('ap.product')}</th><th>${t('product.category')}</th><th class="num">${t('ap.price')}</th><th class="num">${t('ap.stock')}</th><th>${t('ap.rx')}</th><th><span class="visually-hidden">${t('common.actions')}</span></th></tr></thead>
          <tbody>${tbody}</tbody></table></div>`;
    panel.querySelector('[data-total]').textContent = t('common.total', { n: meta.total });
    panel._products = data;
  };

  panel.innerHTML = `
    <div class="panel-bar">
      <input class="input" type="search" placeholder="${esc(t('ap.search'))}" aria-label="${esc(t('ap.searchAria'))}" data-search>
      <span class="muted" data-total></span>
      <button class="btn btn-primary btn-sm" data-create>${icon('plus', 'icon icon-sm')}${t('ap.new')}</button>
    </div>
    <div data-table></div>`;

  let t;
  panel.querySelector('[data-search]').addEventListener('input', (e) => {
    clearTimeout(t);
    t = setTimeout(() => {
      search = e.target.value.trim();
      draw().catch(errorToast);
    }, 250);
  });

  panel.addEventListener('click', async (e) => {
    if (e.target.closest('[data-create]')) productForm(null, draw);
    const edit = e.target.closest('[data-edit]');
    if (edit) productForm(panel._products.find((p) => p.id === Number(edit.dataset.edit)), draw);
    const del = e.target.closest('[data-delete]');
    if (del) {
      const ok = await confirmDialog({ title: t('ap.deleteTitle', { name: del.dataset.name }), text: t('ap.deleteText') });
      if (!ok) return;
      try {
        await api(`/products/${del.dataset.delete}`, { method: 'DELETE' });
        toast(t('ap.deleted'));
        renderStats();
        await draw();
      } catch (err) {
        errorToast(err);
      }
    }
  });

  await draw();
}

function productForm(product, onSaved) {
  const p = product ?? { name: '', manufacturer: '', form: 'Таблетки', dosage: '', price: '', stock: 0, requiresPrescription: false, description: '', categoryId: categories[0]?.id };
  const forms = ['Таблетки', 'Капсулы', 'Сироп', 'Раствор', 'Капли', 'Спрей', 'Порошок', 'Пастилки', 'Мазь', 'Гель', 'Крем', 'Шампунь', 'Пластырь', 'Прибор', 'Тест-полоски', 'Раствор для инъекций'];
  if (!forms.includes(p.form)) forms.push(p.form);

  openDrawer({
    title: product ? t('ap.formTitle', { id: product.id }) : t('ap.new'),
    submitText: product ? t('common.save') : t('common.create'),
    body: `
      <div class="field"><label for="f-name">${t('ap.name')}</label><input class="input" id="f-name" name="name" value="${esc(p.name)}" required></div>
      <div class="form-row">
        <div class="field"><label for="f-cat">${t('product.category')}</label>
          <select id="f-cat" name="categoryId">${categories.map((c) => `<option value="${c.id}" ${c.id === (p.categoryId ?? p.category?.id) ? 'selected' : ''}>${esc(categoryLabel(c))}</option>`).join('')}</select>
        </div>
        <div class="field"><label for="f-form">${t('product.form')}</label>
          <select id="f-form" name="form">${forms.map((f) => `<option value="${esc(f)}" ${f === p.form ? 'selected' : ''}>${esc(formName(f))}</option>`).join('')}</select>
        </div>
      </div>
      <div class="form-row">
        <div class="field"><label for="f-dosage">${t('product.dosage')}</label><input class="input" id="f-dosage" name="dosage" value="${esc(p.dosage ?? '')}" placeholder="${esc(t('ap.dosagePh'))}"></div>
        <div class="field"><label for="f-man">${t('product.manufacturer')}</label><input class="input" id="f-man" name="manufacturer" value="${esc(p.manufacturer)}" required></div>
      </div>
      <div class="form-row">
        <div class="field"><label for="f-price">${t('ap.priceT')}</label><input class="input" id="f-price" name="price" type="number" min="1" step="1" inputmode="numeric" value="${esc(p.price)}" required></div>
        <div class="field"><label for="f-stock">${t('ap.stockPcs')}</label><input class="input" id="f-stock" name="stock" type="number" min="0" step="1" inputmode="numeric" value="${esc(p.stock)}" required></div>
      </div>
      <label class="check"><input type="checkbox" name="requiresPrescription" ${p.requiresPrescription ? 'checked' : ''}> ${t('ap.rxCheck')}</label>
      <div class="field"><label for="f-img">${t('ap.photo')}</label><input class="input" id="f-img" name="imageUrl" type="url" value="${esc(p.imageUrl ?? '')}" placeholder="https://upload.wikimedia.org/..."><span class="hint">${t('ap.photoHint')}</span></div>
      <div class="field"><label for="f-credit">${t('ap.credit')}</label><input class="input" id="f-credit" name="imageCredit" value="${esc(p.imageCredit ?? '')}" placeholder="${esc(t('ap.creditPh'))}"></div>
      <div class="field"><label for="f-desc">${t('ap.desc')}</label><textarea class="textarea" id="f-desc" name="description">${esc(p.description ?? '')}</textarea></div>`,
    onSubmit: async (form) => {
      const toInt = (v) => (v === '' ? undefined : Number(v));
      const body = {
        name: form.name.value,
        categoryId: Number(form.categoryId.value),
        form: form.form.value,
        dosage: form.dosage.value.trim() || null,
        manufacturer: form.manufacturer.value,
        price: toInt(form.price.value),
        stock: toInt(form.stock.value),
        requiresPrescription: form.requiresPrescription.checked,
        description: form.description.value.trim() || null,
        imageUrl: form.imageUrl.value.trim() || null,
        imageCredit: form.imageCredit.value.trim() || null,
      };
      if (product) {
        await api(`/products/${product.id}`, { method: 'PATCH', body });
        toast(t('ap.saved'));
      } else {
        const { data } = await api('/products', { method: 'POST', body });
        toast(t('ap.created', { name: esc(data.name) }));
      }
      invalidateCategories();
      renderStats();
      await onSaved();
    },
  });
}

// ---------- Категории ----------

async function categoriesPanel(panel) {
  const draw = async () => {
    categories = (await api('/categories')).data;
    panel.innerHTML = `
      <div class="panel-bar">
        <span class="muted">${t('common.total', { n: categories.length })}</span>
        <button class="btn btn-primary btn-sm" data-create>${icon('plus', 'icon icon-sm')}${t('ac.new')}</button>
      </div>
      <div class="table-wrap"><table>
        <thead><tr><th class="num">ID</th><th>${t('ap.name')}</th><th>${t('ac.slug')}</th><th class="num">${t('ac.count')}</th><th><span class="visually-hidden">${t('common.actions')}</span></th></tr></thead>
        <tbody>${categories.map((c) => `
          <tr>
            <td class="num">${c.id}</td>
            <td><strong>${esc(categoryLabel(c))}</strong>${c.description ? `<div class="muted">${esc(c.description)}</div>` : ''}</td>
            <td><code>${esc(c.slug)}</code></td>
            <td class="num">${c._count.products}</td>
            <td class="actions">
              <button class="icon-btn" data-edit="${c.id}" aria-label="${esc(t('common.edit'))} ${esc(c.name)}" title="${t('common.edit')}">${icon('edit', 'icon icon-sm')}</button>
              <button class="icon-btn" data-delete="${c.id}" data-name="${esc(c.name)}" aria-label="${esc(t('common.delete'))} ${esc(c.name)}" title="${t('common.delete')}">${icon('trash', 'icon icon-sm')}</button>
            </td>
          </tr>`).join('')}</tbody>
      </table></div>`;
  };

  panel.addEventListener('click', async (e) => {
    if (e.target.closest('[data-create]')) categoryForm(null, draw);
    const edit = e.target.closest('[data-edit]');
    if (edit) categoryForm(categories.find((c) => c.id === Number(edit.dataset.edit)), draw);
    const del = e.target.closest('[data-delete]');
    if (del) {
      const ok = await confirmDialog({ title: t('ac.deleteTitle', { name: del.dataset.name }), text: t('ac.deleteText') });
      if (!ok) return;
      try {
        await api(`/categories/${del.dataset.delete}`, { method: 'DELETE' });
        toast(t('ac.deleted'));
        invalidateCategories();
        await draw();
      } catch (err) {
        errorToast(err);
      }
    }
  });

  await draw();
}

function categoryForm(cat, onSaved) {
  const c = cat ?? { name: '', slug: '', description: '' };
  openDrawer({
    title: cat ? t('ac.formTitle', { id: cat.id }) : t('ac.new'),
    submitText: cat ? t('common.save') : t('common.create'),
    body: `
      <div class="field"><label for="c-name">${t('ap.name')}</label><input class="input" id="c-name" name="name" value="${esc(c.name)}" required></div>
      <div class="field"><label for="c-slug">${t('ac.slug')}</label><input class="input" id="c-slug" name="slug" value="${esc(c.slug)}" required placeholder="pain-relief"><span class="hint">${t('ac.slugHint')}</span></div>
      <div class="field"><label for="c-desc">${t('ap.desc')}</label><textarea class="textarea" id="c-desc" name="description">${esc(c.description ?? '')}</textarea></div>`,
    onSubmit: async (form) => {
      const body = { name: form.name.value, slug: form.slug.value, description: form.description.value.trim() || null };
      if (cat) await api(`/categories/${cat.id}`, { method: 'PATCH', body });
      else await api('/categories', { method: 'POST', body });
      toast(cat ? t('ac.saved') : t('ac.created'));
      invalidateCategories();
      await onSaved();
    },
  });
}

// ---------- Пользователи ----------

async function usersPanel(panel) {
  const draw = async () => {
    const { data } = await api('/users');
    panel.innerHTML = `
      <div class="table-wrap"><table>
        <thead><tr><th class="num">ID</th><th>${t('au.name')}</th><th>Email</th><th>${t('au.role')}</th><th class="num">${t('au.ordersCount')}</th><th>${t('au.registered')}</th><th><span class="visually-hidden">${t('common.actions')}</span></th></tr></thead>
        <tbody>${data.map((u) => {
          const self = u.id === auth.user.id;
          return `
          <tr>
            <td class="num">${u.id}</td>
            <td><strong>${esc(u.name)}</strong>${self ? ` <span class="muted">${t('au.you')}</span>` : ''}</td>
            <td>${esc(u.email)}</td>
            <td>${self ? (u.role === 'ADMIN' ? t('au.admin') : t('au.user')) : `
              <label><span class="visually-hidden">${esc(t('au.roleOf', { name: u.name }))}</span>
              <select class="select status-select" data-role="${u.id}">
                <option value="USER" ${u.role === 'USER' ? 'selected' : ''}>${t('au.user')}</option>
                <option value="ADMIN" ${u.role === 'ADMIN' ? 'selected' : ''}>${t('au.admin')}</option>
              </select></label>`}</td>
            <td class="num">${u._count.orders}</td>
            <td><span class="muted">${formatDate(u.createdAt)}</span></td>
            <td class="actions">${self ? '' : `<button class="icon-btn" data-delete="${u.id}" data-name="${esc(u.name)}" aria-label="${esc(t('common.delete'))} ${esc(u.name)}" title="${t('common.delete')}">${icon('trash', 'icon icon-sm')}</button>`}</td>
          </tr>`;
        }).join('')}</tbody>
      </table></div>`;
  };

  panel.addEventListener('change', async (e) => {
    const sel = e.target.closest('[data-role]');
    if (!sel) return;
    try {
      await api(`/users/${sel.dataset.role}/role`, { method: 'PATCH', body: { role: sel.value } });
      toast(t('au.roleChanged'));
    } catch (err) {
      errorToast(err);
      await draw();
    }
  });

  panel.addEventListener('click', async (e) => {
    const del = e.target.closest('[data-delete]');
    if (!del) return;
    const ok = await confirmDialog({ title: t('au.deleteTitle', { name: del.dataset.name }), text: t('au.deleteText') });
    if (!ok) return;
    try {
      await api(`/users/${del.dataset.delete}`, { method: 'DELETE' });
      toast(t('au.deleted'));
      renderStats();
      await draw();
    } catch (err) {
      errorToast(err);
    }
  });

  await draw();
}
