// Тестовые данные: администратор, покупатели, категории, товары с фото и история заказов.
// Запуск: npm run db:seed (повторный запуск пересоздаёт все данные).
import 'dotenv/config';
import { readFileSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import { PrismaClient } from '@prisma/client';
import argon2 from 'argon2';

const prisma = new PrismaClient();
const hash = (p) => argon2.hash(p, { type: argon2.argon2id, memoryCost: 19456, timeCost: 2, parallelism: 1 });

// Фото препаратов: свободные лицензии Wikimedia Commons (автор и лицензия в imageCredit).
const images = JSON.parse(readFileSync(new URL('./images.json', import.meta.url), 'utf8'));

const categories = [
  { name: 'Обезболивающие и жаропонижающие', slug: 'pain-relief', description: 'Средства от боли, температуры и воспаления' },
  { name: 'Простуда и грипп', slug: 'cold-flu', description: 'Средства от насморка, кашля и боли в горле' },
  { name: 'Нервная система', slug: 'nervous-system', description: 'Успокоительные, противотревожные и антидепрессанты' },
  { name: 'Аллергия', slug: 'allergy', description: 'Антигистаминные препараты' },
  { name: 'Витамины и БАД', slug: 'vitamins', description: 'Витамины, минералы и биологически активные добавки' },
  { name: 'Пищеварение', slug: 'digestion', description: 'Средства для желудка и кишечника' },
  { name: 'Антибиотики', slug: 'antibiotics', description: 'Отпускаются строго по рецепту врача' },
  { name: 'Сердце и сосуды', slug: 'cardio', description: 'Препараты для сердечно-сосудистой системы' },
  { name: 'Аптечка и уход', slug: 'first-aid', description: 'Антисептики, пластыри, средства первой помощи' },
  { name: 'Кожа', slug: 'skin', description: 'Кремы и мази при грибке, герпесе и раздражении кожи' },
  { name: 'Глаза и уши', slug: 'eyes-ears', description: 'Глазные и ушные капли' },
  { name: 'Детям', slug: 'kids', description: 'Препараты в детских формах и дозировках' },
  { name: 'Диабет', slug: 'diabetes', description: 'Сахароснижающие препараты и средства контроля глюкозы' },
  { name: 'Мама и малыш', slug: 'mother-baby', description: 'Витамины для беременных и кормящих' },
  { name: 'Медтехника', slug: 'devices', description: 'Тонометры, термометры, глюкометры' },
];

// [категория, название, производитель, форма, дозировка, цена ₸, остаток, рецепт, описание]
const products = [
  ['pain-relief', 'Парацетамол', 'Фармстандарт', 'Таблетки', '500 мг, 20 шт', 290, 140, false, 'Жаропонижающее и обезболивающее средство при простуде, головной и зубной боли.'],
  ['pain-relief', 'Ибупрофен', 'Химфарм', 'Таблетки', '200 мг, 50 шт', 640, 85, false, 'Нестероидное противовоспалительное средство. Снимает боль и воспаление.'],
  ['pain-relief', 'Нурофен Экспресс', 'Reckitt Benckiser', 'Капсулы', '200 мг, 16 шт', 2350, 40, false, 'Ибупрофен в жидкой капсуле, начинает действовать быстрее обычной таблетки.'],
  ['pain-relief', 'Но-шпа', 'Sanofi', 'Таблетки', '40 мг, 24 шт', 1890, 60, false, 'Дротаверин. Снимает спазмы гладкой мускулатуры.'],
  ['pain-relief', 'Кеторол', "Dr. Reddy's", 'Таблетки', '10 мг, 20 шт', 1450, 0, true, 'Кеторолак. Сильное обезболивающее, курс не дольше 5 дней.'],
  ['pain-relief', 'Аспирин', 'Bayer', 'Таблетки', '500 мг, 20 шт', 1150, 70, false, 'Ацетилсалициловая кислота в кишечнорастворимой оболочке.'],
  ['pain-relief', 'Анальгин', 'Дальхимфарм', 'Раствор для инъекций', '500 мг/мл, 10 ампул', 980, 25, true, 'Метамизол натрия. Применяется по назначению врача.'],
  ['pain-relief', 'Диклофенак гель', 'Hemofarm', 'Гель', '1%, 50 г', 1320, 4, false, 'Наружное средство при боли в мышцах и суставах.'],

  ['cold-flu', 'Терафлю Лимон', 'GSK', 'Порошок', '10 пакетиков', 3290, 35, false, 'Комбинированное средство от симптомов гриппа и простуды.'],
  ['cold-flu', 'Називин', 'Merck', 'Спрей', '0,05%, 10 мл', 1590, 50, false, 'Сосудосуживающий спрей при заложенности носа, не дольше 7 дней.'],
  ['cold-flu', 'Стрепсилс', 'Reckitt Benckiser', 'Пастилки', '24 шт', 2190, 70, false, 'Антисептические пастилки при боли в горле.'],
  ['cold-flu', 'Амброксол', 'Химфарм', 'Сироп', '15 мг/5 мл, 100 мл', 870, 45, false, 'Отхаркивающее средство при влажном кашле.'],

  ['nervous-system', 'Алпразолам', 'Органика', 'Таблетки', '0,5 мг, 50 шт', 2480, 12, true, 'Транквилизатор при тревожных расстройствах. Строго по рецепту, вызывает привыкание.'],
  ['nervous-system', 'Атаракс', 'UCB Pharma', 'Таблетки', '25 мг, 25 шт', 3150, 18, true, 'Гидроксизин. Снимает тревогу и кожный зуд, вызывает сонливость.'],
  ['nervous-system', 'Феназепам', 'Валента', 'Таблетки', '1 мг, 50 шт', 1290, 3, true, 'Транквилизатор. Отпускается только по рецепту, курс назначает врач.'],
  ['nervous-system', 'Амитриптилин', 'Nycomed', 'Таблетки', '25 мг, 50 шт', 1060, 22, true, 'Трициклический антидепрессант. Только по рецепту.'],
  ['nervous-system', 'Афобазол', 'Отисифарм', 'Таблетки', '10 мг, 60 шт', 4290, 30, false, 'Фабомотизол. Безрецептурное средство при лёгкой тревожности.'],
  ['nervous-system', 'Глицин', 'Биотики', 'Таблетки', '100 мг, 50 шт', 420, 160, false, 'Аминокислота для рассасывания под языком.'],

  ['allergy', 'Цетиризин', 'Teva', 'Таблетки', '10 мг, 20 шт', 760, 64, false, 'Антигистаминное средство второго поколения, не вызывает сильной сонливости.'],
  ['allergy', 'Лоратадин', 'Химфарм', 'Таблетки', '10 мг, 10 шт', 420, 90, false, 'Антигистаминное средство при сезонной аллергии и крапивнице.'],
  ['allergy', 'Супрастин', 'Egis', 'Таблетки', '25 мг, 20 шт', 1240, 0, false, 'Хлоропирамин. Быстро снимает аллергические реакции, вызывает сонливость.'],

  ['vitamins', 'Витамин D3 Аквадетрим', 'Medana Pharma', 'Капли', '15 000 МЕ/мл, 10 мл', 2650, 55, false, 'Водный раствор витамина D3 для профилактики дефицита.'],
  ['vitamins', 'Компливит', 'Отисифарм', 'Таблетки', '60 шт', 1980, 90, false, 'Витаминно-минеральный комплекс на каждый день.'],
  ['vitamins', 'Магне B6', 'Sanofi', 'Таблетки', '50 шт', 4890, 25, false, 'Магний и витамин B6 при усталости и стрессе.'],
  ['vitamins', 'Омега-3', 'Solgar', 'Капсулы', '1000 мг, 60 шт', 7900, 2, false, 'Рыбий жир с полиненасыщенными жирными кислотами.'],

  ['digestion', 'Панкреатин', 'Биосинтез', 'Таблетки', '25 ЕД, 60 шт', 690, 75, false, 'Ферментный препарат для улучшения пищеварения.'],
  ['digestion', 'Диосмектит', 'Mylan', 'Порошок', '3 г, 10 пакетиков', 1490, 40, false, 'Сорбент при диарее и вздутии.'],
  ['digestion', 'Омепразол', 'Actavis', 'Капсулы', '20 мг, 30 шт', 980, 0, false, 'Снижает кислотность желудка при изжоге.'],
  ['digestion', 'Лоперамид', 'Hasco-Lek', 'Капсулы', '2 мг, 20 шт', 450, 55, false, 'Средство при острой диарее.'],
  ['digestion', 'Активированный уголь', 'Фармстандарт', 'Таблетки', '250 мг, 50 шт', 190, 210, false, 'Сорбент при отравлениях и вздутии.'],

  ['antibiotics', 'Амоксициллин', 'Sandoz', 'Капсулы', '500 мг, 16 шт', 1150, 30, true, 'Антибиотик широкого спектра. Только по рецепту врача.'],
  ['antibiotics', 'Азитромицин', 'Sandoz', 'Таблетки', '500 мг, 3 шт', 1790, 22, true, 'Антибиотик из группы макролидов. Только по рецепту врача.'],

  ['cardio', 'Кардиомагнил', 'Takeda', 'Таблетки', '75 мг, 100 шт', 3490, 18, false, 'Ацетилсалициловая кислота и магний для профилактики тромбозов.'],
  ['cardio', 'Валидол', 'Фармстандарт', 'Таблетки', '60 мг, 10 шт', 260, 120, false, 'Успокаивающее средство при неприятных ощущениях в области сердца.'],
  ['cardio', 'Эналаприл', 'KRKA', 'Таблетки', '10 мг, 20 шт', 540, 48, true, 'Снижает артериальное давление. Только по рецепту.'],
  ['cardio', 'Лозартан', 'Merck', 'Таблетки', '100 мг, 30 шт', 2160, 26, true, 'Антагонист рецепторов ангиотензина при гипертонии.'],
  ['cardio', 'Аторвастатин', 'Teva', 'Таблетки', '20 мг, 30 шт', 1870, 5, true, 'Снижает уровень холестерина. Только по рецепту.'],
  ['cardio', 'Бисопролол', 'Gedeon Richter', 'Таблетки', '5 мг, 30 шт', 1230, 34, true, 'Бета-блокатор при гипертонии и аритмии.'],

  ['first-aid', 'Хлоргексидин', 'Виалайн', 'Раствор', '0,05%, 100 мл', 350, 200, false, 'Антисептик для обработки ран и слизистых.'],
  ['first-aid', 'Бепантен', 'Bayer', 'Мазь', '5%, 30 г', 3150, 28, false, 'Декспантенол. Заживляет мелкие повреждения и ожоги кожи.'],
  ['first-aid', 'Лейкопластырь бактерицидный', 'Hartmann', 'Пластырь', '20 шт', 690, 150, false, 'Набор пластырей разных размеров с антисептиком.'],

  ['skin', 'Канестен', 'Bayer', 'Крем', '1%, 20 г', 1890, 30, false, 'Клотримазол. Противогрибковый крем для кожи.'],
  ['skin', 'Цинковая мазь', 'Тульская ФФ', 'Мазь', '10%, 25 г', 320, 80, false, 'Подсушивает и защищает кожу при раздражении и опрелостях.'],
  ['skin', 'Ацикловир крем', 'Белмедпрепараты', 'Крем', '5%, 5 г', 450, 45, false, 'Противовирусный крем при герпесе на губах.'],
  ['skin', 'Кетоконазол шампунь', 'Teva', 'Шампунь', '2%, 60 мл', 1990, 33, false, 'Противогрибковый шампунь при перхоти и себорее.'],
  ['skin', 'Тербинафин', 'Вертекс', 'Крем', '1%, 15 г', 980, 26, false, 'Противогрибковое средство для кожи и стоп.'],

  ['eyes-ears', 'Визин Классический', 'Johnson & Johnson', 'Капли', '0,05%, 15 мл', 2190, 40, false, 'Тетризолин. Снимает покраснение и отёк глаз.'],
  ['eyes-ears', 'Искусственная слеза', 'Solopharm', 'Капли', '10 мл', 890, 35, false, 'Увлажняющие капли при сухости и усталости глаз.'],
  ['eyes-ears', 'Левомицетин капли', 'Дальхимфарм', 'Капли', '0,25%, 10 мл', 260, 3, true, 'Антибактериальные глазные капли при конъюнктивите.'],
  ['eyes-ears', 'Отипакс', 'Biocodex', 'Капли', '15 г', 2950, 20, false, 'Ушные капли при боли в ухе.'],

  ['kids', 'Нурофен для детей', 'Reckitt Benckiser', 'Сироп', '100 мг/5 мл, 100 мл', 2490, 38, false, 'Ибупрофен для детей с 3 месяцев при температуре и боли.'],
  ['kids', 'Панадол Детский', 'GSK', 'Сироп', '120 мг/5 мл, 100 мл', 1790, 30, false, 'Парацетамол для детей с 3 месяцев.'],
  ['kids', 'Аквамарис', 'Jadran', 'Спрей', '30 мл', 2390, 50, false, 'Морская вода для промывания носа, можно с рождения.'],
  ['kids', 'Боботик', 'Medana Pharma', 'Капли', '16 мл', 1990, 3, false, 'Симетикон. Капли при коликах и вздутии у детей с 28 дней.'],

  ['diabetes', 'Метформин', 'Teva', 'Таблетки', '500 мг, 60 шт', 890, 60, true, 'Снижает уровень сахара в крови при диабете 2 типа.'],
  ['diabetes', 'Гликлазид МВ', 'Акрихин', 'Таблетки', '60 мг, 30 шт', 1320, 22, true, 'Сахароснижающий препарат при диабете 2 типа.'],
  ['diabetes', 'Тест-полоски Accu-Chek Active', 'Roche', 'Тест-полоски', '50 шт', 7900, 15, false, 'Полоски для измерения уровня глюкозы в крови.'],

  ['mother-baby', 'Витамины для беременных', 'Bayer', 'Таблетки', '30 шт', 5900, 24, false, 'Комплекс с фолиевой кислотой, железом и йодом.'],
  ['mother-baby', 'Фолиевая кислота', 'Озон', 'Таблетки', '1 мг, 50 шт', 290, 110, false, 'Витамин B9 при планировании беременности.'],
  ['mother-baby', 'Калия йодид', 'Берлин-Хеми', 'Таблетки', '200 мкг, 100 шт', 1650, 45, false, 'Профилактика дефицита йода.'],

  ['devices', 'Тонометр автоматический', 'Omron', 'Прибор', 'на плечо', 24900, 8, false, 'Измеряет давление и пульс одним нажатием кнопки.'],
  ['devices', 'Термометр электронный', 'Microlife', 'Прибор', '1 шт', 2490, 40, false, 'Измеряет температуру за 60 секунд.'],
  ['devices', 'Глюкометр', 'Roche', 'Прибор', '1 шт', 12900, 10, false, 'Показывает уровень сахара в крови через 5 секунд.'],
];

// Покупатели для истории заказов на дашборде. Войти под ними нельзя:
// пароль — случайная строка, которую seed нигде не сохраняет и не выводит.
const customers = [
  ['a.saparova@example.kz', 'Айгерим Сапарова'],
  ['d.nurlanov@example.kz', 'Данияр Нурланов'],
  ['m.ivanova@example.kz', 'Мария Иванова'],
  ['a.zhaksybek@example.kz', 'Асель Жаксыбек'],
  ['t.kim@example.kz', 'Тимур Ким'],
  ['g.omarova@example.kz', 'Гульнара Омарова'],
];

const streets = ['ул. Абая', 'пр. Достык', 'ул. Толе би', 'ул. Сатпаева', 'пр. Аль-Фараби', 'ул. Жандосова', 'мкр. Самал-2', 'ул. Розыбакиева'];

// Детерминированный генератор: данные одинаковы при каждом запуске seed.
function rng(seed) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

async function main() {
  const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const adminPassword = process.env.ADMIN_PASSWORD;
  const adminName = process.env.ADMIN_NAME?.trim() || 'Администратор';
  if (!adminEmail || !adminPassword) {
    throw new Error('Задайте ADMIN_EMAIL и ADMIN_PASSWORD в .env — seed создаёт этого администратора.');
  }

  // Очистка в порядке зависимостей (внешние ключи).
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.product.deleteMany();
  await prisma.category.deleteMany();
  await prisma.user.deleteMany();

  const admin = await prisma.user.create({
    data: { email: adminEmail, name: adminName, role: 'ADMIN', passwordHash: await hash(adminPassword) },
  });
  const users = [];
  for (const [email, name] of customers) {
    const unusable = await hash(randomBytes(32).toString('hex'));
    users.push(await prisma.user.create({ data: { email, name, role: 'USER', passwordHash: unusable } }));
  }

  const categoryBySlug = {};
  for (const c of categories) {
    categoryBySlug[c.slug] = await prisma.category.create({ data: c });
  }

  const created = [];
  for (const [slug, name, manufacturer, form, dosage, price, stock, requiresPrescription, description] of products) {
    const img = images[name] ?? null;
    created.push(
      await prisma.product.create({
        data: {
          name, manufacturer, form, dosage, price, stock, requiresPrescription, description,
          imageUrl: img?.imageUrl ?? null,
          imageCredit: img?.imageCredit ?? null,
          categoryId: categoryBySlug[slug].id,
        },
      }),
    );
  }

  // История заказов за 90 дней: старые доставлены, свежие ещё в работе.
  const rand = rng(42);
  const popular = created.filter((p) => !p.requiresPrescription);
  const now = Date.now();
  let ordersCount = 0;
  for (let day = 89; day >= 0; day--) {
    const weekday = new Date(now - day * 86400000).getDay();
    const base = weekday === 0 || weekday === 6 ? 1 : 2;
    const n = Math.floor(rand() * 3) + base - (day > 60 ? 1 : 0);
    for (let k = 0; k < n; k++) {
      const user = users[Math.floor(rand() * users.length)];
      const itemsCount = 1 + Math.floor(rand() * 3);
      const picked = new Map();
      while (picked.size < itemsCount) {
        const pool = rand() < 0.85 ? popular : created;
        const p = pool[Math.floor(Math.pow(rand(), 1.6) * pool.length)];
        picked.set(p.id, { productId: p.id, quantity: 1 + Math.floor(rand() * 2), price: p.price });
      }
      const items = [...picked.values()];
      const createdAt = new Date(now - day * 86400000 - Math.floor(rand() * 10) * 3600000);
      let status = 'DELIVERED';
      if (day <= 1) status = rand() < 0.6 ? 'PENDING' : 'CONFIRMED';
      else if (day <= 4) status = rand() < 0.6 ? 'SHIPPED' : 'DELIVERED';
      if (day > 1 && rand() < 0.07) status = 'CANCELLED';

      await prisma.order.create({
        data: {
          userId: user.id,
          email: user.email,
          status,
          address: `г. Алматы, ${streets[Math.floor(rand() * streets.length)]}, ${10 + Math.floor(rand() * 180)}`,
          phone: `+7 70${Math.floor(rand() * 8)} ${String(100 + Math.floor(rand() * 900))} ${String(10 + Math.floor(rand() * 90))} ${String(10 + Math.floor(rand() * 90))}`,
          total: items.reduce((s, i) => s + i.price * i.quantity, 0),
          createdAt,
          items: { create: items },
        },
      });
      ordersCount++;
    }
  }

  const withPhoto = created.filter((p) => p.imageUrl).length;
  console.log('Seed выполнен:');
  console.log(`  администратор: ${admin.email} (пароль из ADMIN_PASSWORD в .env)`);
  console.log(`  покупателей для истории заказов: ${customers.length} (входа под ними нет)`);
  console.log(`  категорий: ${categories.length}, товаров: ${products.length} (с фото: ${withPhoto}), заказов: ${ordersCount}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
