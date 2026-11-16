// Интеграционные тесты REST API (встроенный node:test + fetch).
// Требуют запущенный PostgreSQL и выполненный seed: npm run db:seed
// Запуск: npm test
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';

process.env.NODE_ENV = 'test';
const { createApp } = await import('../src/app.js');
const { prisma } = await import('../src/config/prisma.js');

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

test('POST /api/orders — гость 401; userId из тела игнорируется (400)', async () => {
  const body = { items: [{ productId, quantity: 1 }], address: 'Алматы, Абая 1', phone: '+7 701 000 00 00' };
  assert.equal((await api('POST', '/api/orders', { body })).status, 401);
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

test('Некорректный JSON (400) и неизвестный маршрут (404)', async () => {
  const res = await fetch(`${base}/api/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{bad json' });
  assert.equal(res.status, 400);
  assert.equal((await api('GET', '/api/unknown')).status, 404);
});
