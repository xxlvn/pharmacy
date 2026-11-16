import { env, isProduction, isTest } from '../config/env.js';

// Последнее «отправленное» письмо — для автотестов (в режиме test письма никуда не уходят).
export const outbox = [];

// Отправка письма через HTTP API Brevo (https://developers.brevo.com/reference/sendtransacemail).
// HTTP, а не SMTP: бесплатный хостинг может блокировать SMTP-порты.
export async function sendMail({ to, subject, html, text, attachments }) {
  if (isTest) {
    outbox.push({ to, subject, html, text, attachments });
    return;
  }

  if (!env.brevoApiKey || !env.mailFrom) {
    if (isProduction) {
      console.error('[mail] BREVO_API_KEY или MAIL_FROM не заданы, письмо не отправлено:', subject);
      return;
    }
    // Разработка: письмо выводится в консоль сервера вместо отправки
    console.log(`\n[mail] Кому: ${to}\n[mail] Тема: ${subject}\n${text}\n`);
    return;
  }

  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: { 'api-key': env.brevoApiKey, 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({
      sender: { email: env.mailFrom, name: env.mailFromName },
      to: [{ email: to }],
      subject,
      htmlContent: html,
      textContent: text,
      // вложения: [{ name, content (base64) }]
      ...(attachments?.length ? { attachment: attachments } : {}),
    }),
  });
  if (!res.ok) {
    // Ошибка отправки не должна ломать оплату: фиксируем её в логе
    console.error('[mail] Brevo ответил', res.status, await res.text().catch(() => ''));
  }
}


// ---------- Письмо с чеком об оплате ----------

const RECEIPT_TEXT = {
  ru: {
    subject: (id) => `Чек об оплате заказа №${id} — Мята`,
    hello: 'Здравствуйте!',
    body: (id, total) => `Оплата заказа №${id} на сумму ${total} прошла успешно. Квитанция об оплате — во вложении к этому письму.`,
    delivery: 'Курьер привезёт заказ по указанному адресу. Для рецептурных препаратов подготовьте рецепт.',
    button: 'Скачать квитанцию',
    footer: 'Это письмо отправлено автоматически, отвечать на него не нужно.',
  },
  kk: {
    subject: (id) => `№${id} тапсырысты төлеу чегі — Мята`,
    hello: 'Сәлеметсіз бе!',
    body: (id, total) => `№${id} тапсырыс ${total} сомаға сәтті төленді. Төлем түбіртегі осы хатқа тіркелген.`,
    delivery: 'Курьер тапсырысты көрсетілген мекенжайға жеткізеді. Рецептілік препараттар үшін рецептті дайындаңыз.',
    button: 'Түбіртекті жүктеу',
    footer: 'Бұл хат автоматты түрде жіберілді, оған жауап берудің қажеті жоқ.',
  },
  en: {
    subject: (id) => `Payment receipt for order #${id} — Myata`,
    hello: 'Hello!',
    body: (id, total) => `Payment for order #${id} of ${total} was successful. The receipt is attached to this email.`,
    delivery: 'A courier will bring the order to your address. For prescription medicines, have your prescription ready.',
    button: 'Download receipt',
    footer: 'This email was sent automatically, there is no need to reply.',
  },
};

const escapeHtml = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

export function receiptEmail({ orderId, total, link, lang }) {
  const t = RECEIPT_TEXT[lang] ?? RECEIPT_TEXT.ru;
  const body = t.body(orderId, total);
  const text = `${t.hello}\n\n${body}\n\n${t.delivery}\n\n${t.button}: ${link}\n\n${t.footer}`;
  const html = `<!doctype html><html><body style="margin:0;background:#f5f6f4;font-family:Arial,sans-serif;color:#192b1b">
  <div style="max-width:520px;margin:0 auto;padding:32px 16px">
    <div style="background:#192b1b;color:#eef3e8;border-radius:16px 16px 0 0;padding:20px 24px;font-size:20px;font-weight:bold">Мята</div>
    <div style="background:#ffffff;border-radius:0 0 16px 16px;padding:24px">
      <p style="margin:0 0 12px;font-size:17px;font-weight:bold">${escapeHtml(t.hello)}</p>
      <p style="margin:0 0 12px;line-height:1.55">${escapeHtml(body)}</p>
      <p style="margin:0 0 20px;line-height:1.55;color:#56625a">${escapeHtml(t.delivery)}</p>
      <p style="margin:0 0 20px"><a href="${escapeHtml(link)}" style="display:inline-block;background:#84bf04;color:#192b1b;text-decoration:none;font-weight:bold;padding:12px 20px;border-radius:10px">${escapeHtml(t.button)}</a></p>
      <p style="margin:16px 0 0;font-size:13px;color:#56625a">${escapeHtml(t.footer)}</p>
    </div>
  </div></body></html>`;
  return { subject: t.subject(orderId), text, html };
}
