import { env, isProduction, isTest } from '../config/env.js';

// Последнее «отправленное» письмо — для автотестов (в режиме test письма никуда не уходят).
export const outbox = [];

// Отправка письма через HTTP API Brevo (https://developers.brevo.com/reference/sendtransacemail).
// HTTP, а не SMTP: бесплатный хостинг может блокировать SMTP-порты.
export async function sendMail({ to, subject, html, text }) {
  if (isTest) {
    outbox.push({ to, subject, html, text });
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
    }),
  });
  if (!res.ok) {
    // Ответ пользователю не меняем (иначе по ошибке можно узнать, есть ли такая почта), но фиксируем в логе
    console.error('[mail] Brevo ответил', res.status, await res.text().catch(() => ''));
  }
}

// ---------- Шаблон письма для сброса пароля на трёх языках ----------

const RESET_TEXT = {
  ru: {
    subject: 'Восстановление пароля — Мята',
    hello: (name) => `Здравствуйте, ${name}!`,
    body: 'Мы получили запрос на сброс пароля для вашего аккаунта в интернет-аптеке «Мята». Перейдите по ссылке, чтобы задать новый пароль. Ссылка действует 30 минут и сработает один раз.',
    button: 'Задать новый пароль',
    ignore: 'Если вы не запрашивали сброс, просто проигнорируйте это письмо: пароль не изменится.',
  },
  kk: {
    subject: 'Құпиясөзді қалпына келтіру — Мята',
    hello: (name) => `Сәлеметсіз бе, ${name}!`,
    body: '«Мята» интернет-дәріханасындағы аккаунтыңыздың құпиясөзін қалпына келтіру сұрауын алдық. Жаңа құпиясөз орнату үшін төмендегі сілтемеге өтіңіз. Сілтеме 30 минут әрекет етеді және бір рет жұмыс істейді.',
    button: 'Жаңа құпиясөз орнату',
    ignore: 'Егер сіз қалпына келтіруді сұрамаған болсаңыз, бұл хатты елемеңіз: құпиясөз өзгермейді.',
  },
  en: {
    subject: 'Password reset — Myata',
    hello: (name) => `Hello, ${name}!`,
    body: 'We received a request to reset the password for your Myata online pharmacy account. Follow the link below to set a new password. The link is valid for 30 minutes and works once.',
    button: 'Set a new password',
    ignore: 'If you did not request a reset, just ignore this email: your password will not change.',
  },
};

const escapeHtml = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

export function resetPasswordEmail({ name, link, lang }) {
  const t = RESET_TEXT[lang] ?? RESET_TEXT.ru;
  const text = `${t.hello(name)}\n\n${t.body}\n\n${link}\n\n${t.ignore}`;
  const html = `<!doctype html><html><body style="margin:0;background:#f5f6f4;font-family:Arial,sans-serif;color:#192b1b">
  <div style="max-width:520px;margin:0 auto;padding:32px 16px">
    <div style="background:#192b1b;color:#eef3e8;border-radius:16px 16px 0 0;padding:20px 24px;font-size:20px;font-weight:bold">Мята</div>
    <div style="background:#ffffff;border-radius:0 0 16px 16px;padding:24px">
      <p style="margin:0 0 12px;font-size:17px;font-weight:bold">${escapeHtml(t.hello(name))}</p>
      <p style="margin:0 0 20px;line-height:1.55">${escapeHtml(t.body)}</p>
      <p style="margin:0 0 20px"><a href="${escapeHtml(link)}" style="display:inline-block;background:#84bf04;color:#192b1b;text-decoration:none;font-weight:bold;padding:12px 20px;border-radius:10px">${escapeHtml(t.button)}</a></p>
      <p style="margin:0 0 8px;font-size:13px;color:#56625a;word-break:break-all">${escapeHtml(link)}</p>
      <p style="margin:16px 0 0;font-size:13px;color:#56625a">${escapeHtml(t.ignore)}</p>
    </div>
  </div></body></html>`;
  return { subject: t.subject, text, html };
}
