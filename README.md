# REST API для системы управления интернет-аптекой

Курсовая работа по ПМ4 «Разработка браузерных приложений».
Серверное приложение на **Node.js (ES Modules) + Express 5 + Prisma ORM + PostgreSQL** с регистрацией, входом по **JWT**, ролями **user / admin**, полным CRUD товаров, заказами со списанием остатков и веб-интерфейсом «Мята».

**Сайт:** https://pharmacy-myata.onrender.com · **API:** https://pharmacy-myata.onrender.com/api/health

## Содержание

1. [Возможности](#возможности)
2. [Технологии](#технологии)
3. [Структура проекта](#структура-проекта)
4. [ER-диаграмма](#er-диаграмма)
5. [Установка и запуск](#установка-и-запуск)
6. [Матрица доступа](#матрица-доступа)
7. [Формат ответов и ошибок](#формат-ответов-и-ошибок)
8. [Документация API](#документация-api)
9. [Тестирование](#тестирование)
10. [Безопасность](#безопасность)

## Возможности

- Регистрация и вход, выдача JWT (`Authorization: Bearer <accessToken>`), пароли хранятся как хеш **Argon2id**.
- Роли `USER` и `ADMIN`. Публичная регистрация всегда создаёт `USER`.
- **Полный CRUD основной сущности `Product`** (лекарственные товары): список с поиском, фильтрами, сортировкой и пагинацией, получение по ID, создание, изменение, удаление.
- CRUD категорий, связанные запросы через Prisma `include` (товар + категория, категория + товары, заказ + позиции + товары + покупатель).
- Заказы: проверка наличия, списание остатков в транзакции, переходы статусов, возврат товара на склад при отмене.
- Валидация входных данных (Zod), централизованная обработка ошибок (400, 401, 403, 404, 409, 429, 500).
- Веб-интерфейс (дополнительно): каталог, карточка товара, корзина, оформление заказа, «Мои заказы», панель администратора.

## Технологии

| Технология | Назначение |
|---|---|
| Node.js 20+ (ES Modules) | Среда выполнения |
| Express 5 | HTTP-сервер и маршрутизация; async-ошибки автоматически передаются в обработчик |
| PostgreSQL 14+ | Реляционная СУБД |
| Prisma ORM 6 | Схема БД, миграции, типобезопасные запросы |
| argon2 | Хеширование паролей (Argon2id) |
| jsonwebtoken | Выдача и проверка JWT (HS256) |
| zod | Валидация body / query / params |
| helmet, express-rate-limit | HTTP-заголовки безопасности, ограничение попыток входа |
| node:test | Интеграционные тесты API |

## Структура проекта

```
pharmacy-api/
├── prisma/
│   ├── schema.prisma        # модель данных (5 сущностей)
│   ├── migrations/          # SQL-миграции
│   └── seed.js              # тестовые данные
├── src/
│   ├── config/              # env.js (переменные окружения), prisma.js (клиент БД)
│   ├── routes/              # маршруты: URL + middleware + контроллер
│   ├── controllers/         # разбор запроса и формирование HTTP-ответа
│   ├── services/            # бизнес-логика и запросы к БД через Prisma
│   ├── middleware/          # requireAuth, requireRole, validate, errorHandler
│   ├── validators/          # Zod-схемы входных данных
│   ├── utils/               # ApiError, безопасный выбор полей пользователя
│   ├── app.js               # сборка Express-приложения
│   └── server.js            # точка входа
├── public/                  # веб-интерфейс (HTML/CSS/JS)
├── tests/api.test.js        # интеграционные тесты
├── .env.example
└── README.md
```

Поток запроса:

```
HTTP-запрос → Route → middleware (requireAuth → requireRole → validate) → Controller → Service → Prisma → PostgreSQL
                                                         ↓ ошибка на любом шаге
                                                   errorHandler → JSON { error }
```

## ER-диаграмма

```mermaid
erDiagram
    User ||--o{ Order : "оформляет"
    Category ||--o{ Product : "содержит"
    Order ||--|{ OrderItem : "состоит из"
    Product ||--o{ OrderItem : "входит в"

    User {
        int id PK
        string email UK
        string name
        string password_hash
        enum role "USER | ADMIN"
        datetime created_at
    }
    Category {
        int id PK
        string name UK
        string slug UK
        string description
        datetime created_at
    }
    Product {
        int id PK
        string name
        string description
        string manufacturer
        string form
        string dosage
        int price "тенге"
        int stock
        boolean requires_prescription
        string image_url
        string image_credit
        int category_id FK
        datetime created_at
        datetime updated_at
    }
    Order {
        int id PK
        int user_id FK
        enum status "PENDING | CONFIRMED | SHIPPED | DELIVERED | CANCELLED"
        int total "тенге"
        string address
        string phone
        string comment
        datetime created_at
        datetime updated_at
    }
    OrderItem {
        int id PK
        int order_id FK
        int product_id FK
        int quantity
        int price "цена на момент заказа"
    }
```

Связи и кратности:

| Связь | Кратность | Внешний ключ | При удалении родителя |
|---|---|---|---|
| Category → Product | 1 : N | `products.category_id` | запрещено (`RESTRICT`), если в категории есть товары |
| User → Order | 1 : N | `orders.user_id` | заказы удаляются (`CASCADE`) |
| Order → OrderItem | 1 : N (минимум 1) | `order_items.order_id` | позиции удаляются (`CASCADE`) |
| Product → OrderItem | 1 : N | `order_items.product_id` | запрещено (`RESTRICT`), если товар есть в заказах |

`OrderItem` реализует связь «многие ко многим» между `Order` и `Product` и хранит цену на момент покупки. Пара `(order_id, product_id)` уникальна.

## Установка и запуск

### 1. Требования

- **Node.js 20+**: https://nodejs.org (проверка: `node -v`)
- **PostgreSQL 14+**: https://www.postgresql.org/download/ (при установке запомните пароль пользователя `postgres`)
- Git

### 2. Клонирование и зависимости

```bash
git clone https://github.com/<ваш-логин>/pharmacy-api.git
cd pharmacy-api
npm install
```

> npm 11+ по умолчанию блокирует install-скрипты. Для `argon2` и `prisma` они разрешены в `package.json` (`allowScripts`). Если `argon2` не собрался, выполните `npm rebuild argon2`.

### 3. Настройка `.env`

```bash
cp .env.example .env
```

Заполните `.env`:

| Переменная | Описание | Пример |
|---|---|---|
| `DATABASE_URL` | Подключение к PostgreSQL | `postgresql://postgres:ПАРОЛЬ@localhost:5432/pharmacy_api?schema=public` |
| `JWT_SECRET` | Секрет подписи JWT, ≥ 32 символов | `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"` |
| `JWT_EXPIRES_IN` | Срок жизни токена | `1d` |
| `PORT` | Порт сервера | `3000` |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `ADMIN_NAME` | Единственный аккаунт, который создаёт seed (администратор) | `admin@example.com` / свой пароль |

Файл `.env` в репозиторий не попадает (см. `.gitignore`).

### 4. База данных

```bash
npm run db:migrate   # создаёт БД pharmacy_api, применяет миграции и запускает seed
```

Повторно заполнить тестовыми данными: `npm run db:seed`. Полностью пересоздать: `npm run db:reset`.
Посмотреть данные в браузере: `npm run db:studio`.

### 5. Запуск

```bash
npm run dev     # с автоперезапуском (nodemon)
npm start       # обычный запуск
```

- API: http://localhost:3000/api
- Веб-интерфейс: http://localhost:3000

### Учётные записи

Seed создаёт одного администратора из `ADMIN_EMAIL` / `ADMIN_PASSWORD` в `.env`. Покупателей для проверки зарегистрируйте через `POST /api/auth/register` или на сайте. Ещё 6 покупателей seed создаёт только для истории заказов на дашборде: пароль у них случайный и нигде не сохраняется, войти под ними нельзя.

## Развёртывание (Render + Neon)

Сайт и API работают как один веб-сервис: Express отдаёт и `/api`, и страницы из `public/`.

1. **База.** Создайте проект на [Neon](https://neon.tech) и скопируйте строку подключения (`postgresql://...?sslmode=require`).
2. **Схема и данные.** Локально, подставив строку Neon в `DATABASE_URL`:
   ```bash
   npx prisma migrate deploy
   npm run db:seed
   ```
   Seed выполняется один раз: он пересоздаёт все данные.
3. **Сервер.** На [Render](https://render.com) выберите New → Blueprint и укажите этот репозиторий. Render прочитает `render.yaml`, спросит `DATABASE_URL` и сам сгенерирует `JWT_SECRET`. Сборка выполняет `prisma migrate deploy`, так что новые миграции применяются при каждом деплое.
4. Установите приложение Render на репозиторий: https://github.com/apps/render/installations/new → Only select repositories → этот репозиторий. Без него Render не узнаёт о новых коммитах, и автодеплой не срабатывает.
5. После этого каждый `git push` в `main` запускает сборку и выкладку новой версии. Вручную её можно запустить кнопкой **Manual Deploy → Deploy latest commit**.

На бесплатном тарифе Render сервис засыпает после 15 минут без запросов, и первый запрос после этого занимает около минуты.

## Матрица доступа

| Ресурс / действие | guest | user | admin |
|---|:-:|:-:|:-:|
| `POST /api/auth/register`, `POST /api/auth/login` | ✅ | ✅ | ✅ |
| `GET /api/auth/me` | ❌ 401 | ✅ | ✅ |
| Просмотр товаров и категорий (`GET`) | ✅ | ✅ | ✅ |
| Создание / изменение / удаление товаров и категорий | ❌ 401 | ❌ 403 | ✅ |
| Создание заказа | ❌ 401 | ✅ (владелец = `req.user.id`) | ✅ |
| Список заказов | ❌ 401 | ✅ только свои | ✅ все |
| Просмотр заказа по ID | ❌ 401 | ✅ только свой, чужой → 403 | ✅ любой |
| Отмена заказа (`/cancel`) | ❌ 401 | ✅ свой, только в статусе `PENDING` | ✅ любой в `PENDING` / `CONFIRMED` |
| Смена статуса заказа (`/status`) | ❌ 401 | ❌ 403 | ✅ |
| Управление пользователями (`/api/users`) | ❌ 401 | ❌ 403 | ✅ (кроме себя) |
| Статистика (`/api/stats/dashboard`) | ❌ 401 | ❌ 403 | ✅ |
| Загрузка фото (`POST /api/uploads`) | ❌ 401 | ❌ 403 | ✅ |
| Просмотр фото (`GET /api/uploads/:id`) | ✅ | ✅ | ✅ |

Правила проверки JWT (`src/middleware/auth.js`):

1. Заголовок должен иметь вид `Authorization: Bearer <accessToken>`, иначе `401`.
2. Подпись проверяется секретом `JWT_SECRET` (только алгоритм HS256). Истёкший или поддельный токен → `401`.
3. Пользователь из `sub` загружается из БД. Роль берётся из БД, а не из токена, поэтому понижение роли или удаление пользователя действует сразу.
4. `requireRole('ADMIN')` возвращает `403`, если роль недостаточна.
5. Владелец заказа всегда `req.user.id`. Поле `userId` в теле запроса запрещено схемой, такой запрос получает `400`.

## Формат ответов и ошибок

Успешные ответы:

```json
{ "data": { ... } }
{ "data": [ ... ], "meta": { "total": 63, "page": 1, "limit": 12, "pages": 6 } }
```

Ошибки имеют единый формат:

```json
{
  "error": {
    "status": 400,
    "message": "Ошибка валидации данных",
    "details": [
      { "location": "body", "field": "price", "message": "Цена должна быть больше 0" }
    ]
  }
}
```

| Код | Когда возвращается |
|---|---|
| 200 OK | Успешное чтение или изменение |
| 201 Created | Ресурс создан |
| 204 No Content | Ресурс удалён |
| 400 Bad Request | Ошибка валидации, некорректный JSON, неверный id, лишние поля |
| 401 Unauthorized | Нет токена, токен недействителен или истёк, неверный email/пароль |
| 403 Forbidden | Недостаточно прав (user → маршрут admin, чужой заказ) |
| 404 Not Found | Ресурс или маршрут не найден |
| 409 Conflict | Email или slug занят, недостаточно товара, недопустимый переход статуса, удаление связанных данных |
| 429 Too Many Requests | Более 20 попыток входа/регистрации за 15 минут |
| 500 Internal Server Error | Непредвиденная ошибка (подробности только в логе сервера) |

## Документация API

Базовый URL: `http://localhost:3000/api`. Все тела запросов и ответов в JSON (`Content-Type: application/json`).
Для защищённых маршрутов передаётся заголовок:

```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.<payload>.<signature>
```

### Служебные

#### `GET /api/health`
Проверка работоспособности. Доступ: все.
**200** → `{ "status": "ok", "time": "2026-11-13T10:00:00.000Z" }`

---

### Аутентификация

#### `POST /api/auth/register`
Регистрация. Доступ: все. Роль всегда `USER`.

Request Body:
```json
{ "email": "aigerim@example.com", "name": "Айгерим", "password": "Passw0rd1" }
```
Правила: email корректный; имя 2–100 символов; пароль 8–128 символов, минимум одна буква и одна цифра. Лишние поля (например, `role`) → `400`.

**201** Response:
```json
{
  "user": { "id": 3, "email": "aigerim@example.com", "name": "Айгерим", "role": "USER", "createdAt": "2026-11-13T10:00:00.000Z" },
  "accessToken": "eyJhbGciOiJIUzI1NiIs..."
}
```
Ошибки: `400` (валидация), `409` (email уже зарегистрирован), `429`.

#### `POST /api/auth/login`
Вход. Доступ: все.

Request Body:
```json
{ "email": "aigerim@example.com", "password": "Passw0rd1" }
```
**200** Response: как у регистрации (`user` + `accessToken`).
Ошибки: `400`, `401` («Неверный email или пароль», одинаково для неверного email и неверного пароля), `429`.

#### `GET /api/auth/me`
Текущий пользователь. Доступ: user, admin. Заголовок `Authorization` обязателен.
**200** → `{ "user": { "id": 2, "email": "aigerim@example.com", "name": "Айгерим", "role": "USER", "createdAt": "..." } }`
Ошибки: `401`.

---

### Товары (основная сущность, полный CRUD)

#### `GET /api/products`
Список товаров с категорией (Prisma `include`). Доступ: все.

Query-параметры (все необязательные):

| Параметр | Тип | Описание |
|---|---|---|
| `search` | string | Поиск по названию, производителю, описанию (без учёта регистра) |
| `categoryId` | int | Фильтр по категории |
| `inStock` | `true`/`false` | Только в наличии / только отсутствующие |
| `prescription` | `true`/`false` | Только рецептурные / только безрецептурные |
| `minPrice`, `maxPrice` | int | Диапазон цены, ₸ |
| `sort` | `name` \| `price_asc` \| `price_desc` \| `newest` | Сортировка (по умолчанию `name`) |
| `page` | int ≥ 1 | Страница (по умолчанию 1) |
| `limit` | int 1–100 | Размер страницы (по умолчанию 12) |

Пример: `GET /api/products?search=ибупрофен&inStock=true&sort=price_asc`

**200** Response:
```json
{
  "data": [
    {
      "id": 2,
      "name": "Ибупрофен",
      "description": "Нестероидное противовоспалительное средство...",
      "manufacturer": "Химфарм",
      "form": "Таблетки",
      "dosage": "400 мг, 20 шт",
      "price": 640,
      "stock": 85,
      "requiresPrescription": false,
      "categoryId": 1,
      "createdAt": "2026-11-13T10:00:00.000Z",
      "updatedAt": "2026-11-13T10:00:00.000Z",
      "category": { "id": 1, "name": "Обезболивающие и жаропонижающие", "slug": "pain-relief" }
    }
  ],
  "meta": { "total": 1, "page": 1, "limit": 12, "pages": 1 }
}
```
Ошибки: `400` (неверные параметры, например `limit=500`, или `minPrice > maxPrice`).

#### `GET /api/products/:id`
Товар по ID вместе с категорией. Доступ: все.
**200** → `{ "data": { ...товар, "category": { "id": 1, "name": "...", "slug": "..." } } }`
Ошибки: `400` (id не число), `404`.

#### `POST /api/products`
Создание товара. Доступ: **admin**.

Request Body:
```json
{
  "name": "Цитрамон П",
  "manufacturer": "Фармстандарт",
  "form": "Таблетки",
  "dosage": "10 шт",
  "price": 180,
  "stock": 100,
  "requiresPrescription": false,
  "description": "Комбинированное обезболивающее",
  "categoryId": 1
}
```
Обязательные поля: `name`, `manufacturer`, `form`, `price` (целое > 0, в тенге), `categoryId`. `stock` по умолчанию 0, `requiresPrescription` по умолчанию `false`.
**201** → `{ "data": { "id": 24, ..., "category": { ... } } }`
Ошибки: `400` (валидация или несуществующая категория), `401`, `403`.

#### `PATCH /api/products/:id`
Частичное изменение. Доступ: **admin**. Можно передать любое подмножество полей из `POST`, минимум одно.
Request Body: `{ "price": 650, "stock": 120 }`
**200** → `{ "data": { ...обновлённый товар } }`
Ошибки: `400`, `401`, `403`, `404`.

#### `DELETE /api/products/:id`
Удаление товара. Доступ: **admin**.
**204** без тела.
Ошибки: `401`, `403`, `404`, `409` (товар есть в заказах; чтобы снять его с продажи, обнулите остаток).

---

### Категории

#### `GET /api/categories`
Все категории с количеством товаров. Доступ: все.
**200**:
```json
{ "data": [ { "id": 1, "name": "Обезболивающие и жаропонижающие", "slug": "pain-relief", "description": "...", "createdAt": "...", "_count": { "products": 5 } } ] }
```

#### `GET /api/categories/:id`
Категория со списком товаров (связанный запрос, Prisma `include`). Доступ: все.
**200** → `{ "data": { "id": 1, "name": "...", "products": [ { "id": 1, "name": "Парацетамол", "price": 290, "stock": 140, ... } ] } }`
Ошибки: `400`, `404`.

#### `POST /api/categories`
Доступ: **admin**. Request Body: `{ "name": "Детское здоровье", "slug": "kids", "description": "..." }`. `slug` содержит только латиницу, цифры и дефис.
**201** → `{ "data": { ... } }`. Ошибки: `400`, `401`, `403`, `409` (имя или slug заняты).

#### `PATCH /api/categories/:id`
Доступ: **admin**. Request Body: любое подмножество `name`, `slug`, `description`.
**200**. Ошибки: `400`, `401`, `403`, `404`, `409`.

#### `DELETE /api/categories/:id`
Доступ: **admin**. **204**. Ошибки: `401`, `403`, `404`, `409` (в категории есть товары).

---

### Заказы

Все маршруты требуют `Authorization: Bearer <accessToken>`.

#### `POST /api/orders`
Оформление заказа от имени текущего пользователя. Доступ: user, admin.

Request Body:
```json
{
  "items": [ { "productId": 2, "quantity": 2 }, { "productId": 8, "quantity": 1 } ],
  "address": "г. Алматы, ул. Абая, 10, кв. 5",
  "phone": "+7 701 123 45 67",
  "comment": "Код домофона 15"
}
```
Правила: 1–30 позиций, товары не повторяются, количество 1–50. Поле `userId` запрещено, владелец берётся из токена.
В одной транзакции проверяется наличие, списываются остатки (условное `UPDATE ... WHERE stock >= quantity` защищает от гонки), фиксируются цены, считается сумма.

**201** Response:
```json
{
  "data": {
    "id": 5,
    "userId": 2,
    "status": "PENDING",
    "total": 3470,
    "address": "г. Алматы, ул. Абая, 10, кв. 5",
    "phone": "+7 701 123 45 67",
    "comment": "Код домофона 15",
    "createdAt": "...",
    "updatedAt": "...",
    "items": [
      { "id": 9, "orderId": 5, "productId": 2, "quantity": 2, "price": 640,
        "product": { "id": 2, "name": "Ибупрофен", "form": "Таблетки", "dosage": "400 мг, 20 шт", "requiresPrescription": false } }
    ],
    "user": { "id": 2, "name": "Айгерим", "email": "aigerim@example.com" }
  }
}
```
Ошибки: `400` (валидация, лишние поля), `401`, `404` (товар не найден), `409` (недостаточно товара).

#### `GET /api/orders`
Список заказов: пользователь видит свои, администратор все. Query: `status` (`PENDING`…`CANCELLED`), `page`, `limit` (1–100, по умолчанию 20).
**200** → `{ "data": [ ...заказы с items и user ], "meta": { ... } }`. Ошибки: `400`, `401`.

#### `GET /api/orders/:id`
Заказ с позициями и товарами. Пользователь получает только свой заказ.
**200** → `{ "data": { ... } }`. Ошибки: `400`, `401`, `403` (чужой заказ), `404`.

#### `PATCH /api/orders/:id/cancel`
Отмена заказа. Пользователь может отменить свой заказ в статусе `PENDING`, администратор любой заказ в статусе `PENDING` или `CONFIRMED`. Товары возвращаются на склад.
Тело не требуется. **200** → `{ "data": { ..., "status": "CANCELLED" } }`
Ошибки: `401`, `403`, `404`, `409` (статус не позволяет отмену).

#### `PATCH /api/orders/:id/status`
Смена статуса. Доступ: **admin**.
Request Body: `{ "status": "CONFIRMED" }`

Допустимые переходы:

```
PENDING ──► CONFIRMED ──► SHIPPED ──► DELIVERED
   │            │
   └────────────┴──► CANCELLED   (товары возвращаются на склад)
```
**200** → `{ "data": { ...заказ } }`. Ошибки: `400`, `401`, `403`, `404`, `409` (недопустимый переход).

---

### Загрузка фото товаров

#### `POST /api/uploads`
Загрузка изображения. Доступ: **admin**. Тело запроса — сам файл, а не JSON.

Заголовки:
```
Authorization: Bearer <accessToken>
Content-Type: image/jpeg | image/png | image/webp
```
Ограничения: до 2 МБ. Формат проверяется по первым байтам файла, поэтому переименованный текстовый файл не пройдёт. Веб-интерфейс перед отправкой уменьшает фото до 1200px и сжимает в WebP.

**201** Response:
```json
{ "data": { "id": 12, "mimeType": "image/webp", "size": 84213, "createdAt": "...", "url": "/api/uploads/12" } }
```
Полученный `url` записывается в поле `imageUrl` товара через `POST` или `PATCH /api/products`.
Ошибки: `400` (тип файла не совпадает с `Content-Type`), `401`, `403`, `413` (больше 2 МБ), `415` (не JPEG, PNG или WebP).

Пример:
```bash
curl -X POST http://localhost:3000/api/uploads \
  -H "Authorization: Bearer <adminToken>" -H "Content-Type: image/jpeg" \
  --data-binary @photo.jpg
```

#### `GET /api/uploads/:id`
Отдаёт изображение. Доступ: все, чтобы фото были видны в каталоге. Ответ кешируется на год: файл по одному `id` никогда не меняется.
Ошибки: `400`, `404`.

Фото хранятся в таблице `uploads` в PostgreSQL. Диск бесплатного хостинга очищается при каждом деплое, а база — нет.

---

### Статистика (дашборд администратора)

#### `GET /api/stats/dashboard`
Сводка для панели администратора. Доступ: **admin**.
Query: `days`, одно из `7`, `30`, `90` (по умолчанию `30`).

Отменённые заказы в выручку не входят. Каждый показатель сравнивается с предыдущим периодом той же длины. Дни считаются по времени Алматы.

**200** Response:
```json
{
  "data": {
    "periodDays": 30,
    "current":  { "revenue": 387480, "orders": 76, "avgCheck": 5098, "customers": 6 },
    "previous": { "revenue": 391200, "orders": 75, "avgCheck": 5216, "customers": 6 },
    "daily": [ { "date": "2026-11-13", "revenue": 14510, "orders": 3 } ],
    "statuses": { "PENDING": 4, "CONFIRMED": 1, "SHIPPED": 5, "DELIVERED": 66, "CANCELLED": 4 },
    "topProducts": [ { "id": 1, "name": "Парацетамол", "dosage": "500 мг, 20 шт", "price": 290, "sold": 24 } ],
    "lowStock": [ { "id": 5, "name": "Кеторол", "dosage": "10 мг, 20 шт", "stock": 0, "form": "Таблетки", "imageUrl": "https://..." } ],
    "catalog": { "products": 63, "outOfStock": 3, "users": 7 }
  }
}
```
Ошибки: `400` (недопустимый `days`), `401`, `403`.

---

### Пользователи (администрирование)

Доступ: **admin**.

#### `GET /api/users`
**200** → `{ "data": [ { "id": 1, "email": "admin@example.com", "name": "Администратор", "role": "ADMIN", "createdAt": "...", "_count": { "orders": 0 } } ] }`
`passwordHash` в ответ не попадает никогда.

#### `PATCH /api/users/:id/role`
Request Body: `{ "role": "ADMIN" }`. **200** → `{ "data": { ...пользователь } }`
Ошибки: `400`, `401`, `403`, `404`, `409` (нельзя менять собственную роль).

#### `DELETE /api/users/:id`
**204**. Заказы пользователя удаляются каскадно. Ошибки: `401`, `403`, `404`, `409` (нельзя удалить себя).

## Тестирование

### Автотесты

```bash
npm test
```

31 интеграционный тест (`tests/api.test.js`, встроенный `node:test`) поднимают приложение на свободном порту и проверяют:

- регистрацию (201), запрет самоназначения ADMIN (400), повтор email (409), валидацию (400), неверный пароль (401);
- `/auth/me` с токеном (200), без токена (401), с поддельным токеном (401);
- права: guest → 401, user → 403, admin → 201/200/204;
- полный CRUD товара, фильтры и пагинацию, 404 и 400 по id;
- связанные запросы (товар + категория, категория + товары, заказ + позиции);
- заказ: нехватка товара (409), списание и возврат остатков, чужой заказ (403), недопустимый переход статуса (409);
- дашборд администратора: guest 401, user 403, неверный период 400, admin 200;
- ссылка на фото только https (400 для http);
- загрузка фото: guest 401, user 403, admin 201, не картинка 415, подмена типа 400, выдача файла с верным `Content-Type`;
- запрет удаления связанных данных (409), некорректный JSON (400), неизвестный маршрут (404).

Тесты создают и затем удаляют свои данные. Требуются запущенный PostgreSQL и выполненный seed.

### Ручная проверка (curl)

```bash
# 1. Вход администратора — получить токен
curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"<ADMIN_EMAIL>","password":"<ADMIN_PASSWORD>"}'

# 2. Запрос без JWT → 401
curl -i -X POST http://localhost:3000/api/products -H "Content-Type: application/json" -d '{}'

# 3. Пользователь пытается создать товар → 403
curl -i -X POST http://localhost:3000/api/products \
  -H "Authorization: Bearer <userToken>" -H "Content-Type: application/json" \
  -d '{"name":"Тест","manufacturer":"Тест","form":"Таблетки","price":100,"categoryId":1}'

# 4. Администратор создаёт товар → 201
curl -i -X POST http://localhost:3000/api/products \
  -H "Authorization: Bearer <adminToken>" -H "Content-Type: application/json" \
  -d '{"name":"Цитрамон П","manufacturer":"Фармстандарт","form":"Таблетки","price":180,"stock":100,"categoryId":1}'

# 5. Изменение и удаление
curl -i -X PATCH  http://localhost:3000/api/products/24 -H "Authorization: Bearer <adminToken>" -H "Content-Type: application/json" -d '{"price":200}'
curl -i -X DELETE http://localhost:3000/api/products/24 -H "Authorization: Bearer <adminToken>"
```

## Языки интерфейса

Сайт работает на русском, казахском и английском. Язык переключается внизу страницы и запоминается в браузере, при первом визите он берётся из настроек браузера. Словарь лежит в `public/js/i18n.js`, тексты информационных страниц в `public/js/info.js`.

Переводятся все элементы интерфейса, названия категорий, формы выпуска, статусы заказов, единицы в дозировке, даты и числа. API отвечает по-русски, как описано выше. На казахском и английском сайт подбирает сообщение об ошибке по коду ответа и переводит названия полей из `details`. Описания препаратов хранятся в базе на русском, рядом с ними выводится пометка об этом.

Шрифт: на iPhone и Mac используется системный SF Pro. Лицензия Apple не разрешает встраивать его в сайт, поэтому на остальных устройствах подставляется Inter, а если SF Pro установлен в Windows, браузер возьмёт его.

## Фотографии препаратов

У 43 из 63 товаров есть фото с [Wikimedia Commons](https://commons.wikimedia.org) под свободными лицензиями (CC0, CC BY, CC BY-SA, общественное достояние). Ссылки и авторство хранятся в `prisma/images.json` и попадают в поля `imageUrl` и `imageCredit`. Автор и лицензия показываются под фото на странице товара, как требуют лицензии CC BY и CC BY-SA.

Фото показывают действующее вещество и форму выпуска. Упаковка на снимке может быть от другого производителя, чем указано в карточке. Изображения загружаются с серверов Wikimedia, поэтому без интернета вместо них показывается иконка формы выпуска. Администратор может заменить фото в форме товара: загрузить файл с компьютера (JPEG, PNG или WebP, браузер уменьшит его до 1200px) или вставить любую ссылку `https://` на картинку.

## Безопасность

- Пароли хешируются **Argon2id** (19 MiB, 2 итерации, по рекомендациям OWASP). Открытые пароли нигде не хранятся.
- Для несуществующего email тоже выполняется проверка хеша, поэтому по времени ответа нельзя узнать, зарегистрирован ли адрес.
- `passwordHash` исключён из всех ответов (`select` публичных полей).
- Публичная регистрация не принимает поле `role`. Изменить роль может только администратор, и только чужую.
- Владелец ресурса определяется по `req.user.id` из проверенного токена.
- Роль проверяется по актуальным данным БД при каждом запросе.
- Секреты хранятся только в `.env` (в `.gitignore`); в репозитории есть только `.env.example`.
- `helmet` задаёт заголовки безопасности (в том числе CSP), `express-rate-limit` ограничивает попытки входа, размер тела ограничен 100 КБ.
- Ответы с кодом 500 не раскрывают внутренности: подробности только в логе сервера (в режиме разработки добавляется поле `debug`).
