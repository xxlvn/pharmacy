import { z } from 'zod';

const trimmed = (min, max, label) =>
  z
    .string({ error: `${label}: ожидается строка` })
    .trim()
    .min(min, `${label}: не короче ${min} символов`)
    .max(max, `${label}: не длиннее ${max} символов`);

const optionalText = (max, label) =>
  z
    .string({ error: `${label}: ожидается строка` })
    .trim()
    .max(max, `${label}: максимум ${max} символов`)
    .nullable()
    .optional();

export const idParams = z.object({
  id: z.coerce.number({ error: 'id должен быть числом' }).int('id должен быть целым').positive('id должен быть больше 0'),
});

// ---------- Auth ----------

const emailField = z.email('Некорректный email').trim().toLowerCase().max(254);
const newPasswordField = z
  .string({ error: 'Пароль: ожидается строка' })
  .min(8, 'Пароль: минимум 8 символов')
  .max(128, 'Пароль: максимум 128 символов')
  .regex(/[A-Za-zА-Яа-я]/, 'Пароль должен содержать букву')
  .regex(/\d/, 'Пароль должен содержать цифру');

export const registerBody = z
  .object({
    email: emailField,
    name: trimmed(2, 100, 'Имя'),
    password: newPasswordField,
  })
  .strict('Недопустимое поле. Роль при регистрации назначать нельзя');

// Смена имени и почты. Для смены почты нужен текущий пароль (проверяется в сервисе).
// Роль и прочие поля через этот маршрут не меняются.
export const profileBody = z
  .object({
    name: trimmed(2, 100, 'Имя').optional(),
    email: emailField.optional(),
    currentPassword: z.string().max(128).optional(),
  })
  .strict('Недопустимое поле. Менять можно только имя и почту')
  .refine((d) => d.name !== undefined || d.email !== undefined, 'Передайте имя или почту');

export const passwordBody = z
  .object({
    currentPassword: z.string({ error: 'Укажите текущий пароль' }).min(1, 'Укажите текущий пароль').max(128),
    newPassword: newPasswordField,
  })
  .strict();

export const loginBody = z.object({
  email: z.email('Некорректный email').trim().toLowerCase(),
  password: z.string({ error: 'Пароль обязателен' }).min(1, 'Пароль обязателен').max(128),
});

// ---------- Восстановление пароля и 2FA ----------

export const forgotBody = z.object({ email: emailField }).strict();

export const resetBody = z
  .object({
    token: z.string({ error: 'Нет токена сброса' }).min(20, 'Нет токена сброса').max(200),
    newPassword: newPasswordField,
  })
  .strict();

// Код из приложения (6 цифр) или резервный код (ABCDE-FGHJK)
const codeField = z
  .string({ error: 'Введите код' })
  .trim()
  .min(6, 'Введите код')
  .max(20, 'Слишком длинный код');

export const twoFactorLoginBody = z
  .object({ challengeToken: z.string().min(1).max(1000), code: codeField })
  .strict();

export const codeBody = z.object({ code: codeField }).strict();

export const disableTwoFactorBody = z
  .object({
    currentPassword: z.string({ error: 'Укажите текущий пароль' }).min(1, 'Укажите текущий пароль').max(128),
    code: codeField,
  })
  .strict();

// ---------- Categories ----------

export const categoryCreateBody = z
  .object({
    name: trimmed(2, 80, 'Название'),
    slug: z
      .string()
      .trim()
      .toLowerCase()
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'slug: только латиница, цифры и дефис')
      .max(80),
    description: optionalText(500, 'Описание'),
  })
  .strict();

export const categoryUpdateBody = categoryCreateBody
  .partial()
  .refine((d) => Object.keys(d).length > 0, 'Передайте хотя бы одно поле для изменения');

// ---------- Products ----------

function isImageUrl(value) {
  if (/^\/api\/uploads\/\d+$/.test(value)) return true;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && Boolean(url.hostname);
  } catch {
    return false;
  }
}

const productFields = {
  name: trimmed(2, 150, 'Название'),
  description: optionalText(2000, 'Описание'),
  manufacturer: trimmed(2, 120, 'Производитель'),
  form: trimmed(2, 50, 'Форма выпуска'),
  dosage: optionalText(50, 'Дозировка'),
  price: z
    .number({ error: 'Цена должна быть числом' })
    .int('Цена указывается в целых тенге')
    .min(1, 'Цена должна быть больше 0')
    .max(10_000_000, 'Цена слишком большая'),
  stock: z
    .number({ error: 'Остаток должен быть числом' })
    .int('Остаток должен быть целым')
    .min(0, 'Остаток не может быть отрицательным')
    .max(1_000_000),
  requiresPrescription: z.boolean({ error: 'requiresPrescription должен быть true или false' }),
  // Любая ссылка https:// на картинку или фото, загруженное через POST /api/uploads
  imageUrl: z
    .string({ error: 'imageUrl: ожидается строка' })
    .trim()
    .max(500, 'imageUrl: не длиннее 500 символов')
    .refine(isImageUrl, 'imageUrl: нужна ссылка https:// или /api/uploads/<id>')
    .nullable()
    .optional(),
  imageCredit: optionalText(200, 'Автор фото'),
  categoryId: z.number({ error: 'categoryId должен быть числом' }).int().positive(),
};

export const productCreateBody = z
  .object({
    ...productFields,
    stock: productFields.stock.default(0),
    requiresPrescription: productFields.requiresPrescription.default(false),
  })
  .strict();

export const productUpdateBody = z
  .object(productFields)
  .partial()
  .strict()
  .refine((d) => Object.keys(d).length > 0, 'Передайте хотя бы одно поле для изменения');

const boolQuery = z
  .enum(['true', 'false', '1', '0'], { error: 'Ожидается true или false' })
  .transform((v) => v === 'true' || v === '1');

export const productListQuery = z.object({
  search: z.string().trim().max(100).optional(),
  categoryId: z.coerce.number().int().positive().optional(),
  inStock: boolQuery.optional(),
  prescription: boolQuery.optional(),
  minPrice: z.coerce.number().int().min(0).optional(),
  maxPrice: z.coerce.number().int().min(0).optional(),
  sort: z.enum(['name', 'price_asc', 'price_desc', 'newest']).default('name'),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(12),
});

// ---------- Orders ----------

export const ORDER_STATUSES = ['PENDING', 'CONFIRMED', 'SHIPPED', 'DELIVERED', 'CANCELLED'];

export const orderCreateBody = z
  .object({
    items: z
      .array(
        z
          .object({
            productId: z.number({ error: 'productId должен быть числом' }).int().positive(),
            quantity: z
              .number({ error: 'quantity должен быть числом' })
              .int()
              .min(1, 'Количество минимум 1')
              .max(50, 'Количество максимум 50'),
          })
          .strict(),
        { error: 'items должен быть массивом' },
      )
      .min(1, 'Заказ должен содержать хотя бы один товар')
      .max(30, 'Не более 30 позиций в заказе')
      .refine(
        (items) => new Set(items.map((i) => i.productId)).size === items.length,
        'Товары в заказе не должны повторяться',
      ),
    address: trimmed(5, 300, 'Адрес'),
    phone: z
      .string({ error: 'Телефон обязателен' })
      .trim()
      .regex(/^\+?[0-9\s\-()]{10,20}$/, 'Некорректный номер телефона'),
    comment: optionalText(500, 'Комментарий'),
  })
  .strict('Недопустимое поле. Владелец заказа определяется по токену');

// Оплата картой: только платёжная система и последние 4 цифры.
// Полный номер, срок и CVC сервер не принимает — лишние поля дают 400.
export const CARD_BRANDS = ['visa', 'mastercard', 'mir', 'amex', 'unionpay', 'card'];
export const orderPayBody = z
  .object({
    cardBrand: z.enum(CARD_BRANDS, { error: 'Неизвестная платёжная система' }),
    cardLast4: z.string({ error: 'Нужны последние 4 цифры карты' }).regex(/^\d{4}$/, 'Нужны последние 4 цифры карты'),
  })
  .strict('Недопустимое поле. Полные данные карты на сервер не передаются');

export const orderStatusBody = z
  .object({
    status: z.enum(ORDER_STATUSES, { error: `Статус: одно из ${ORDER_STATUSES.join(', ')}` }),
  })
  .strict();

export const orderListQuery = z.object({
  status: z.enum(ORDER_STATUSES).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

// ---------- Users (admin) ----------

export const userRoleBody = z
  .object({
    role: z.enum(['USER', 'ADMIN'], { error: 'Роль: USER или ADMIN' }),
  })
  .strict();
