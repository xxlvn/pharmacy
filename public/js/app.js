// Клиентское приложение интернет-аптеки: роутер на hash и страницы.
import { api } from './api.js';
import { auth, cart, subscribe } from './store.js';
import {
  esc, tenge, formatDate, icon, formIcon, statusBadge,
  toast, errorToast, renderFormError, setLoading, confirmDialog,
} from './ui.js';
import {
  t, unit, lang, setLang, onLangChange, LANGS, fmtDate,
  categoryName, formName, dosageText,
} from './i18n.js';
import { PAGES, INFO_LINKS, SUPPORT_EMAIL } from './info.js';
import { OFFER } from './offer.js';
import { PRIVACY } from './privacy.js';

// Юридические документы с оглавлением (см. renderDoc)
const DOCS = { offer: OFFER, privacy: PRIVACY };
import { renderAdmin } from './admin.js';

const main = document.getElementById('main');

// ---------- Роутер ----------

const routes = [
  { pattern: /^\/$/, view: renderCatalog, nav: 'catalog' },
  { pattern: /^\/product\/(\d+)$/, view: renderProduct, nav: 'catalog' },
  { pattern: /^\/cart$/, view: renderCart },
  { pattern: /^\/login$/, view: renderLogin },
  { pattern: /^\/register$/, view: renderRegister },
  { pattern: /^\/orders$/, view: renderOrders, nav: 'orders', auth: 'user' },
  { pattern: /^\/account$/, view: renderAccount, auth: 'user' },
  { pattern: /^\/admin$/, view: renderAdmin, nav: 'admin', auth: 'admin' },
  { pattern: /^\/info\/([a-z-]+)$/, view: renderInfo },
];

function parseHash() {
  const raw = location.hash.slice(1) || '/';
  const [path, qs = ''] = raw.split('?');
  return { path: path || '/', query: new URLSearchParams(qs) };
}

export function navigate(path) {
  location.hash = path;
}

let renderToken = 0;
let lastPath = null;

async function router({ keepScroll = false } = {}) {
  const { path, query } = parseHash();
  const route = routes.find((r) => r.pattern.test(path));
  const token = ++renderToken;

  // Новая страница открывается сверху; фильтры каталога и смена языка прокрутку не сбрасывают.
  if (path !== lastPath && !keepScroll) window.scrollTo(0, 0);
  lastPath = path;

  document.querySelectorAll('[data-nav]').forEach((a) => {
    if (route && a.dataset.nav === route.nav) a.setAttribute('aria-current', 'page');
    else a.removeAttribute('aria-current');
  });
  updateNav();

  if (!route) {
    main.innerHTML = `<section class="section"><div class="container view">${emptyState('search', t('err.notFoundTitle'), t('err.notFoundText'), `<a class="btn btn-primary" href="#/">${t('common.toCatalog')}</a>`)}</div></section>`;
    return;
  }

  if (route.auth && !auth.isAuthed) {
    sessionStorage.setItem('mint.redirect', location.hash);
    navigate('/login');
    return;
  }
  if (route.auth === 'admin' && !auth.isAdmin) {
    main.innerHTML = `<section class="section"><div class="container view">${emptyState('shield', t('err.forbiddenTitle'), t('err.forbiddenText'), `<a class="btn btn-primary" href="#/">${t('common.toCatalog')}</a>`)}</div></section>`;
    return;
  }

  const params = path.match(route.pattern).slice(1);
  await route.view({ params, query, isCurrent: () => token === renderToken });
  if (token === renderToken && !keepScroll) main.focus({ preventScroll: true });
}

window.addEventListener('hashchange', () => router());

// Смена языка: перерисовываем шапку, футер и текущую страницу на месте.
onLangChange(() => {
  applyStaticText();
  renderHeader();
  renderFooter();
  main.innerHTML = '';
  router({ keepScroll: true });
});

// ---------- Статические тексты в index.html ----------

function applyStaticText() {
  document.title = t('meta.title');
  document.querySelectorAll('[data-i18n]').forEach((el) => (el.textContent = t(el.dataset.i18n)));
  document.querySelectorAll('[data-i18n-aria]').forEach((el) => el.setAttribute('aria-label', t(el.dataset.i18nAria)));
}

// ---------- Шапка: аккаунт и корзина ----------

const initial = (name) => (name || '?').trim().charAt(0).toUpperCase();

function renderHeader() {
  const account = document.querySelector('[data-account]');
  if (auth.isAuthed) {
    const u = auth.user;
    account.innerHTML = `
      <button type="button" class="avatar-btn" data-account-toggle aria-haspopup="menu" aria-expanded="false"
        aria-controls="account-menu" aria-label="${esc(t('account.menu'))}: ${esc(u.name)}">
        <span class="avatar" aria-hidden="true">${esc(initial(u.name))}</span>
      </button>
      <div class="account-menu" id="account-menu" role="menu" hidden>
        <div class="account-menu-head" role="presentation">
          <strong>${esc(u.name)}</strong>
          <span>${esc(u.email)}</span>
        </div>
        <a role="menuitem" href="#/account">${icon('user', 'icon icon-sm')}${t('account.profile')}</a>
        <a role="menuitem" href="#/orders">${icon('receipt', 'icon icon-sm')}${t('nav.orders')}</a>
        ${auth.isAdmin ? `<a role="menuitem" href="#/admin">${icon('dashboard', 'icon icon-sm')}${t('account.adminPanel')}</a>` : ''}
        <button type="button" role="menuitem" class="danger" data-logout>${icon('logout', 'icon icon-sm')}${t('account.logout')}</button>
      </div>`;
  } else {
    account.innerHTML = `<a class="btn btn-ghost btn-sm" href="#/login">${t('account.login')}</a>`;
  }

  const langBox = document.querySelector('[data-header-lang]');
  langBox.setAttribute('aria-label', t('foot.lang'));
  langBox.innerHTML = LANGS.map((l) => `
    <button type="button" data-lang="${l.code}" lang="${l.code}" aria-pressed="${l.code === lang()}" title="${l.label}">${l.short}</button>`).join('');

  updateNav();
  renderCartCount(false);
}

// «Каталог» в шапке скрыт на самой странице каталога: кнопка вела бы туда же, где вы уже есть.
// «Мои заказы» и панель управления живут в меню аккаунта.
function updateNav() {
  const onCatalog = parseHash().path === '/';
  const nav = document.querySelector('.main-nav');
  nav.querySelector('[data-nav="catalog"]').hidden = onCatalog;
  nav.hidden = onCatalog;
  // подсветка текущего раздела в меню аккаунта
  document.querySelectorAll('.account-menu a').forEach((a) => {
    if (a.getAttribute('href') === location.hash) a.setAttribute('aria-current', 'page');
    else a.removeAttribute('aria-current');
  });
}

// ---------- Меню аккаунта ----------
// Открывается по клику на аватар; закрывается кликом вне меню, Esc и выбором пункта.
// ↑/↓ переводят фокус между пунктами, Esc возвращает фокус на аватар.

function accountMenu() {
  return {
    btn: document.querySelector('[data-account-toggle]'),
    menu: document.getElementById('account-menu'),
  };
}

function openAccountMenu() {
  const { btn, menu } = accountMenu();
  if (!btn || !menu.hidden) return;
  menu.hidden = false;
  btn.setAttribute('aria-expanded', 'true');
  requestAnimationFrame(() => menu.classList.add('open'));
  menu.querySelector('[role="menuitem"]')?.focus({ preventScroll: true });
}

function closeAccountMenu({ focusButton = false } = {}) {
  const { btn, menu } = accountMenu();
  if (!btn || menu.hidden) return;
  menu.classList.remove('open');
  btn.setAttribute('aria-expanded', 'false');
  setTimeout(() => { if (!menu.classList.contains('open')) menu.hidden = true; }, 130);
  if (focusButton) btn.focus();
}

document.addEventListener('click', (e) => {
  const toggle = e.target.closest('[data-account-toggle]');
  if (toggle) {
    const { menu } = accountMenu();
    return menu.hidden ? openAccountMenu() : closeAccountMenu();
  }
  if (e.target.closest('.account-menu [role="menuitem"]') || !e.target.closest('.account-menu')) closeAccountMenu();
});

document.addEventListener('keydown', (e) => {
  const { menu } = accountMenu();
  if (!menu || menu.hidden) return;
  if (e.key === 'Escape') return closeAccountMenu({ focusButton: true });
  if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
  e.preventDefault();
  const items = [...menu.querySelectorAll('[role="menuitem"]')];
  const i = items.indexOf(document.activeElement);
  const next = e.key === 'ArrowDown' ? (i + 1) % items.length : (i - 1 + items.length) % items.length;
  items[next].focus();
});

window.addEventListener('hashchange', () => closeAccountMenu());

function renderCartCount(bump = true) {
  const el = document.querySelector('[data-cart-count]');
  const n = cart.count;
  el.hidden = n === 0;
  el.textContent = n;
  if (bump && n > 0) {
    el.classList.remove('bump');
    void el.offsetWidth;
    el.classList.add('bump');
  }
}

document.addEventListener('click', (e) => {
  if (e.target.closest('[data-logout]')) {
    auth.clear();
    toast(t('toast.loggedOut'));
    navigate('/');
  }
  const l = e.target.closest('[data-lang]');
  if (l) setLang(l.dataset.lang);
});

subscribe((type) => {
  if (type === 'auth') {
    renderHeader();
    renderFooter();
  }
  if (type === 'cart') renderCartCount();
});

// ---------- Футер ----------

function renderFooter() {
  const footer = document.querySelector('[data-footer]');
  const link = (slug) => `<li><a href="#/info/${slug}">${esc(PAGES[slug][lang()].title)}</a></li>`;
  footer.innerHTML = `
    <div class="container">
      <div class="footer-cols">
        <nav aria-labelledby="f-info">
          <h2 id="f-info">${t('foot.info')}</h2>
          <ul>
            ${INFO_LINKS.info.map(link).join('')}
            <li><a href="#/">${t('nav.catalog')}</a></li>
          </ul>
        </nav>
        <nav aria-labelledby="f-buyer">
          <h2 id="f-buyer">${t('foot.buyer')}</h2>
          <ul>
            <li><a href="#/orders">${t('foot.orderStatus')}</a></li>
            ${INFO_LINKS.buyer.map(link).join('')}
          </ul>
        </nav>
        <nav aria-labelledby="f-docs">
          <h2 id="f-docs">${t('foot.docs')}</h2>
          <ul>${INFO_LINKS.docs.map(link).join('')}</ul>
        </nav>
        <div>
          <h2>${t('foot.contacts')}</h2>
          <ul>
            <li>Email: <a href="mailto:${SUPPORT_EMAIL}">${SUPPORT_EMAIL}</a></li>
            <li>${t('foot.hours')}</li>
          </ul>
        </div>
      </div>
    </div>
    <div class="footer-bottom">
      <div class="container footer-bottom-row">
        <span>${esc(t('foot.copy'))}</span>
        <span>${esc(t('foot.city'))}</span>
        <ul class="lang-switch" role="group" aria-label="${t('foot.lang')}">
          ${LANGS.map((l) => `<li><button type="button" data-lang="${l.code}" lang="${l.code}" aria-pressed="${l.code === lang()}">${l.label}</button></li>`).join('')}
        </ul>
      </div>
    </div>`;
}

// ---------- Общие фрагменты ----------

function emptyState(iconName, title, text, action = '') {
  return `<div class="empty">${icon(iconName)}<h3>${esc(title)}</h3><p>${esc(text)}</p>${action}</div>`;
}

// Фирменная деталь: точка наличия (зелёная, жёлтая, серая) вместо цветных бейджей.
function stockBadge(p) {
  if (p.stock === 0) return `<span class="stock"><span class="stock-dot out" aria-hidden="true"></span>${t('stock.out')}</span>`;
  if (p.stock <= 5) return `<span class="stock"><span class="stock-dot low" aria-hidden="true"></span>${t('stock.low', { n: p.stock })}</span>`;
  return `<span class="stock"><span class="stock-dot ok" aria-hidden="true"></span>${t('stock.ok')}</span>`;
}

const rxBadge = (p) => (p.requiresPrescription ? `<span class="badge badge-rx">${t('rx')}</span>` : '');

const subline = (p) => `${esc(formName(p.form))}${p.dosage ? ` · ${esc(dosageText(p.dosage))}` : ''}`;

// Фото препарата или иконка формы выпуска, если фото нет или оно не загрузилось.
function productArt(p, cls = 'product-art') {
  const out = p.stock === 0 ? 'is-out' : '';
  if (!p.imageUrl) return `<div class="${cls} ${out}">${icon(formIcon(p.form))}</div>`;
  return `<div class="${cls} has-photo ${out}" data-fallback-icon="${formIcon(p.form)}">
    <img src="${esc(p.imageUrl)}" alt="${esc(p.name)}" loading="lazy" decoding="async" referrerpolicy="no-referrer">
  </div>`;
}

// Обработчик ошибок загрузки фото (inline onerror запрещён политикой CSP).
document.addEventListener('error', (e) => {
  const img = e.target;
  if (!(img instanceof HTMLImageElement)) return;
  const box = img.closest('[data-fallback-icon]');
  if (!box) return;
  box.classList.remove('has-photo');
  box.innerHTML = icon(box.dataset.fallbackIcon);
}, true);

function productCard(p) {
  const out = p.stock === 0;
  return `
    <article class="product-card">
      ${productArt(p)}
      <div class="product-body">
        <div class="product-meta">${stockBadge(p)}${rxBadge(p)}</div>
        <h3 class="product-title"><a href="#/product/${p.id}">${esc(p.name)}</a></h3>
        <p class="product-sub">${subline(p)}</p>
        <p class="product-sub">${esc(p.manufacturer)}</p>
        <div class="product-foot">
          <span class="price">${tenge(p.price)}</span>
          <button class="btn btn-primary add-btn" data-add="${p.id}" ${out ? 'disabled' : ''}
            aria-label="${esc(out ? t('stock.out') : t('card.add', { name: p.name }))}">${icon(out ? 'x' : 'plus')}</button>
        </div>
      </div>
    </article>`;
}

function addToCart(product) {
  const added = cart.add(product, 1);
  if (added === 0) {
    toast(t('cart.limit', { name: esc(product.name), n: product.stock }), { type: 'error' });
    return;
  }
  popPill();
  toast(t('cart.added', { name: esc(product.name) }));
}

// Блистер в hero: при добавлении в корзину одна таблетка «выдавливается».
function popPill() {
  const pill = document.querySelector('.blister .is-pill:not(.is-taken)');
  if (pill) pill.classList.add('is-taken');
}

// ---------- Каталог ----------

let categoriesCache = null;

async function loadCategories() {
  if (!categoriesCache) categoriesCache = (await api('/categories')).data;
  return categoriesCache;
}
export function invalidateCategories() {
  categoriesCache = null;
}

let lastProducts = [];

async function renderCatalog({ query, isCurrent }) {
  document.title = t('meta.title');
  const state = {
    search: query.get('search') || '',
    categoryId: query.get('categoryId') || '',
    inStock: query.get('inStock') === 'true',
    prescription: query.get('prescription') || '',
    sort: query.get('sort') || 'name',
    page: Number(query.get('page')) || 1,
  };

  const firstRender = !main.querySelector('[data-catalog]');
  if (firstRender) {
    const pills = [0, 2, 3, 5, 6, 8, 9, 11];
    main.innerHTML = `
      <section class="hero">
        <div class="container hero-grid">
          <div>
            <h1 class="hero-anim d1">${t('hero.title')}</h1>
            <p class="hero-lead hero-anim d2">${t('hero.lead')}</p>
            <form class="search hero-anim d3" role="search" data-search>
              <label>
                ${icon('search')}
                <span class="visually-hidden">${t('hero.searchLabel')}</span>
                <input type="search" name="search" placeholder="${esc(t('hero.placeholder'))}" autocomplete="off" value="${esc(state.search)}">
              </label>
              <button class="btn btn-primary" type="submit">${t('hero.find')}</button>
            </form>
            <ul class="hero-facts hero-anim d4" data-facts>
              <li>${icon('box')}<span data-fact-total>${t('hero.loading')}</span></li>
              <li>${icon('truck')}${t('hero.delivery')}</li>
              <li>${icon('doc')}${t('hero.rx')}</li>
            </ul>
          </div>
          <div class="blister" aria-hidden="true">${Array.from({ length: 12 }, (_, i) => `<span class="${pills.includes(i) ? 'is-pill' : ''}"></span>`).join('')}</div>
        </div>
      </section>
      <section class="section" data-catalog>
        <div class="container catalog-layout">
          <div class="chips-wrap" data-chips-wrap>
            <button type="button" class="chips-arrow prev" data-chips-scroll="-1" aria-label="${t('catalog.scrollLeft')}" hidden>${icon('chevronLeft')}</button>
            <div class="chips" data-chips role="group" aria-label="${t('catalog.categories')}"></div>
            <button type="button" class="chips-arrow next" data-chips-scroll="1" aria-label="${t('catalog.scrollRight')}" hidden>${icon('chevronRight')}</button>
          </div>
          <div class="toolbar">
            <div>
              <h2 data-catalog-title>${t('catalog.title')}</h2>
              <p class="result-count" data-count aria-live="polite"></p>
            </div>
            <div class="filters">
              <label class="check"><input type="checkbox" data-filter="inStock"> ${t('catalog.inStock')}</label>
              <label class="check"><input type="checkbox" data-filter="otc"> ${t('catalog.otc')}</label>
              <label>
                <span class="visually-hidden">${t('catalog.sort')}</span>
                <select class="select" data-filter="sort">
                  ${['name', 'price_asc', 'price_desc', 'newest'].map((s) => `<option value="${s}">${t(`sort.${s}`)}</option>`).join('')}
                </select>
              </label>
            </div>
          </div>
          <div data-results></div>
        </div>
      </section>`;

    main.querySelector('[data-search]').addEventListener('submit', (e) => {
      e.preventDefault();
      updateCatalogQuery({ search: e.target.search.value.trim(), page: 1 });
      document.querySelector('[data-catalog]').scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
    main.querySelector('[data-chips]').addEventListener('click', (e) => {
      const chip = e.target.closest('[data-category]');
      if (chip) updateCatalogQuery({ categoryId: chip.dataset.category, page: 1 });
    });
    setupChipsScroll(main.querySelector('[data-chips-wrap]'));
    playHeroIntro(main.querySelector('.hero'));
    setupBlisterTilt(main.querySelector('.blister'));
    main.querySelector('.filters').addEventListener('change', (e) => {
      const f = e.target.dataset.filter;
      if (f === 'inStock') updateCatalogQuery({ inStock: e.target.checked ? 'true' : '', page: 1 });
      if (f === 'otc') updateCatalogQuery({ prescription: e.target.checked ? 'false' : '', page: 1 });
      if (f === 'sort') updateCatalogQuery({ sort: e.target.value === 'name' ? '' : e.target.value, page: 1 });
    });
    main.querySelector('[data-results]').addEventListener('click', (e) => {
      const add = e.target.closest('[data-add]');
      if (add) {
        const p = lastProducts.find((x) => x.id === Number(add.dataset.add));
        if (p) addToCart(p);
      }
      const page = e.target.closest('[data-page]');
      if (page) {
        updateCatalogQuery({ page: page.dataset.page });
        document.querySelector('[data-catalog]').scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
      if (e.target.closest('[data-reset]')) navigate('/');
    });
  }

  // синхронизируем контролы со строкой запроса
  main.querySelector('[data-search] input').value = state.search;
  main.querySelector('[data-filter="inStock"]').checked = state.inStock;
  main.querySelector('[data-filter="otc"]').checked = state.prescription === 'false';
  main.querySelector('[data-filter="sort"]').value = state.sort;

  const results = main.querySelector('[data-results]');
  const count = main.querySelector('[data-count]');
  results.innerHTML = `<div class="product-grid">${'<div class="skeleton skeleton-card"></div>'.repeat(8)}</div>`;

  try {
    const [categories, list] = await Promise.all([
      loadCategories(),
      api('/products', {
        query: {
          search: state.search,
          categoryId: state.categoryId,
          inStock: state.inStock ? 'true' : '',
          prescription: state.prescription,
          sort: state.sort,
          page: state.page,
          limit: 12,
        },
      }),
    ]);
    if (!isCurrent()) return;

    const totalAll = categories.reduce((s, c) => s + c._count.products, 0);
    const factTotal = main.querySelector('[data-fact-total]');
    if (factTotal) factTotal.textContent = t('hero.facts', { n: totalAll, products: unit('products', totalAll), c: categories.length });
    main.querySelector('[data-chips]').innerHTML = [
      `<button class="chip" data-category="" aria-pressed="${!state.categoryId}">${t('catalog.all')} <span class="chip-count">${totalAll}</span></button>`,
      ...categories.map(
        (c) => `<button class="chip" data-category="${c.id}" aria-pressed="${String(c.id) === state.categoryId}">${esc(categoryName(c))} <span class="chip-count">${c._count.products}</span></button>`,
      ),
    ].join('');

    updateChipsArrows();
    // выбранная категория должна быть видна в ленте
    const strip = main.querySelector('[data-chips]');
    const active = strip.querySelector('.chip[aria-pressed="true"]');
    if (active && (active.offsetLeft < strip.scrollLeft || active.offsetLeft + active.offsetWidth > strip.scrollLeft + strip.clientWidth)) {
      strip.scrollLeft = active.offsetLeft - 48;
    }

    const activeCat = categories.find((c) => String(c.id) === state.categoryId);
    main.querySelector('[data-catalog-title]').textContent = state.search
      ? t('catalog.results', { q: state.search })
      : (activeCat ? categoryName(activeCat) : t('catalog.title'));

    lastProducts = list.data;
    const { total, page, pages } = list.meta;
    count.textContent = `${total} ${unit('items', total)}`;

    if (list.data.length === 0) {
      results.innerHTML = emptyState('search', t('catalog.emptyTitle'), t('catalog.emptyText'), `<button class="btn btn-ghost" data-reset>${t('catalog.reset')}</button>`);
      return;
    }

    results.innerHTML = `
      <div class="product-grid">${list.data.map(productCard).join('')}</div>
      ${pages > 1 ? `
        <nav class="pagination" aria-label="${t('catalog.pages')}">
          <button class="btn btn-ghost btn-sm" data-page="${page - 1}" ${page <= 1 ? 'disabled' : ''}>${t('catalog.prev')}</button>
          <span class="page-info">${t('catalog.pageOf', { page, pages })}</span>
          <button class="btn btn-ghost btn-sm" data-page="${page + 1}" ${page >= pages ? 'disabled' : ''}>${t('catalog.next')}</button>
        </nav>` : ''}`;
  } catch (err) {
    if (!isCurrent()) return;
    count.textContent = '';
    results.innerHTML = emptyState('alert', t('catalog.errorTitle'), err.message, `<button class="btn btn-primary" data-reset>${t('common.retry')}</button>`);
  }
}

// ---------- Анимации первого экрана ----------

const EASE_OUT = 'cubic-bezier(0.23, 1, 0.32, 1)';
const reduceMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
let heroIntroPlayed = false;

// Появление hero играет один раз за визит: при возврате в каталог со страницы товара
// или при смене языка повторять его незачем, это уже не первое впечатление.
function playHeroIntro(hero) {
  if (heroIntroPlayed || !hero) return;
  heroIntroPlayed = true;
  if (reduceMotion()) return;
  hero.classList.add('hero-intro');
  // Таблетки «выщёлкиваются» в ячейки по очереди после того, как блистер встал на место
  hero.querySelectorAll('.blister span').forEach((pill, i) => {
    pill.animate(
      [{ opacity: 0, transform: 'scale(0.85)' }, { opacity: 1, transform: 'scale(1)' }],
      { duration: 420, delay: 520 + i * 40, easing: EASE_OUT, fill: 'backwards' },
    );
  });
  setTimeout(() => hero.classList.remove('hero-intro'), 1800);
}

// Блистер наклоняется в 3D вслед за курсором. Значения догоняют цель плавно
// (каждый кадр проходят 12% оставшегося пути), поэтому движение мягкое, как на пружине,
// и его можно прервать в любой момент. Только для мыши и без «уменьшения движения».
function setupBlisterTilt(el) {
  if (!el || reduceMotion() || !matchMedia('(hover: hover) and (pointer: fine)').matches) return;
  const REST = { rx: 0, ry: 0, rot: -6, lift: 0 };
  const cur = { ...REST };
  let target = { ...REST };
  let frame = 0;

  const render = () => {
    let moving = false;
    for (const k of Object.keys(cur)) {
      const d = target[k] - cur[k];
      if (Math.abs(d) > 0.01) moving = true;
      cur[k] += d * 0.12;
    }
    el.style.transform =
      `perspective(900px) translateY(${cur.lift.toFixed(2)}px) rotateX(${cur.rx.toFixed(2)}deg) ` +
      `rotateY(${cur.ry.toFixed(2)}deg) rotate(${cur.rot.toFixed(2)}deg)`;
    if (moving) frame = requestAnimationFrame(render);
    else {
      frame = 0;
      if (target === REST) el.style.transform = ''; // в покое — снова обычное правило из CSS
    }
  };
  const kick = () => { if (!frame) frame = requestAnimationFrame(render); };

  el.addEventListener('pointerenter', () => el.classList.add('is-hover'));
  el.addEventListener('pointermove', (e) => {
    const r = el.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width - 0.5; // −0.5…0.5
    const py = (e.clientY - r.top) / r.height - 0.5;
    target = { rx: -py * 16, ry: px * 18, rot: -3, lift: -6 };
    kick();
  });
  el.addEventListener('pointerleave', () => {
    el.classList.remove('is-hover');
    target = REST;
    kick();
  });
}

// Лента категорий: стрелки влево/вправо появляются, только когда есть куда прокручивать.
let updateChipsArrows = () => {};

function setupChipsScroll(wrap) {
  const strip = wrap.querySelector('[data-chips]');
  const prev = wrap.querySelector('.chips-arrow.prev');
  const next = wrap.querySelector('.chips-arrow.next');

  updateChipsArrows = () => {
    const max = strip.scrollWidth - strip.clientWidth;
    prev.hidden = strip.scrollLeft <= 2;
    next.hidden = strip.scrollLeft >= max - 2;
    wrap.classList.toggle('fade-left', !prev.hidden);
    wrap.classList.toggle('fade-right', !next.hidden);
  };

  wrap.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-chips-scroll]');
    if (!btn) return;
    strip.scrollBy({ left: Number(btn.dataset.chipsScroll) * strip.clientWidth * 0.7, behavior: 'smooth' });
  });
  strip.addEventListener('scroll', () => updateChipsArrows(), { passive: true });
  new ResizeObserver(() => updateChipsArrows()).observe(strip);
}

function updateCatalogQuery(patch) {
  const { query } = parseHash();
  for (const [k, v] of Object.entries(patch)) {
    if (v === '' || v === undefined || (k === 'page' && Number(v) === 1)) query.delete(k);
    else query.set(k, v);
  }
  const qs = query.toString();
  navigate(`/${qs ? `?${qs}` : ''}`);
}

// ---------- Страница товара ----------

async function renderProduct({ params, isCurrent }) {
  main.innerHTML = `<section class="section"><div class="container"><div class="skeleton skeleton-hero"></div></div></section>`;
  let p;
  try {
    p = (await api(`/products/${params[0]}`)).data;
  } catch (err) {
    if (!isCurrent()) return;
    main.innerHTML = `<section class="section"><div class="container view">${emptyState(
      'search',
      err.status === 404 ? t('product.notFound') : t('product.error'),
      err.status === 404 ? t('product.notFoundText') : err.message,
      `<a class="btn btn-primary" href="#/">${t('common.toCatalog')}</a>`,
    )}</div></section>`;
    return;
  }
  if (!isCurrent()) return;

  document.title = `${p.name} — ${t('meta.title')}`;
  const out = p.stock === 0;
  let qty = 1;
  const cat = categoryName(p.category);

  main.innerHTML = `
    <section class="section">
      <div class="container view">
        <ol class="breadcrumbs">
          <li><a href="#/">${t('catalog.title')}</a></li>
          <li><a href="#/?categoryId=${p.category.id}">${esc(cat)}</a></li>
          <li aria-current="page">${esc(p.name)}</li>
        </ol>
        <div class="product-page">
          <figure class="product-figure">
            ${productArt(p, 'product-hero-art')}
            ${p.imageUrl && p.imageCredit ? `<figcaption>${esc(p.imageCredit)}</figcaption>` : ''}
          </figure>
          <div class="product-info">
            <div class="product-meta">${stockBadge(p)}${rxBadge(p)}</div>
            <h1>${esc(p.name)}</h1>
            ${p.description ? `<p class="lead" lang="ru">${esc(p.description)}</p>${lang() !== 'ru' ? `<p class="hint">${t('product.descNote')}</p>` : ''}` : ''}
            <dl class="spec">
              <dt>${t('product.form')}</dt><dd>${esc(formName(p.form))}</dd>
              ${p.dosage ? `<dt>${t('product.dosage')}</dt><dd>${esc(dosageText(p.dosage))}</dd>` : ''}
              <dt>${t('product.manufacturer')}</dt><dd>${esc(p.manufacturer)}</dd>
              <dt>${t('product.category')}</dt><dd><a href="#/?categoryId=${p.category.id}">${esc(cat)}</a></dd>
              <dt>${t('product.availability')}</dt><dd class="num">${out ? t('product.none') : `${p.stock} ${t('common.pcs')}`}</dd>
            </dl>
            <div class="buy-box">
              <div class="buy-row">
                <span class="price">${tenge(p.price)}</span>
                ${out ? '' : `
                <div class="qty" role="group" aria-label="${t('product.qty')}">
                  <button type="button" data-qty="-1" aria-label="${t('product.less')}" disabled>−</button>
                  <output data-qty-value>1</output>
                  <button type="button" data-qty="1" aria-label="${t('product.more')}" ${p.stock <= 1 ? 'disabled' : ''}>+</button>
                </div>`}
                <button class="btn btn-primary" data-buy ${out ? 'disabled' : ''}>${out ? t('stock.out') : t('product.toCart')}</button>
              </div>
              ${p.requiresPrescription ? `<div class="notice notice-warn">${icon('doc')}<span>${t('product.rxNotice')}</span></div>` : ''}
            </div>
          </div>
        </div>
      </div>
    </section>`;

  const out$ = main.querySelector('[data-qty-value]');
  main.querySelectorAll('[data-qty]').forEach((b) =>
    b.addEventListener('click', () => {
      qty = Math.max(1, Math.min(p.stock, 50, qty + Number(b.dataset.qty)));
      out$.textContent = qty;
      main.querySelector('[data-qty="-1"]').disabled = qty <= 1;
      main.querySelector('[data-qty="1"]').disabled = qty >= Math.min(p.stock, 50);
    }),
  );
  main.querySelector('[data-buy]')?.addEventListener('click', () => {
    const added = cart.add(p, qty);
    if (added === 0) toast(t('product.maxInCart', { n: p.stock }), { type: 'error' });
    else toast(t('product.added', { n: added }));
  });
}

// ---------- Корзина и оформление ----------

function renderCart() {
  document.title = `${t('cart.title')} — ${t('meta.title')}`;
  const items = cart.list;

  if (items.length === 0) {
    main.innerHTML = `<section class="section"><div class="container view">
      <h1 class="page-title">${t('cart.title')}</h1>
      ${emptyState('bag', t('cart.emptyTitle'), t('cart.emptyText'), `<a class="btn btn-primary" href="#/">${t('cart.goCatalog')}</a>`)}
    </div></section>`;
    return;
  }

  const hasRx = items.some((i) => i.requiresPrescription);
  main.innerHTML = `
    <section class="section">
      <div class="container view">
        <h1 class="page-title">${t('cart.title')}</h1>
        <div class="cart-layout">
          <div class="cart-list" data-cart-list>
            ${items.map((i) => `
              <div class="cart-item" data-id="${i.id}">
                ${productArt({ ...i, stock: 1 }, 'thumb')}
                <div>
                  <div class="name"><a href="#/product/${i.id}">${esc(i.name)}</a></div>
                  <div class="sub">${subline(i)} · ${t('cart.perPcs', { price: tenge(i.price) })}</div>
                </div>
                <div class="line-total">${tenge(i.price * i.qty)}</div>
                <div class="controls">
                  ${i.requiresPrescription ? `<span class="badge badge-rx">${t('rx')}</span>` : ''}
                  <div class="qty qty-sm" role="group" aria-label="${t('product.qty')}: ${esc(i.name)}">
                    <button type="button" data-step="-1" aria-label="${t('product.less')}">−</button>
                    <output>${i.qty}</output>
                    <button type="button" data-step="1" aria-label="${t('product.more')}" ${i.qty >= Math.min(i.stock, 50) ? 'disabled' : ''}>+</button>
                  </div>
                  <button class="icon-btn" data-remove aria-label="${esc(t('cart.remove', { name: i.name }))}">${icon('trash', 'icon icon-sm')}</button>
                </div>
              </div>`).join('')}
          </div>

          <aside class="summary">
            <h2>${t('cart.checkout')}</h2>
            <div class="summary-row"><span>${cart.count} ${unit('items', cart.count)}</span><span>${tenge(cart.total)}</span></div>
            <div class="summary-row"><span>${t('cart.delivery')}</span><span>${t('cart.free')}</span></div>
            <div class="summary-row total"><span>${t('cart.total')}</span><span>${tenge(cart.total)}</span></div>
            ${hasRx ? `<div class="notice notice-warn">${icon('doc')}<span>${t('cart.rxNotice')}</span></div>` : ''}
            ${auth.isAuthed ? `
              <form class="form" data-checkout novalidate>
                <div class="form-error" data-form-error hidden></div>
                <div class="field">
                  <label for="address">${t('cart.address')}</label>
                  <input class="input" id="address" name="address" autocomplete="street-address" placeholder="${esc(t('cart.addressPh'))}" required>
                </div>
                <div class="field">
                  <label for="phone">${t('cart.phone')}</label>
                  <input class="input" id="phone" name="phone" type="tel" autocomplete="tel" placeholder="+7 701 123 45 67" required>
                </div>
                <div class="field">
                  <label for="comment">${t('cart.comment')} <span class="hint">${t('common.optional')}</span></label>
                  <textarea class="textarea" id="comment" name="comment" placeholder="${esc(t('cart.commentPh'))}"></textarea>
                </div>
                <button class="btn btn-primary btn-block" type="submit">${t('cart.submit')}</button>
              </form>` : `
              <div class="notice notice-info">${icon('info')}<span>${t('cart.loginNotice')}</span></div>
              <a class="btn btn-primary btn-block" href="#/login" data-login-redirect>${t('cart.loginBtn')}</a>`}
          </aside>
        </div>
      </div>
    </section>`;

  main.querySelector('[data-cart-list]').addEventListener('click', (e) => {
    const row = e.target.closest('.cart-item');
    if (!row) return;
    const id = Number(row.dataset.id);
    const step = e.target.closest('[data-step]');
    if (step) {
      cart.setQty(id, cart.items[id].qty + Number(step.dataset.step));
      renderCart();
    }
    if (e.target.closest('[data-remove]')) {
      cart.remove(id);
      renderCart();
    }
  });

  main.querySelector('[data-login-redirect]')?.addEventListener('click', () => {
    sessionStorage.setItem('mint.redirect', '#/cart');
  });

  const form = main.querySelector('[data-checkout]');
  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = form.querySelector('[type="submit"]');
    const errBox = form.querySelector('[data-form-error]');
    renderFormError(errBox, null);
    setLoading(btn, true);
    try {
      const { data: order } = await api('/orders', {
        method: 'POST',
        body: {
          items: cart.list.map((i) => ({ productId: i.id, quantity: i.qty })),
          address: form.address.value,
          phone: form.phone.value,
          comment: form.comment.value || null,
        },
      });
      cart.clear();
      toast(t('cart.placed', { id: order.id, total: tenge(order.total) }));
      navigate('/orders');
    } catch (err) {
      renderFormError(errBox, err);
      if (err.status === 401) navigate('/login');
    } finally {
      setLoading(btn, false);
    }
  });
}

// ---------- Вход и регистрация ----------

function afterLogin() {
  const redirect = sessionStorage.getItem('mint.redirect');
  sessionStorage.removeItem('mint.redirect');
  location.hash = redirect || (auth.isAdmin ? '#/admin' : '#/');
}

function renderLogin() {
  document.title = `${t('auth.loginTitle')} — ${t('meta.title')}`;
  if (auth.isAuthed) return afterLogin();

  main.innerHTML = `
    <div class="auth-wrap view">
      <div class="auth-card">
        <h1>${t('auth.loginTitle')}</h1>
        <p class="sub">${t('auth.loginSub')}</p>
        <form class="form" data-login novalidate>
          <div class="form-error" data-form-error hidden></div>
          <div class="field">
            <label for="email">${t('auth.email')}</label>
            <input class="input" id="email" name="email" type="email" autocomplete="username" required>
          </div>
          <div class="field">
            <label for="password">${t('auth.password')}</label>
            <input class="input" id="password" name="password" type="password" autocomplete="current-password" required>
          </div>
          <button class="btn btn-primary btn-block" type="submit">${t('auth.loginBtn')}</button>
        </form>
        <p class="switch">${t('auth.noAccount')} <a href="#/register">${t('auth.toRegister')}</a></p>
      </div>
    </div>`;

  const form = main.querySelector('[data-login]');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = form.querySelector('[type="submit"]');
    const errBox = form.querySelector('[data-form-error]');
    renderFormError(errBox, null);
    setLoading(btn, true);
    try {
      const { accessToken, user } = await api('/auth/login', {
        method: 'POST',
        body: { email: form.email.value, password: form.password.value },
      });
      auth.set(accessToken, user);
      toast(t('toast.loggedIn', { name: esc(user.name) }));
      afterLogin();
    } catch (err) {
      renderFormError(errBox, err);
    } finally {
      setLoading(btn, false);
    }
  });
}

function renderRegister() {
  document.title = `${t('auth.registerTitle')} — ${t('meta.title')}`;
  if (auth.isAuthed) return afterLogin();

  main.innerHTML = `
    <div class="auth-wrap view">
      <div class="auth-card">
        <h1>${t('auth.registerTitle')}</h1>
        <p class="sub">${t('auth.registerSub')}</p>
        <form class="form" data-register novalidate>
          <div class="form-error" data-form-error hidden></div>
          <div class="field">
            <label for="name">${t('auth.name')}</label>
            <input class="input" id="name" name="name" autocomplete="name" required>
          </div>
          <div class="field">
            <label for="email">${t('auth.email')}</label>
            <input class="input" id="email" name="email" type="email" autocomplete="email" required>
          </div>
          <div class="field">
            <label for="password">${t('auth.password')}</label>
            <input class="input" id="password" name="password" type="password" autocomplete="new-password" required aria-describedby="pw-hint">
            <span class="hint" id="pw-hint">${t('auth.pwHint')}</span>
          </div>
          <button class="btn btn-primary btn-block" type="submit">${t('auth.registerBtn')}</button>
        </form>
        <p class="switch">${t('auth.haveAccount')} <a href="#/login">${t('auth.loginBtn')}</a></p>
      </div>
    </div>`;

  const form = main.querySelector('[data-register]');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = form.querySelector('[type="submit"]');
    const errBox = form.querySelector('[data-form-error]');
    renderFormError(errBox, null);
    setLoading(btn, true);
    try {
      const { accessToken, user } = await api('/auth/register', {
        method: 'POST',
        body: { name: form.name.value, email: form.email.value, password: form.password.value },
      });
      auth.set(accessToken, user);
      toast(t('toast.registered'));
      afterLogin();
    } catch (err) {
      renderFormError(errBox, err);
    } finally {
      setLoading(btn, false);
    }
  });
}

// ---------- Мои заказы ----------

async function renderOrders({ isCurrent }) {
  document.title = `${t('orders.title')} — ${t('meta.title')}`;
  main.innerHTML = `<section class="section"><div class="container">
    <h1 class="page-title">${auth.isAdmin ? t('orders.titleAdmin') : t('orders.title')}</h1>
    <div class="orders" data-orders>${'<div class="skeleton skeleton-row"></div>'.repeat(2)}</div>
  </div></section>`;

  const box = main.querySelector('[data-orders]');
  const load = async () => {
    try {
      const { data } = await api('/orders', { query: { limit: 50 } });
      if (!isCurrent()) return;
      if (data.length === 0) {
        box.innerHTML = emptyState('box', t('orders.emptyTitle'), t('orders.emptyText'), `<a class="btn btn-primary" href="#/">${t('common.toCatalog')}</a>`);
        return;
      }
      box.innerHTML = data.map((o) => `
        <article class="order-card view">
          <div class="order-head">
            <h3>${t('orders.order', { id: o.id })}</h3>
            ${statusBadge(o.status)}
            <span class="date">${formatDate(o.createdAt)}</span>
            <span class="total">${tenge(o.total)}</span>
          </div>
          <ul class="order-items">
            ${o.items.map((it) => `<li><span>${esc(it.product.name)}${it.product.dosage ? `, ${esc(dosageText(it.product.dosage))}` : ''}</span><span class="qtyprice">${it.quantity} × ${tenge(it.price)}</span></li>`).join('')}
          </ul>
          <div class="order-foot">
            <span>${esc(o.address)} · ${esc(o.phone)}</span>
            ${o.status === 'PENDING' ? `<button class="btn btn-danger-ghost btn-sm" data-cancel="${o.id}">${t('orders.cancel')}</button>` : ''}
          </div>
        </article>`).join('');
    } catch (err) {
      if (isCurrent()) box.innerHTML = emptyState('alert', t('orders.error'), err.message);
    }
  };

  box.addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-cancel]');
    if (!btn) return;
    const ok = await confirmDialog({
      title: t('orders.cancelTitle', { id: btn.dataset.cancel }),
      text: t('orders.cancelText'),
      confirmText: t('orders.cancel'),
    });
    if (!ok) return;
    setLoading(btn, true);
    try {
      await api(`/orders/${btn.dataset.cancel}/cancel`, { method: 'PATCH' });
      toast(t('orders.cancelled'));
      load();
    } catch (err) {
      errorToast(err);
      setLoading(btn, false);
    }
  });

  await load();
}

// ---------- Аккаунт ----------

function renderAccount() {
  const u = auth.user;
  document.title = `${t('account.profile')} — ${t('meta.title')}`;
  main.innerHTML = `
    <section class="section">
      <div class="container view">
        <h1 class="page-title">${t('account.profile')}</h1>
        <div class="account-page">
          <div class="account-card">
            <span class="avatar avatar-lg" aria-hidden="true">${esc(initial(u.name))}</span>
            <div>
              <h2>${esc(u.name)}</h2>
              <p class="muted">${esc(u.email)}</p>
            </div>
          </div>
          <dl class="doc-req">
            <div><dt>${t('auth.name')}</dt><dd>${esc(u.name)}</dd></div>
            <div><dt>${t('auth.email')}</dt><dd>${esc(u.email)}</dd></div>
            <div><dt>${t('acc.role')}</dt><dd>${u.role === 'ADMIN' ? t('au.admin') : t('au.user')}</dd></div>
            ${u.createdAt ? `<div><dt>${t('acc.since')}</dt><dd>${fmtDate(u.createdAt, 'date')}</dd></div>` : ''}
          </dl>
          <div class="account-actions">
            <a class="btn btn-primary" href="#/orders">${icon('receipt', 'icon icon-sm')}${t('nav.orders')}</a>
            ${auth.isAdmin ? `<a class="btn btn-ghost" href="#/admin">${icon('dashboard', 'icon icon-sm')}${t('account.adminPanel')}</a>` : ''}
            <button type="button" class="btn btn-danger-ghost" data-logout>${icon('logout', 'icon icon-sm')}${t('account.logout')}</button>
          </div>
        </div>
      </div>
    </section>`;
}

// ---------- Информационные страницы ----------

function renderInfo({ params }) {
  if (DOCS[params[0]]) return renderDoc(DOCS[params[0]][lang()], params[0]);
  const page = PAGES[params[0]];
  if (!page) {
    main.innerHTML = `<section class="section"><div class="container view">${emptyState('search', t('err.notFoundTitle'), t('err.notFoundText'), `<a class="btn btn-primary" href="#/">${t('common.toCatalog')}</a>`)}</div></section>`;
    return;
  }
  const { title, body } = page[lang()];
  document.title = `${title} — ${t('meta.title')}`;
  main.innerHTML = `
    <section class="section">
      <div class="container view">
        <article class="info-page">
          <h1 class="page-title">${esc(title)}</h1>
          ${body.map((p) => `<p>${esc(p)}</p>`).join('')}
        </article>
      </div>
    </section>`;
}

// ---------- Документы: публичная оферта, политика конфиденциальности ----------
// Документ с оглавлением: слева закреплённый список разделов, справа текст.
// Ссылки оглавления прокручивают к разделу сами (#… в адресе занят роутером),
// а текущий раздел подсвечивается при прокрутке.

function docBlock(b) {
  if (typeof b === 'string') return `<p>${esc(b)}</p>`;
  if (b.html) return `<p>${b.html}</p>`; // статичный текст из offer.js / privacy.js со ссылкой на другой документ
  if (b.list) return `<ul class="doc-list">${b.list.map((li) => `<li>${esc(li)}</li>`).join('')}</ul>`;
  if (b.terms) {
    return `<ul class="doc-terms">${b.terms.map(([term, def]) => `<li><strong>${esc(term)}</strong> — ${esc(def)}</li>`).join('')}</ul>`;
  }
  return '';
}

function docRequisites(rows) {
  return `<dl class="doc-req">${rows.map(([label, value, placeholder]) => `
    <div>
      <dt>${esc(label)}</dt>
      <dd${placeholder ? ' class="is-placeholder"' : ''}>${value.includes('@') ? `<a href="mailto:${esc(value)}">${esc(value)}</a>` : esc(value)}</dd>
    </div>`).join('')}</dl>`;
}

let docScrollHandler = null;

function renderDoc(doc, slug) {
  document.title = `${doc.title} — ${t('meta.title')}`;
  main.innerHTML = `
    <section class="section">
      <div class="container view">
        <header class="doc-head">
          <h1>${esc(doc.title)}</h1>
          <p class="doc-sub">${esc(doc.subtitle)}</p>
        </header>
        <div class="doc-layout">
          <nav class="doc-toc" aria-labelledby="doc-toc-title">
            <p class="doc-toc-title" id="doc-toc-title">${esc(doc.toc)}</p>
            <ol>
              ${doc.sections.map((s, i) => `<li><a href="#/info/${slug}" data-anchor="doc-${s.id}">${i + 1}. ${esc(s.title)}</a></li>`).join('')}
            </ol>
          </nav>
          <article class="doc-body">
            ${doc.sections.map((s, i) => `
              <section class="doc-section" id="doc-${s.id}">
                <h2>${i + 1}. ${esc(s.title)}</h2>
                ${s.requisites ? docRequisites(s.requisites) : s.blocks.map(docBlock).join('')}
              </section>`).join('')}
          </article>
        </div>
      </div>
    </section>`;

  const links = [...main.querySelectorAll('[data-anchor]')];
  main.querySelector('.doc-toc').addEventListener('click', (e) => {
    const a = e.target.closest('[data-anchor]');
    if (!a) return;
    e.preventDefault();
    document.getElementById(a.dataset.anchor)?.scrollIntoView({ behavior: reduceMotion() ? 'auto' : 'smooth', block: 'start' });
  });

  // Подсветка текущего раздела: последний раздел, чей заголовок уже прошёл линию под шапкой.
  // В самом низу страницы — последний раздел (короткие разделы в конце не доезжают до верха).
  const sections = [...main.querySelectorAll('.doc-section')];
  const highlight = (id) => links.forEach((l) => l.toggleAttribute('aria-current', l.dataset.anchor === id));
  const update = () => {
    const line = document.querySelector('.site-header').getBoundingClientRect().bottom + 40;
    const atEnd = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4;
    const passed = sections.filter((s) => s.getBoundingClientRect().top <= line);
    highlight((atEnd ? sections.at(-1) : passed.at(-1) ?? sections[0]).id);
  };
  // Браузер и так шлёт scroll не чаще раза за кадр, а пересчёт для десятка разделов дешёвый
  const onScroll = () => {
    if (!document.contains(sections[0])) return window.removeEventListener('scroll', onScroll);
    update();
  };
  window.removeEventListener('scroll', docScrollHandler ?? (() => {}));
  docScrollHandler = onScroll;
  window.addEventListener('scroll', onScroll, { passive: true });
  update();
}

// ---------- Старт ----------

async function boot() {
  applyStaticText();
  renderHeader();
  renderFooter();
  // Проверяем сохранённый токен: если он истёк, api() сам выполнит выход.
  if (auth.token) {
    try {
      const { user } = await api('/auth/me');
      auth.set(auth.token, user);
    } catch {
      /* обработано в api() */
    }
  }
  router();
}

boot();
