import * as orderService from '../services/order.service.js';
import { renderReceipt, receiptFileName, receiptLang } from '../services/receipt.service.js';
import { sendMail, receiptEmail } from '../services/mail.service.js';
import { env } from '../config/env.js';

const accessKeyOf = (req) => req.get('x-order-key') || req.validated?.query?.key || undefined;
const langOf = (req) => receiptLang(req.validated?.query?.lang || (req.headers['accept-language'] || 'ru').slice(0, 2).toLowerCase());
const siteUrl = (req) => env.appUrl || `${req.protocol}://${req.get('host')}`;
const tenge = (n) => `${String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')} ₸`;

export async function create(req, res) {
  // Владелец заказа — подтверждённый пользователь из JWT, а не userId из тела запроса.
  // accessKey показывается один раз: с ним гость оплачивает заказ и скачивает квитанцию.
  const { order, accessKey } = await orderService.create(req.user ?? null, req.validated.body);
  res.status(201).json({ data: order, accessKey });
}

export async function list(req, res) {
  res.json(await orderService.list(req.user, req.validated.query));
}

export async function getById(req, res) {
  res.json({ data: await orderService.getById(req.user, req.validated.params.id) });
}

export async function cancel(req, res) {
  res.json({ data: await orderService.cancel(req.user, req.validated.params.id) });
}

export async function pay(req, res) {
  const accessKey = accessKeyOf(req);
  const order = await orderService.pay({ user: req.user, accessKey }, req.validated.params.id, req.validated.body);
  res.json({ data: order });
  // Чек на почту — после ответа: сбой почты не должен влиять на оплату
  sendReceiptMail(order, { accessKey, lang: langOf(req), base: siteUrl(req) }).catch((err) =>
    console.error('[mail] Не удалось отправить чек:', err.message),
  );
}

async function sendReceiptMail(order, { accessKey, lang, base }) {
  const pdf = await renderReceipt(order, { lang, siteUrl: base });
  const link = accessKey
    ? `${base}/api/orders/${order.id}/receipt?key=${encodeURIComponent(accessKey)}&lang=${lang}`
    : `${base}/#/orders`;
  await sendMail({
    to: order.email,
    ...receiptEmail({ orderId: order.id, total: tenge(order.total), link, lang }),
    attachments: [{ name: receiptFileName(order), content: pdf.toString('base64') }],
  });
}

export async function receipt(req, res) {
  const order = await orderService.getReceiptOrder({ user: req.user, accessKey: accessKeyOf(req) }, req.validated.params.id);
  const pdf = await renderReceipt(order, { lang: langOf(req), siteUrl: siteUrl(req) });
  res.set({
    'Content-Type': 'application/pdf',
    'Content-Disposition': `attachment; filename="${receiptFileName(order)}"`,
    'Cache-Control': 'private, no-store',
  });
  res.send(pdf);
}

export async function updateStatus(req, res) {
  res.json({ data: await orderService.updateStatus(req.validated.params.id, req.validated.body.status) });
}
