// Интеграционные тесты REST API (встроенный node:test + fetch).
// Требуют запущенный PostgreSQL и выполненный seed: npm run db:seed
// Запуск: npm test
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';

process.env.NODE_ENV = 'test';
const { createApp } = await import('../src/app.js');
const { prisma } = await import('../src/config/prisma.js');
const { outbox } = await import('../src/services/mail.service.js');
const OTPAuth = await import('otpauth');

let server;
let base;
let adminToken;
let userToken;
let otherToken;
let categoryId;
let productId;
let orderId;
const stamp = Date.now();
const createdEmails = [];

async function api(method, path, { body, token } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(base + path, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  const text = await res.text();
  return { status: res.status, body: text ? JSON.parse(text) : null };
}

async function registerUser(suffix) {
  const email = `test-${suffix}-${stamp}@example.com`;
  createdEmails.push(email);
  const r = await api('POST', '/api/auth/register', { body: { email, name: 'Тестовый', password: 'Passw0rd1' } });
  return { email, ...r };
}

before(async () => {
  server = createApp().listen(0);
  await new Promise((r) => server.once('listening', r));
  base = `http://localhost:${server.address().port}`;

  const admin = await api('POST', '/api/auth/login', {
    body: { email: process.env.ADMIN_EMAIL || 'admin@pharmacy.local', password: process.env.ADMIN_PASSWORD || 'Admin12345' },
  });
  assert.equal(admin.status, 200, 'Админ из seed должен входить — выполните npm run db:seed');
  adminToken = admin.body.accessToken;
});

after(async () => {
  if (orderId) await prisma.order.deleteMany({ where: { id: orderId } });
  if (productId) await prisma.product.deleteMany({ where: { id: productId } });
  if (categoryId) await prisma.category.deleteMany({ where: { id: categoryId } });
  await prisma.user.deleteMany({ where: { email: { in: createdEmails } } });
  if (uploadId) await prisma.upload.deleteMany({ where: { id: uploadId } });
  await prisma.$disconnect();
  server.close();
});

// ---------- Регистрация и вход ----------

test('POST /api/auth/register — 201, роль USER, без passwordHash', async () => {
  const r = await registerUser('user');
  assert.equal(r.status, 201);
  assert.equal(r.body.user.role, 'USER');
  assert.ok(r.body.accessToken);
  assert.equal(r.body.user.passwordHash, undefined);
  userToken = r.body.accessToken;

  const other = await registerUser('other');
  otherToken = other.body.accessToken;
});

test('POST /api/auth/register — нельзя назначить себе ADMIN (400)', async () => {
  const r = await api('POST', '/api/auth/register', {
    body: { email: `hacker-${stamp}@example.com`, name: 'Хакер', password: 'Passw0rd1', role: 'ADMIN' },
  });
  assert.equal(r.status, 400);
});

test('POST /api/auth/register — повторный email (409)', async () => {
  const r = await api('POST', '/api/auth/register', {
    body: { email: createdEmails[0], name: 'Дубль', password: 'Passw0rd1' },
  });
  assert.equal(r.status, 409);
});

test('POST /api/auth/register — невалидные данные (400 с details)', async () => {
  const r = await api('POST', '/api/auth/register', { body: { email: 'not-an-email', name: 'A', password: '123' } });
  assert.equal(r.status, 400);
  assert.ok(Array.isArray(r.body.error.details));
  assert.ok(r.body.error.details.length >= 3);
});

test('POST /api/auth/login — неверный пароль (401)', async () => {
  const r = await api('POST', '/api/auth/login', { body: { email: createdEmails[0], password: 'WrongPass1' } });
  assert.equal(r.status, 401);
});

test('GET /api/auth/me — с токеном 200, без токена 401, с мусорным токеном 401', async () => {
  assert.equal((await api('GET', '/api/auth/me', { token: userToken })).status, 200);
  assert.equal((await api('GET', '/api/auth/me')).status, 401);
  assert.equal((await api('GET', '/api/auth/me', { token: 'abc.def.ghi' })).status, 401);
});

// ---------- Категории и права ----------

test('POST /api/categories — гость 401, user 403, admin 201', async () => {
  const body = { name: `Тестовая ${stamp}`, slug: `test-${stamp}` };
  assert.equal((await api('POST', '/api/categories', { body })).status, 401);
  assert.equal((await api('POST', '/api/categories', { body, token: userToken })).status, 403);
  const r = await api('POST', '/api/categories', { body, token: adminToken });
  assert.equal(r.status, 201);
  categoryId = r.body.data.id;
});

// ---------- CRUD основной сущности Product ----------

test('POST /api/products — admin создаёт товар (201)', async () => {
  const r = await api('POST', '/api/products', {
    token: adminToken,
    body: { name: 'Тест-препарат', manufacturer: 'ТестФарм', form: 'Таблетки', dosage: '10 мг', price: 1000, stock: 5, categoryId },
  });
  assert.equal(r.status, 201);
  assert.equal(r.body.data.category.id, categoryId);
  productId = r.body.data.id;
});

test('POST /api/products — несуществующая категория (400), неверный тип цены (400)', async () => {
  const base = { name: 'X-препарат', manufacturer: 'ТестФарм', form: 'Сироп' };
  assert.equal((await api('POST', '/api/products', { token: adminToken, body: { ...base, price: 100, categoryId: 999999 } })).status, 400);
  assert.equal((await api('POST', '/api/products', { token: adminToken, body: { ...base, price: 'дорого', categoryId } })).status, 400);
});

test('GET /api/products — список с фильтрами и пагинацией', async () => {
  const r = await api('GET', `/api/products?categoryId=${categoryId}&limit=5`);
  assert.equal(r.status, 200);
  assert.equal(r.body.meta.total, 1);
  assert.equal(r.body.data[0].id, productId);
  assert.equal((await api('GET', '/api/products?limit=500')).status, 400);
});

test('GET /api/products/:id — 200 со связанной категорией, 404, 400', async () => {
  const r = await api('GET', `/api/products/${productId}`);
  assert.equal(r.status, 200);
  assert.equal(r.body.data.category.slug, `test-${stamp}`);
  assert.equal((await api('GET', '/api/products/999999')).status, 404);
  assert.equal((await api('GET', '/api/products/abc')).status, 400);
});

test('GET /api/categories/:id — связанный запрос: категория с товарами', async () => {
  const r = await api('GET', `/api/categories/${categoryId}`);
  assert.equal(r.status, 200);
  assert.equal(r.body.data.products.length, 1);
});

test('PATCH /api/products/:id — user 403, admin 200', async () => {
  assert.equal((await api('PATCH', `/api/products/${productId}`, { token: userToken, body: { price: 1 } })).status, 403);
  const r = await api('PATCH', `/api/products/${productId}`, { token: adminToken, body: { price: 1200, stock: 3 } });
  assert.equal(r.status, 200);
  assert.equal(r.body.data.price, 1200);
});

// ---------- Заказы ----------

test('POST /api/orders — гость без почты 400; userId из тела запрещён (400)', async () => {
  const body = { items: [{ productId, quantity: 1 }], address: 'Алматы, Абая 1', phone: '+7 701 000 00 00' };
  assert.equal((await api('POST', '/api/orders', { body })).status, 400);
  assert.equal((await api('POST', '/api/orders', { token: userToken, body: { ...body, userId: 1 } })).status, 400);
});

test('POST /api/orders — больше, чем в наличии (409)', async () => {
  const r = await api('POST', '/api/orders', {
    token: userToken,
    body: { items: [{ productId, quantity: 10 }], address: 'Алматы, Абая 1', phone: '+7 701 000 00 00' },
  });
  assert.equal(r.status, 409);
});

test('POST /api/orders — создание заказа (201), остаток списан', async () => {
  const r = await api('POST', '/api/orders', {
    token: userToken,
    body: { items: [{ productId, quantity: 2 }], address: 'Алматы, Абая 1', phone: '+7 701 000 00 00' },
  });
  assert.equal(r.status, 201);
  assert.equal(r.body.data.total, 2400);
  assert.equal(r.body.data.items[0].product.id, productId);
  orderId = r.body.data.id;

  const p = await api('GET', `/api/products/${productId}`);
  assert.equal(p.body.data.stock, 1);
});

test('GET /api/orders/:id — владелец 200, чужой пользователь 403, admin 200', async () => {
  assert.equal((await api('GET', `/api/orders/${orderId}`, { token: userToken })).status, 200);
  assert.equal((await api('GET', `/api/orders/${orderId}`, { token: otherToken })).status, 403);
  assert.equal((await api('GET', `/api/orders/${orderId}`, { token: adminToken })).status, 200);
});

test('GET /api/orders — пользователь видит только свои заказы', async () => {
  const r = await api('GET', '/api/orders', { token: otherToken });
  assert.equal(r.status, 200);
  assert.equal(r.body.data.length, 0);
});

test('DELETE /api/products/:id — товар в заказе удалить нельзя (409)', async () => {
  assert.equal((await api('DELETE', `/api/products/${productId}`, { token: adminToken })).status, 409);
});

test('PATCH /api/orders/:id/status — user 403, недопустимый переход 409, admin 200', async () => {
  assert.equal((await api('PATCH', `/api/orders/${orderId}/status`, { token: userToken, body: { status: 'CONFIRMED' } })).status, 403);
  assert.equal((await api('PATCH', `/api/orders/${orderId}/status`, { token: adminToken, body: { status: 'DELIVERED' } })).status, 409);
  const r = await api('PATCH', `/api/orders/${orderId}/status`, { token: adminToken, body: { status: 'CONFIRMED' } });
  assert.equal(r.status, 200);
  assert.equal(r.body.data.status, 'CONFIRMED');
});

test('PATCH /api/orders/:id/cancel — подтверждённый заказ пользователь отменить не может (409), admin может, остаток вернулся', async () => {
  assert.equal((await api('PATCH', `/api/orders/${orderId}/cancel`, { token: userToken })).status, 409);
  const r = await api('PATCH', `/api/orders/${orderId}/cancel`, { token: adminToken });
  assert.equal(r.status, 200);
  assert.equal(r.body.data.status, 'CANCELLED');
  const p = await api('GET', `/api/products/${productId}`);
  assert.equal(p.body.data.stock, 3);
});

// ---------- Удаление и прочие ошибки ----------

test('DELETE /api/categories/:id — категория с товарами (409)', async () => {
  assert.equal((await api('DELETE', `/api/categories/${categoryId}`, { token: adminToken })).status, 409);
});

test('DELETE /api/products/:id — admin удаляет товар без заказов (204), затем 404', async () => {
  await prisma.order.delete({ where: { id: orderId } });
  orderId = undefined;
  assert.equal((await api('DELETE', `/api/products/${productId}`, { token: adminToken })).status, 204);
  assert.equal((await api('GET', `/api/products/${productId}`)).status, 404);
  productId = undefined;
});

test('GET /api/users — только admin; ответ без passwordHash', async () => {
  assert.equal((await api('GET', '/api/users', { token: userToken })).status, 403);
  const r = await api('GET', '/api/users', { token: adminToken });
  assert.equal(r.status, 200);
  assert.ok(r.body.data.every((u) => u.passwordHash === undefined));
});

test('GET /api/stats/dashboard — гость 401, user 403, admin 200 со сводкой', async () => {
  assert.equal((await api('GET', '/api/stats/dashboard')).status, 401);
  assert.equal((await api('GET', '/api/stats/dashboard', { token: userToken })).status, 403);
  assert.equal((await api('GET', '/api/stats/dashboard?days=13', { token: adminToken })).status, 400);
  const r = await api('GET', '/api/stats/dashboard?days=7', { token: adminToken });
  assert.equal(r.status, 200);
  assert.equal(r.body.data.daily.length, 7);
  assert.ok(typeof r.body.data.current.revenue === 'number');
  assert.ok('PENDING' in r.body.data.statuses);
});

// Минимальный настоящий PNG 1×1 для проверки загрузки
const PNG_1x1 = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
);
let uploadId;

async function upload(body, type, token) {
  const headers = { 'Content-Type': type };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${base}/api/uploads`, { method: 'POST', headers, body });
  return { status: res.status, body: await res.json().catch(() => null) };
}

test('POST /api/uploads — гость 401, user 403, admin 201', async () => {
  assert.equal((await upload(PNG_1x1, 'image/png')).status, 401);
  assert.equal((await upload(PNG_1x1, 'image/png', userToken)).status, 403);
  const r = await upload(PNG_1x1, 'image/png', adminToken);
  assert.equal(r.status, 201);
  assert.match(r.body.data.url, /^\/api\/uploads\/\d+$/);
  assert.equal(r.body.data.mimeType, 'image/png');
  uploadId = r.body.data.id;
});

test('POST /api/uploads — не картинка (415), подмена типа (400)', async () => {
  assert.equal((await upload(Buffer.from('<script>alert(1)</script>'), 'image/png', adminToken)).status, 415);
  assert.equal((await upload(Buffer.from('hello'), 'text/plain', adminToken)).status, 415);
  assert.equal((await upload(PNG_1x1, 'image/jpeg', adminToken)).status, 400);
});

test('GET /api/uploads/:id — отдаёт файл с правильным типом; 404 для несуществующего', async () => {
  const res = await fetch(`${base}/api/uploads/${uploadId}`);
  assert.equal(res.status, 200);
  assert.equal(res.headers.get('content-type'), 'image/png');
  assert.deepEqual(Buffer.from(await res.arrayBuffer()), PNG_1x1);
  assert.equal((await fetch(`${base}/api/uploads/999999`)).status, 404);
});

test('PUT /api/auth/me/avatar — гость 401, не картинка 415; аватар ставится, заменяется и удаляется', async () => {
  const put = async (body, type, token) => {
    const headers = { 'Content-Type': type };
    if (token) headers.Authorization = `Bearer ${token}`;
    const res = await fetch(`${base}/api/auth/me/avatar`, { method: 'PUT', headers, body });
    return { status: res.status, body: await res.json().catch(() => null) };
  };
  assert.equal((await put(PNG_1x1, 'image/png')).status, 401);
  assert.equal((await put(Buffer.from('nope'), 'image/png', userToken)).status, 415);

  const first = await put(PNG_1x1, 'image/png', userToken);
  assert.equal(first.status, 200);
  assert.match(first.body.user.avatarUrl, /^\/api\/uploads\/\d+$/);
  assert.equal(first.body.user.passwordHash, undefined);

  // замена: старый файл удаляется
  const second = await put(PNG_1x1, 'image/png', userToken);
  assert.notEqual(second.body.user.avatarUrl, first.body.user.avatarUrl);
  assert.equal((await fetch(base + first.body.user.avatarUrl)).status, 404);
  assert.equal((await api('GET', '/api/auth/me', { token: userToken })).body.user.avatarUrl, second.body.user.avatarUrl);

  // чужой аватар не меняется: у второго пользователя его по-прежнему нет
  assert.equal((await api('GET', '/api/auth/me', { token: otherToken })).body.user.avatarUrl, null);

  const del = await api('DELETE', '/api/auth/me/avatar', { token: userToken });
  assert.equal(del.status, 200);
  assert.equal(del.body.user.avatarUrl, null);
  assert.equal((await fetch(base + second.body.user.avatarUrl)).status, 404);
});

test('PATCH /api/products/:id — imageUrl может быть /api/uploads/<id>', async () => {
  const p = await api('POST', '/api/products', {
    token: adminToken,
    body: { name: 'Фото-товар', manufacturer: 'ТестФарм', form: 'Таблетки', price: 100, categoryId, imageUrl: `/api/uploads/${uploadId}` },
  });
  assert.equal(p.status, 201);
  assert.equal(p.body.data.imageUrl, `/api/uploads/${uploadId}`);
  await prisma.product.delete({ where: { id: p.body.data.id } });
});

test('POST /api/products — imageUrl только https (400 для http)', async () => {
  const r = await api('POST', '/api/products', {
    token: adminToken,
    body: { name: 'Фото-тест', manufacturer: 'ТестФарм', form: 'Таблетки', price: 100, categoryId: 1, imageUrl: 'http://example.com/a.jpg' },
  });
  assert.equal(r.status, 400);
});

test('PATCH /api/auth/me/password — проверки, новый токен, старые токены отзываются', async () => {
  const reg = await registerUser('password');
  const oldToken = reg.body.accessToken;
  const body = (currentPassword, newPassword) => ({ token: oldToken, body: { currentPassword, newPassword } });

  assert.equal((await api('PATCH', '/api/auth/me/password', body('WrongPass1', 'NewPassw0rd'))).status, 400);
  assert.equal((await api('PATCH', '/api/auth/me/password', body('Passw0rd1', 'short'))).status, 400);
  assert.equal((await api('PATCH', '/api/auth/me/password', body('Passw0rd1', 'Passw0rd1'))).status, 400);

  // время выдачи JWT считается в секундах: ждём, чтобы старый токен был заведомо «раньше» смены пароля
  await new Promise((r) => setTimeout(r, 1100));
  const changed = await api('PATCH', '/api/auth/me/password', body('Passw0rd1', 'NewPassw0rd'));
  assert.equal(changed.status, 200);
  assert.ok(changed.body.accessToken);

  assert.equal((await api('GET', '/api/auth/me', { token: oldToken })).status, 401);
  assert.equal((await api('GET', '/api/auth/me', { token: changed.body.accessToken })).status, 200);
  assert.equal((await api('POST', '/api/auth/login', { body: { email: reg.email, password: 'Passw0rd1' } })).status, 401);
  assert.equal((await api('POST', '/api/auth/login', { body: { email: reg.email, password: 'NewPassw0rd' } })).status, 200);
});

// ---------- Двухфакторная защита ----------

test('2FA: настройка, вход в два шага, защита от повтора кода, резервные коды, отключение', async () => {
  const reg = await registerUser('twofa');
  const token = reg.body.accessToken;
  assert.equal(reg.body.user.totpEnabled, false);
  assert.equal((await api('POST', '/api/auth/2fa/setup')).status, 401);

  const setup = await api('POST', '/api/auth/2fa/setup', { token });
  assert.equal(setup.status, 200);
  assert.match(setup.body.qr, /^data:image\/png;base64,/);
  assert.match(setup.body.otpauthUrl, /^otpauth:\/\/totp\//);
  const totp = new OTPAuth.TOTP({ secret: OTPAuth.Secret.fromBase32(setup.body.secret), digits: 6, period: 30 });

  assert.equal((await api('POST', '/api/auth/2fa/enable', { token, body: { code: '12345' } })).status, 400);
  const nowCode = totp.generate();
  const enabled = await api('POST', '/api/auth/2fa/enable', { token, body: { code: nowCode } });
  assert.equal(enabled.status, 200);
  assert.equal(enabled.body.recoveryCodes.length, 8);
  const recovery = enabled.body.recoveryCodes;
  assert.equal((await api('POST', '/api/auth/2fa/setup', { token })).status, 409);
  assert.equal((await api('GET', '/api/auth/me', { token })).body.user.totpEnabled, true);
  assert.deepEqual((await api('GET', '/api/auth/2fa', { token })).body, { enabled: true, recoveryCodesLeft: 8 });

  // Секреты наружу не отдаются
  const users = await api('GET', '/api/users', { token: adminToken });
  const listed = JSON.stringify(users.body);
  assert.ok(!listed.includes('totpSecret') && !listed.includes('recoveryCodes'));

  // Шаг 1: пароль → только «пропуск», без токена доступа
  const step1 = await api('POST', '/api/auth/login', { body: { email: reg.email, password: 'Passw0rd1' } });
  assert.equal(step1.status, 200);
  assert.equal(step1.body.twoFactorRequired, true);
  assert.equal(step1.body.accessToken, undefined);
  const { challengeToken } = step1.body;
  assert.equal((await api('GET', '/api/auth/me', { token: challengeToken })).status, 401);

  const second = (code) => api('POST', '/api/auth/login/2fa', { body: { challengeToken, code } });
  assert.equal((await second('AAAAA-AAAAA')).status, 401);
  assert.equal((await second(nowCode)).status, 401, 'Уже использованный код повторно не принимается');
  assert.equal((await api('POST', '/api/auth/login/2fa', { body: { challengeToken: token, code: nowCode } })).status, 401);

  const nextCode = totp.generate({ timestamp: Date.now() + 30_000 });
  const ok = await second(nextCode);
  assert.equal(ok.status, 200);
  assert.ok(ok.body.accessToken);
  assert.equal(ok.body.user.email, reg.email);

  // Резервный код — одноразовый, регистр и дефис не важны
  const rc = recovery[0].toLowerCase().replace('-', '');
  assert.equal((await second(rc)).status, 200);
  assert.equal((await second(rc)).status, 401);
  assert.equal((await api('GET', '/api/auth/2fa', { token })).body.recoveryCodesLeft, 7);

  // Отключение: нужен и пароль, и код
  const disable = (currentPassword, code) => api('POST', '/api/auth/2fa/disable', { token, body: { currentPassword, code } });
  assert.equal((await disable('WrongPass1', recovery[1])).status, 400);
  assert.equal((await disable('Passw0rd1', 'BBBBB-BBBBB')).status, 400);
  assert.equal((await disable('Passw0rd1', recovery[2])).status, 200);
  const plain = await api('POST', '/api/auth/login', { body: { email: reg.email, password: 'Passw0rd1' } });
  assert.ok(plain.body.accessToken);
  assert.equal(plain.body.user.totpEnabled, false);
});

// ---------- Оплата заказа картой ----------

test('POST /api/orders/:id/pay — только владелец, только last4, без повторной оплаты', async () => {
  const product = await prisma.product.findFirst({ where: { stock: { gte: 5 } }, orderBy: { id: 'asc' } });
  const buyer = await registerUser('pay');
  const token = buyer.body.accessToken;
  const created = await api('POST', '/api/orders', {
    token,
    body: { items: [{ productId: product.id, quantity: 1 }], address: 'Алматы, ул. Абая, 10', phone: '+7 701 123 45 67' },
  });
  assert.equal(created.status, 201);
  const id = created.body.data.id;
  assert.equal(created.body.data.paidAt, null);
  const pay = (body, t = token) => api('POST', `/api/orders/${id}/pay`, { token: t, body });

  assert.equal((await api('POST', `/api/orders/${id}/pay`, { body: { cardBrand: 'visa', cardLast4: '4242' } })).status, 401);
  assert.equal((await pay({ cardBrand: 'visa', cardLast4: '4242' }, otherToken)).status, 403);
  // Полный номер карты сервер не принимает
  assert.equal((await pay({ cardBrand: 'visa', cardLast4: '4242', cardNumber: '4242424242424242' })).status, 400);
  assert.equal((await pay({ cardBrand: 'visa', cardLast4: '42' })).status, 400);
  assert.equal((await pay({ cardBrand: 'bitcoin', cardLast4: '4242' })).status, 400);

  const paid = await pay({ cardBrand: 'visa', cardLast4: '4242' });
  assert.equal(paid.status, 200);
  assert.ok(paid.body.data.paidAt);
  assert.equal(paid.body.data.cardLast4, '4242');
  assert.match(paid.body.data.paymentRef, /^MT-/);
  assert.equal((await pay({ cardBrand: 'visa', cardLast4: '4242' })).status, 409);

  // Отменённый заказ оплатить нельзя
  const second = await api('POST', '/api/orders', {
    token,
    body: { items: [{ productId: product.id, quantity: 1 }], address: 'Алматы, ул. Абая, 10', phone: '+7 701 123 45 67' },
  });
  assert.equal((await api('PATCH', `/api/orders/${second.body.data.id}/cancel`, { token })).status, 200);
  assert.equal((await api('POST', `/api/orders/${second.body.data.id}/pay`, { token, body: { cardBrand: 'mastercard', cardLast4: '5100' } })).status, 409);

  // Возвращаем остаток и убираем тестовые заказы
  assert.equal((await api('PATCH', `/api/orders/${id}/cancel`, { token })).status, 409, 'оплаченный заказ покупатель не отменяет');
  assert.equal((await api('PATCH', `/api/orders/${id}/cancel`, { token: adminToken })).status, 200);
  await prisma.order.deleteMany({ where: { id: { in: [id, second.body.data.id] } } });
});

// ---------- Заказ без регистрации и PDF-квитанция ----------

test('Гостевой заказ: почта обязательна, оплата по ключу, чек на почту, PDF-квитанция', async () => {
  const product = await prisma.product.findFirst({ where: { stock: { gte: 5 } }, orderBy: { id: 'asc' } });
  const body = { items: [{ productId: product.id, quantity: 1 }], address: 'Алматы, ул. Абая, 10', phone: '+7 701 123 45 67' };
  const email = `guest-${stamp}@example.com`;

  assert.equal((await api('POST', '/api/orders', { body })).status, 400, 'без входа нужна почта');
  const created = await api('POST', '/api/orders', { body: { ...body, email } });
  assert.equal(created.status, 201);
  assert.equal(created.body.data.userId, null);
  assert.equal(created.body.data.email, email);
  assert.equal(created.body.data.accessHash, undefined, 'хеш ключа не отдаётся');
  const { accessKey } = created.body;
  assert.ok(accessKey && accessKey.length >= 20);
  const id = created.body.data.id;

  const pay = (key, extra = {}) =>
    fetch(`${base}/api/orders/${id}/pay`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(key ? { 'X-Order-Key': key } : {}), ...extra },
      body: JSON.stringify({ cardBrand: 'visa', cardLast4: '4242' }),
    });
  const receipt = (query = '', headers = {}) => fetch(`${base}/api/orders/${id}/receipt${query}`, { headers });

  assert.equal((await receipt(`?key=${accessKey}`)).status, 409, 'квитанции нет до оплаты');
  assert.equal((await pay()).status, 401);
  assert.equal((await pay('wrong-key-wrong-key-wrong')).status, 403);
  assert.equal((await pay(accessKey, { Authorization: `Bearer ${otherToken}` })).status, 200, 'ключ работает и у вошедшего');
  assert.equal((await pay(accessKey)).status, 409);

  // Чек уходит на почту из заказа с PDF во вложении
  await new Promise((r) => setTimeout(r, 300));
  const mail = outbox.findLast((m) => m.to === email);
  assert.ok(mail, 'письмо с чеком отправлено');
  assert.match(mail.subject, new RegExp(`№${id}`));
  assert.equal(mail.attachments.length, 1);
  assert.ok(Buffer.from(mail.attachments[0].content, 'base64').subarray(0, 4).toString() === '%PDF');
  assert.ok(mail.text.includes(`/api/orders/${id}/receipt?key=`));

  // Квитанция: по ключу, администратору — да; без ключа и чужому — нет
  const pdf = await receipt(`?key=${accessKey}&lang=kk`);
  assert.equal(pdf.status, 200);
  assert.equal(pdf.headers.get('content-type'), 'application/pdf');
  assert.match(pdf.headers.get('content-disposition'), /attachment; filename="myata-receipt-\d+\.pdf"/);
  assert.equal(Buffer.from(await pdf.arrayBuffer()).subarray(0, 4).toString(), '%PDF');
  assert.equal((await receipt()).status, 401);
  assert.equal((await receipt('', { Authorization: `Bearer ${userToken}` })).status, 403);
  assert.equal((await receipt('', { Authorization: `Bearer ${adminToken}` })).status, 200);

  // Гость не видит список заказов; оплаченный заказ отменяет только администратор
  assert.equal((await api('GET', `/api/orders/${id}`)).status, 401);
  assert.equal((await api('PATCH', `/api/orders/${id}/cancel`, { token: adminToken })).status, 200);
  await prisma.order.deleteMany({ where: { id } });
});

test('PATCH /api/orders/:id/cancel — оплаченный заказ покупатель отменить не может (409)', async () => {
  const product = await prisma.product.findFirst({ where: { stock: { gte: 5 } }, orderBy: { id: 'asc' } });
  const created = await api('POST', '/api/orders', {
    token: userToken,
    body: { items: [{ productId: product.id, quantity: 1 }], address: 'Алматы, ул. Абая, 10', phone: '+7 701 123 45 67' },
  });
  assert.equal(created.status, 201);
  const id = created.body.data.id;
  assert.ok(created.body.data.email, 'почта берётся из аккаунта');
  assert.equal((await api('POST', `/api/orders/${id}/pay`, { token: userToken, body: { cardBrand: 'visa', cardLast4: '1111' } })).status, 200);
  const r = await api('PATCH', `/api/orders/${id}/cancel`, { token: userToken });
  assert.equal(r.status, 409);
  assert.match(r.body.error.message, /Оплаченный заказ отменить нельзя/);
  const own = await fetch(`${base}/api/orders/${id}/receipt`, { headers: { Authorization: `Bearer ${userToken}` } });
  assert.equal(own.status, 200, 'владелец скачивает квитанцию без ключа');
  assert.equal((await api('PATCH', `/api/orders/${id}/cancel`, { token: adminToken })).status, 200);
  await prisma.order.deleteMany({ where: { id } });
});

test('GET /api/orders?mine=true — администратор видит только свои заказы', async () => {
  const all = await api('GET', '/api/orders?limit=100', { token: adminToken });
  const mine = await api('GET', '/api/orders?mine=true&limit=100', { token: adminToken });
  assert.equal(mine.status, 200);
  const me = (await api('GET', '/api/auth/me', { token: adminToken })).body.user;
  assert.ok(mine.body.data.every((o) => o.userId === me.id));
  assert.ok(all.body.meta.total >= mine.body.meta.total);
  assert.equal((await api('GET', '/api/orders?mine=yes', { token: adminToken })).status, 400);
});

test('Некорректный JSON (400) и неизвестный маршрут (404)', async () => {
  const res = await fetch(`${base}/api/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{bad json' });
  assert.equal(res.status, 400);
  assert.equal((await api('GET', '/api/unknown')).status, 404);
});
