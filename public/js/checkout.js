// Оплата заказа картой: окно с «живой» картой, которая заполняется по мере ввода
// и переворачивается, когда вводится CVC.
// Полный номер, срок и CVC проверяются только в браузере и на сервер не отправляются:
// в API уходят платёжная система и последние 4 цифры (POST /api/orders/:id/pay).
import { api } from './api.js';
import { esc, tenge, icon } from './ui.js';
import { t, fmtDate, localizeError } from './i18n.js';

const BRANDS = {
  visa: { label: 'VISA', test: /^4/ },
  mastercard: { label: 'Mastercard', test: /^(5[1-5]|2(2[2-9]|[3-6]|7[01]|720))/ },
  mir: { label: 'МИР', test: /^220[0-4]/ },
  amex: { label: 'AMEX', test: /^3[47]/ },
  unionpay: { label: 'UnionPay', test: /^62/ },
};

const digitsOf = (v) => v.replace(/\D/g, '');

function detectBrand(d) {
  for (const [key, b] of Object.entries(BRANDS)) if (b.test.test(d)) return key;
  return 'card';
}

// Контрольная сумма номера карты (алгоритм Луна) — ловит опечатки до отправки
function luhn(d) {
  let sum = 0;
  for (let i = 0; i < d.length; i += 1) {
    let n = Number(d[d.length - 1 - i]);
    if (i % 2 === 1) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    sum += n;
  }
  return d.length >= 13 && sum % 10 === 0;
}

function formatNumber(d, brand) {
  if (brand === 'amex') return [d.slice(0, 4), d.slice(4, 10), d.slice(10, 15)].filter(Boolean).join(' ');
  return d.slice(0, 16).replace(/(.{4})/g, '$1 ').trim();
}

const brandMark = (brand) =>
  brand === 'mastercard'
    ? '<span class="cc-brand cc-brand-mc" aria-hidden="true"><i></i><i></i></span>'
    : `<span class="cc-brand">${BRANDS[brand]?.label ?? ''}</span>`;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Открыть оплату заказа.
 * @param {object} order — заказ из API (id, total, items)
 * @param {object} opts
 * @param {string} opts.itemsHtml — разметка списка товаров для левой колонки
 * @param {Function} [opts.onDone] — вызывается при закрытии окна (оплачен заказ или нет)
 */
export function openCheckout(order, { itemsHtml = '', onDone } = {}) {
  const amount = tenge(order.total);
  const dialog = document.createElement('dialog');
  dialog.className = 'checkout';
  dialog.setAttribute('aria-labelledby', 'co-title');
  let busy = false;
  let paidOrder = null;

  dialog.innerHTML = `
    <div class="checkout-grid">
      <aside class="checkout-summary">
        <p class="checkout-eyebrow">${t('pay.yourOrder', { id: order.id })}</p>
        <ul class="checkout-items">${itemsHtml}</ul>
        <dl class="checkout-kv">
          <div><dt>${t('pay.goods')}</dt><dd>${amount}</dd></div>
          <div><dt>${t('cart.delivery')}</dt><dd>${t('pay.courier')}</dd></div>
          <div class="checkout-total"><dt>${t('cart.total')}</dt><dd>${amount}</dd></div>
        </dl>
      </aside>
      <section class="checkout-pay">
        <div class="checkout-head">
          <h2 id="co-title">${t('pay.title')}</h2>
          <button type="button" class="icon-btn" data-close aria-label="${esc(t('common.close'))}">${icon('x')}</button>
        </div>
        <div class="cc" aria-hidden="true">
          <div class="cc-inner">
            <div class="cc-face cc-front">
              <div class="cc-top"><span class="cc-bank">Мята Pay</span><span class="cc-contactless"><i></i><i></i><i></i></span></div>
              <div class="cc-chip"></div>
              <div class="cc-number" data-cc-number>•••• •••• •••• ••••</div>
              <div class="cc-bottom">
                <div><div class="cc-label">${t('pay.holderLabel')}</div><div class="cc-value" data-cc-name>${t('pay.holderPh')}</div></div>
                <div><div class="cc-label">${t('pay.expLabel')}</div><div class="cc-value" data-cc-exp>${t('pay.expPh')}</div></div>
                <div data-cc-brand></div>
              </div>
            </div>
            <div class="cc-face cc-back">
              <div class="cc-stripe"></div>
              <div class="cc-sign"><span class="cc-label">CVC</span><span class="cc-cvc" data-cc-cvc>•••</span></div>
              <p class="cc-note">${t('pay.cardNote')}</p>
            </div>
          </div>
        </div>
        <form class="checkout-form form" novalidate autocomplete="on">
          <div class="form-error" data-form-error hidden></div>
          <div class="field">
            <label for="cc-number">${t('pay.number')}</label>
            <input class="input" id="cc-number" name="number" inputmode="numeric" autocomplete="cc-number" placeholder="0000 0000 0000 0000" maxlength="19" required>
          </div>
          <div class="field">
            <label for="cc-name">${t('pay.holder')}</label>
            <input class="input" id="cc-name" name="holder" autocomplete="cc-name" placeholder="IVAN IVANOV" maxlength="40" spellcheck="false" autocapitalize="characters">
          </div>
          <div class="form-row checkout-row">
            <div class="field">
              <label for="cc-exp">${t('pay.exp')}</label>
              <input class="input" id="cc-exp" name="exp" inputmode="numeric" autocomplete="cc-exp" placeholder="${t('pay.expPh')}" maxlength="5">
            </div>
            <div class="field">
              <label for="cc-csc">CVC</label>
              <input class="input" id="cc-csc" name="cvc" type="password" inputmode="numeric" autocomplete="cc-csc" placeholder="•••" maxlength="4">
            </div>
          </div>
          <button class="btn btn-dark btn-block btn-lg" type="submit" data-pay>${t('pay.payBtn', { amount })}</button>
          <p class="checkout-status" data-status aria-live="polite"></p>
          <p class="checkout-secure">${icon('shield', 'icon icon-sm')}${t('pay.secure')}</p>
        </form>
      </section>
    </div>`;

  document.body.append(dialog);
  dialog.showModal();
  document.body.style.overflow = 'hidden';

  const $ = (s) => dialog.querySelector(s);
  const card = $('.cc');
  const form = $('.checkout-form');
  const { number, holder, exp, cvc } = form;
  let brand = 'card';

  const render = () => {
    const d = digitsOf(number.value);
    brand = detectBrand(d);
    card.dataset.brand = brand;
    $('[data-cc-number]').textContent = d ? formatNumber(d.padEnd(brand === 'amex' ? 15 : 16, '•'), brand) : '•••• •••• •••• ••••';
    $('[data-cc-name]').textContent = holder.value.trim() || t('pay.holderPh');
    $('[data-cc-exp]').textContent = exp.value || t('pay.expPh');
    $('[data-cc-cvc]').textContent = cvc.value ? '•'.repeat(cvc.value.length) : '•••';
    $('[data-cc-brand]').innerHTML = brandMark(brand);
  };

  number.addEventListener('input', () => {
    const d = digitsOf(number.value).slice(0, 19);
    number.value = formatNumber(d, detectBrand(d));
    render();
  });
  holder.addEventListener('input', () => {
    holder.value = holder.value.replace(/[^A-Za-z\s-]/g, '').toUpperCase();
    render();
  });
  exp.addEventListener('input', (e) => {
    let d = digitsOf(exp.value).slice(0, 4);
    if (d.length === 1 && Number(d) > 1) d = `0${d}`; // «5» → «05»
    exp.value = d.length > 2 || (d.length === 2 && e.inputType !== 'deleteContentBackward') ? `${d.slice(0, 2)}/${d.slice(2)}` : d;
    render();
  });
  cvc.addEventListener('input', () => {
    cvc.value = digitsOf(cvc.value).slice(0, 4);
    render();
  });
  // Карта переворачивается обратной стороной, пока вводится CVC
  cvc.addEventListener('focus', () => card.classList.add('is-flipped'));
  cvc.addEventListener('blur', () => card.classList.remove('is-flipped'));

  function validate() {
    const d = digitsOf(number.value);
    const [mm, yy] = exp.value.split('/').map(Number);
    const expOk = mm >= 1 && mm <= 12 && yy >= 0 && new Date(2000 + yy, mm, 0, 23, 59, 59) >= new Date();
    const checks = [
      [number, luhn(d), t('pay.errNumber')],
      [holder, holder.value.trim().length >= 2, t('pay.errHolder')],
      [exp, expOk, t('pay.errExp')],
      [cvc, cvc.value.length === (brand === 'amex' ? 4 : 3), t('pay.errCvc')],
    ];
    for (const [input, ok] of checks) input.setAttribute('aria-invalid', String(!ok));
    const bad = checks.find(([, ok]) => !ok);
    bad?.[0].focus();
    return bad?.[2] ?? null;
  }

  const errBox = $('[data-form-error]');
  const showError = (message) => {
    errBox.hidden = !message;
    errBox.innerHTML = message ? `<strong>${esc(message)}</strong>` : '';
  };

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    showError(null);
    const error = validate();
    if (error) return showError(error);

    const payBtn = $('[data-pay]');
    const status = $('[data-status]');
    const steps = [t('pay.step1'), t('pay.step2'), t('pay.step3')];
    busy = true;
    dialog.classList.add('is-busy');
    payBtn.disabled = true;
    payBtn.innerHTML = `<span class="spinner" aria-hidden="true"></span>${t('pay.processing')}`;
    let step = 0;
    status.textContent = steps[0];
    const ticker = setInterval(() => {
      step = Math.min(step + 1, steps.length - 1);
      status.textContent = steps[step];
    }, 900);

    try {
      // Шаги обработки показываются параллельно с запросом
      const [res] = await Promise.all([
        api(`/orders/${order.id}/pay`, { method: 'POST', body: { cardBrand: brand, cardLast4: digitsOf(number.value).slice(-4) } }),
        sleep(2400),
      ]);
      form.reset(); // данные карты стираются сразу после оплаты
      paidOrder = res.data;
      showSuccess(paidOrder);
    } catch (err) {
      showError(localizeError(err).message);
      payBtn.disabled = false;
      payBtn.textContent = t('pay.payBtn', { amount });
    } finally {
      clearInterval(ticker);
      status.textContent = '';
      busy = false;
      dialog.classList.remove('is-busy');
    }
  });

  function showSuccess(paid) {
    dialog.classList.add('is-success');
    dialog.innerHTML = `
      <div class="checkout-success">
        <button type="button" class="icon-btn checkout-close" data-close aria-label="${esc(t('common.close'))}">${icon('x')}</button>
        <svg class="checkmark" viewBox="0 0 52 52" aria-hidden="true"><circle cx="26" cy="26" r="24"/><path d="M15 27l7 7 15-16"/></svg>
        <h2 id="co-title">${t('pay.successTitle')}</h2>
        <p class="muted">${amount} · ${BRANDS[paid.cardBrand]?.label ?? t('pay.card')} •••• ${esc(paid.cardLast4)}</p>
        <p class="checkout-ref">${t('pay.ref', { ref: esc(paid.paymentRef), date: fmtDate(paid.paidAt, 'full') })}</p>
        <p class="checkout-next">${t('pay.successText')}</p>
        <div class="checkout-actions">
          <a class="btn btn-primary" href="#/orders" data-close>${t('nav.orders')}</a>
          <a class="btn btn-ghost" href="#/" data-close>${t('common.toCatalog')}</a>
        </div>
      </div>`;
    dialog.querySelector('.checkout-actions .btn').focus();
  }

  const close = () => {
    if (busy) return;
    dialog.classList.add('is-closing');
    document.body.style.overflow = '';
    setTimeout(() => {
      dialog.close();
      dialog.remove();
      onDone?.(paidOrder);
    }, 160);
  };
  dialog.addEventListener('click', (e) => {
    if (e.target === dialog || e.target.closest('[data-close]')) close();
  });
  // Esc: пока идёт платёж, окно не закрывается
  dialog.addEventListener('cancel', (e) => {
    e.preventDefault();
    close();
  });

  render();
  setTimeout(() => number.focus(), 60);
}
