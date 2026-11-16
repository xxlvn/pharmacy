// PDF-квитанция об оплате заказа (pdfkit).
// Шрифт DejaVu Sans — в нём есть кириллица, казахские буквы и знак тенге ₸.
import PDFDocument from 'pdfkit';
import { createRequire } from 'node:module';
import path from 'node:path';

const require = createRequire(import.meta.url);
const FONT_DIR = path.join(path.dirname(require.resolve('dejavu-fonts-ttf/package.json')), 'ttf');
const FONT = path.join(FONT_DIR, 'DejaVuSans.ttf');
const FONT_BOLD = path.join(FONT_DIR, 'DejaVuSans-Bold.ttf');

const INK = '#192b1b';
const MUTED = '#5b6a5e';
const LINE = '#e2e6df';
const ACCENT = '#84bf04';
const WASH = '#f5f6f4';

const CARD = { visa: 'VISA', mastercard: 'Mastercard', mir: 'МИР', amex: 'AMEX', unionpay: 'UnionPay' };

const T = {
  ru: {
    title: 'Квитанция об оплате',
    shop: 'интернет-аптека',
    number: 'Номер квитанции',
    paidAt: 'Дата и время оплаты',
    order: 'Заказ',
    buyer: 'Покупатель',
    address: 'Адрес доставки',
    phone: 'Телефон',
    item: 'Наименование',
    qty: 'Кол-во',
    price: 'Цена',
    sum: 'Сумма',
    goods: 'Товары',
    delivery: 'Доставка курьером',
    free: 'бесплатно',
    total: 'Итого оплачено',
    method: 'Способ оплаты',
    card: 'Банковская карта',
    status: 'Статус',
    paid: 'Оплачено',
    thanks: 'Спасибо за покупку! Курьер привезёт заказ по указанному адресу.',
    rx: 'Для рецептурных препаратов подготовьте рецепт к приходу курьера.',
    questions: 'Вопросы по заказу',
  },
  kk: {
    title: 'Төлем түбіртегі',
    shop: 'интернет-дәріхана',
    number: 'Түбіртек нөмірі',
    paidAt: 'Төлем күні мен уақыты',
    order: 'Тапсырыс',
    buyer: 'Сатып алушы',
    address: 'Жеткізу мекенжайы',
    phone: 'Телефон',
    item: 'Атауы',
    qty: 'Саны',
    price: 'Бағасы',
    sum: 'Сомасы',
    goods: 'Тауарлар',
    delivery: 'Курьермен жеткізу',
    free: 'тегін',
    total: 'Барлығы төленді',
    method: 'Төлем тәсілі',
    card: 'Банк картасы',
    status: 'Күйі',
    paid: 'Төленді',
    thanks: 'Сатып алғаныңызға рахмет! Курьер тапсырысты көрсетілген мекенжайға жеткізеді.',
    rx: 'Рецептілік препараттар үшін курьер келгенге дейін рецептті дайындаңыз.',
    questions: 'Тапсырыс бойынша сұрақтар',
  },
  en: {
    title: 'Payment receipt',
    shop: 'online pharmacy',
    number: 'Receipt number',
    paidAt: 'Paid on',
    order: 'Order',
    buyer: 'Customer',
    address: 'Delivery address',
    phone: 'Phone',
    item: 'Item',
    qty: 'Qty',
    price: 'Price',
    sum: 'Amount',
    goods: 'Items',
    delivery: 'Courier delivery',
    free: 'free',
    total: 'Total paid',
    method: 'Payment method',
    card: 'Bank card',
    status: 'Status',
    paid: 'Paid',
    thanks: 'Thank you for your purchase! A courier will bring the order to your address.',
    rx: 'For prescription medicines, have your prescription ready for the courier.',
    questions: 'Questions about your order',
  },
};

const LOCALE = { ru: 'ru-RU', kk: 'kk-KZ', en: 'en-GB' };

export const receiptLang = (value) => (T[value] ? value : 'ru');

const money = (n) => `${String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')} ₸`;

function dateTime(date, lang) {
  return new Intl.DateTimeFormat(LOCALE[lang], {
    timeZone: 'Asia/Almaty',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

const itemName = (p) => [p.name, p.dosage, p.form].filter(Boolean).join(', ');

export const receiptFileName = (order) => `myata-receipt-${order.id}.pdf`;

/**
 * Собирает PDF и возвращает Buffer.
 * @param {object} order — оплаченный заказ с позициями (items[].product)
 */
export function renderReceipt(order, { lang = 'ru', siteUrl = '', supportEmail = 'support@myata.kz' } = {}) {
  const t = T[receiptLang(lang)];
  const doc = new PDFDocument({
    size: 'A4',
    margin: 48,
    info: { Title: `${t.title} ${order.paymentRef}`, Author: 'Мята', Subject: `${t.order} №${order.id}` },
  });
  doc.registerFont('regular', FONT);
  doc.registerFont('bold', FONT_BOLD);

  const chunks = [];
  doc.on('data', (c) => chunks.push(c));
  const done = new Promise((resolve, reject) => {
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
  });

  const left = doc.page.margins.left;
  const width = doc.page.width - left - doc.page.margins.right;
  const right = left + width;

  // --- Шапка ---
  doc.save().roundedRect(left, 48, width, 84, 14).fill(INK).restore();
  doc.save().circle(left + 36, 90, 16).fill(ACCENT).restore();
  doc.save().rect(left + 33, 80, 6, 20).fill(INK).rect(left + 26, 87, 20, 6).fill(INK).restore();
  doc.font('bold').fontSize(22).fillColor('#ffffff').text('Мята', left + 64, 72);
  doc.font('regular').fontSize(10).fillColor('#c9d6c2').text(t.shop, left + 64, 100);
  doc.font('bold').fontSize(15).fillColor('#ffffff').text(t.title, left, 72, { width: width - 24, align: 'right' });
  doc.font('regular').fontSize(10).fillColor('#c9d6c2').text(order.paymentRef, left, 98, { width: width - 24, align: 'right' });

  // --- Реквизиты ---
  let y = 156;
  const rows = [
    [t.number, order.paymentRef],
    [t.paidAt, dateTime(order.paidAt, receiptLang(lang))],
    [t.order, `№${order.id}`],
    [t.buyer, order.email],
    [t.address, order.address],
    [t.phone, order.phone],
  ];
  for (const [k, v] of rows) {
    doc.font('regular').fontSize(10).fillColor(MUTED).text(k, left, y, { width: 150 });
    doc.font('regular').fontSize(10).fillColor(INK).text(v, left + 160, y, { width: width - 160 });
    y = Math.max(doc.y, y + 14) + 6;
  }

  // --- Таблица товаров ---
  y += 10;
  const col = { n: left + 10, name: left + 34, qty: right - 210, price: right - 150, sum: right - 80 };
  doc.save().roundedRect(left, y, width, 26, 6).fill(WASH).restore();
  doc.font('bold').fontSize(9).fillColor(MUTED);
  doc.text('№', col.n, y + 8);
  doc.text(t.item, col.name, y + 8);
  doc.text(t.qty, col.qty, y + 8, { width: 50, align: 'right' });
  doc.text(t.price, col.price, y + 8, { width: 60, align: 'right' });
  doc.text(t.sum, col.sum, y + 8, { width: 70, align: 'right' });
  y += 34;

  let goods = 0;
  order.items.forEach((it, i) => {
    const sum = it.price * it.quantity;
    goods += sum;
    if (y > doc.page.height - 220) {
      doc.addPage();
      y = 56;
    }
    doc.font('regular').fontSize(10).fillColor(MUTED).text(String(i + 1), col.n, y);
    doc.fillColor(INK).text(itemName(it.product), col.name, y, { width: col.qty - col.name - 10 });
    const rowBottom = doc.y;
    doc.text(String(it.quantity), col.qty, y, { width: 50, align: 'right' });
    doc.text(money(it.price), col.price, y, { width: 60, align: 'right' });
    doc.font('bold').text(money(sum), col.sum, y, { width: 70, align: 'right' });
    y = Math.max(rowBottom, y + 14) + 8;
    doc.save().moveTo(left, y - 4).lineTo(right, y - 4).lineWidth(0.6).strokeColor(LINE).stroke().restore();
  });

  // --- Итоги ---
  y += 8;
  const totalRow = (label, value, { bold = false, size = 10 } = {}) => {
    doc.font(bold ? 'bold' : 'regular').fontSize(size).fillColor(bold ? INK : MUTED).text(label, right - 300, y, { width: 180 });
    doc.font(bold ? 'bold' : 'regular').fontSize(size).fillColor(INK).text(value, right - 120, y, { width: 120, align: 'right' });
    y += size + 10;
  };
  totalRow(t.goods, money(goods));
  totalRow(t.delivery, t.free);
  doc.save().moveTo(right - 300, y - 2).lineTo(right, y - 2).lineWidth(1).strokeColor(INK).stroke().restore();
  y += 8;
  totalRow(t.total, money(order.total), { bold: true, size: 14 });

  // --- Оплата ---
  y += 14;
  doc.save().roundedRect(left, y, width, 64, 10).fill(WASH).restore();
  doc.font('regular').fontSize(9).fillColor(MUTED).text(t.method, left + 16, y + 14);
  doc.font('bold').fontSize(11).fillColor(INK)
    .text(`${t.card} ${CARD[order.cardBrand] ?? ''} •••• ${order.cardLast4}`.replace('  ', ' '), left + 16, y + 30);
  doc.font('regular').fontSize(9).fillColor(MUTED).text(t.status, right - 160, y + 14, { width: 144, align: 'right' });
  doc.save().roundedRect(right - 96, y + 28, 80, 22, 11).fill(ACCENT).restore();
  doc.font('bold').fontSize(10).fillColor(INK).text(t.paid, right - 96, y + 33, { width: 80, align: 'center' });
  y += 88;

  // --- Подвал ---
  doc.font('regular').fontSize(10).fillColor(INK).text(t.thanks, left, y, { width });
  if (order.items.some((it) => it.product.requiresPrescription)) {
    doc.moveDown(0.4).fontSize(9).fillColor(MUTED).text(t.rx, { width });
  }
  doc.moveDown(0.8).fontSize(9).fillColor(MUTED).text(`${t.questions}: ${supportEmail}${siteUrl ? ` · ${siteUrl.replace(/^https?:\/\//, '')}` : ''}`, { width });

  doc.end();
  return done;
}
