// Информационные страницы из футера на трёх языках.
// Тексты описывают то, что сайт действительно делает, без выдуманных лицензий и цифр.

// Адрес поддержки в футере и на странице «Контакты». Замените на свой.
export const SUPPORT_EMAIL = 'support@myata.kz';

export const INFO_LINKS = {
  info: ['about', 'contacts'],
  buyer: ['how-to-order', 'delivery', 'payment', 'faq'],
  docs: ['privacy', 'returns', 'offer'],
};

export const PAGES = {
  about: {
    ru: { title: 'О компании', body: [
      'Мята — интернет-аптека в Алматы. На сайте можно найти препарат по названию или производителю, сразу увидеть, есть ли он в наличии, и заказать доставку.',
      'Каталог разделён на категории: от обезболивающих и витаминов до средств для глаз, детского здоровья и медтехники. Рецептурные препараты отмечены отдельно.',
      'Статус каждого заказа виден в личном кабинете, а пока заказ не подтверждён, его можно отменить в один клик.',
    ] },
    kk: { title: 'Компания туралы', body: [
      'Мята — Алматыдағы интернет-дәріхана. Сайтта препаратты атауы немесе өндірушісі бойынша тауып, оның қолда бар-жоғын бірден көріп, жеткізуге тапсырыс беруге болады.',
      'Каталог санаттарға бөлінген: ауырсынуды басатын дәрілер мен дәрумендерден бастап көзге арналған құралдарға, балалар денсаулығына және медициналық техникаға дейін. Рецептілік препараттар бөлек белгіленген.',
      'Әр тапсырыстың күйі жеке кабинетте көрінеді, ал тапсырыс расталғанға дейін одан бір рет басу арқылы бас тартуға болады.',
    ] },
    en: { title: 'About us', body: [
      'Myata is an online pharmacy in Almaty. Find a medicine by name or manufacturer, see right away whether it is in stock, and order delivery.',
      'The catalog is split into categories, from pain relief and vitamins to eye care, children’s health and medical devices. Prescription drugs are clearly marked.',
      'You can follow every order in your account and cancel it with one click until it is confirmed.',
    ] },
  },
  contacts: {
    ru: { title: 'Контакты', body: [
      'Город: Алматы.',
      `Email: ${SUPPORT_EMAIL}. Пишите по вопросам заказов, наличия и доставки.`,
      'Режим работы: ежедневно с 9:00 до 21:00.',
    ] },
    kk: { title: 'Байланыс', body: [
      'Қала: Алматы.',
      `Email: ${SUPPORT_EMAIL}. Тапсырыс, қолда бар тауар және жеткізу туралы сұрақтар бойынша жазыңыз.`,
      'Жұмыс уақыты: күн сайын 9:00-ден 21:00-ге дейін.',
    ] },
    en: { title: 'Contacts', body: [
      'City: Almaty.',
      `Email: ${SUPPORT_EMAIL}. Write to us about orders, availability and delivery.`,
      'Hours: daily from 9:00 to 21:00.',
    ] },
  },
  'how-to-order': {
    ru: { title: 'Как сделать заказ', body: [
      'Найдите препарат в каталоге через поиск или категории и нажмите «+», чтобы добавить его в корзину.',
      'Откройте корзину, проверьте количество и войдите в аккаунт. Без аккаунта заказ оформить нельзя, но корзина сохранится.',
      'Укажите адрес и телефон и нажмите «Оформить заказ». Статус заказа видно в разделе «Мои заказы», пока заказ не подтверждён, его можно отменить.',
    ] },
    kk: { title: 'Тапсырысты қалай беруге болады', body: [
      'Препаратты каталогтан іздеу немесе санаттар арқылы тауып, себетке қосу үшін «+» батырмасын басыңыз.',
      'Себетті ашып, санын тексеріңіз де, аккаунтқа кіріңіз. Аккаунтсыз тапсырыс беру мүмкін емес, бірақ себет сақталады.',
      'Мекенжай мен телефонды көрсетіп, «Тапсырыс беру» батырмасын басыңыз. Тапсырыс күйі «Тапсырыстарым» бөлімінде көрінеді, расталғанға дейін одан бас тартуға болады.',
    ] },
    en: { title: 'How to order', body: [
      'Find a medicine with search or categories and press "+" to add it to your cart.',
      'Open the cart, check the quantities and sign in. You need an account to order, and your cart stays saved.',
      'Enter the address and phone and press "Place order". You can follow the status in "My orders" and cancel the order until it is confirmed.',
    ] },
  },
  delivery: {
    ru: { title: 'Доставка', body: [
      'Доставляем по Алматы. Доставка входит в стоимость заказа, отдельно её оплачивать не нужно.',
      'Рецептурные препараты курьер отдаёт только при предъявлении рецепта врача.',
      'Статусы заказа: ожидает подтверждения, подтверждён, в доставке, доставлен.',
    ] },
    kk: { title: 'Жеткізу', body: [
      'Алматы бойынша жеткіземіз. Жеткізу тапсырыс құнына кіреді, оны бөлек төлеудің қажеті жоқ.',
      'Рецептілік препараттарды курьер тек дәрігер рецептін көрсеткенде береді.',
      'Тапсырыс күйлері: растауды күтуде, расталды, жеткізілуде, жеткізілді.',
    ] },
    en: { title: 'Delivery', body: [
      'We deliver across Almaty. Delivery is included in the order price.',
      'The courier hands over prescription drugs only after seeing a doctor’s prescription.',
      'Order statuses: awaiting confirmation, confirmed, out for delivery, delivered.',
    ] },
  },
  payment: {
    ru: { title: 'Оплата', body: [
      'Заказ оплачивается при получении, курьеру.',
      'Сумма заказа фиксируется в момент оформления: если цена товара изменится позже, ваш заказ это не затронет.',
    ] },
    kk: { title: 'Төлем', body: [
      'Тапсырыс алу кезінде курьерге төленеді.',
      'Тапсырыс сомасы рәсімдеу сәтінде бекітіледі: тауар бағасы кейін өзгерсе, бұл тапсырысыңызға әсер етпейді.',
    ] },
    en: { title: 'Payment', body: [
      'You pay the courier on delivery.',
      'The order total is fixed when you place it, so later price changes do not affect your order.',
    ] },
  },
  faq: {
    ru: { title: 'Вопросы и ответы', body: [
      'Можно ли заказать рецептурный препарат? Да, но курьер отдаст его только по рецепту врача.',
      'Почему нельзя добавить больше товара? В корзину помещается не больше, чем есть на складе, и не больше 50 штук одной позиции.',
      'Как отменить заказ? В разделе «Мои заказы» есть кнопка отмены, пока заказ ждёт подтверждения. Товары вернутся на склад.',
    ] },
    kk: { title: 'Сұрақтар мен жауаптар', body: [
      'Рецептілік препаратқа тапсырыс беруге бола ма? Иә, бірақ курьер оны тек дәрігер рецептімен береді.',
      'Неге көбірек тауар қосуға болмайды? Себетке қоймада бар мөлшерден және бір позицияның 50 данасынан артық сыймайды.',
      'Тапсырыстан қалай бас тартамын? «Тапсырыстарым» бөлімінде тапсырыс расталғанға дейін бас тарту батырмасы бар. Тауарлар қоймаға қайтарылады.',
    ] },
    en: { title: 'Questions and answers', body: [
      'Can I order a prescription drug? Yes, but the courier hands it over only with a doctor’s prescription.',
      'Why can’t I add more of an item? The cart holds no more than the stock on hand and at most 50 of one item.',
      'How do I cancel an order? "My orders" has a cancel button while the order awaits confirmation. The items go back to stock.',
    ] },
  },
  privacy: {
    ru: { title: 'Политика конфиденциальности', body: [
      'Мы храним имя, email, адрес и телефон, которые вы указали, только чтобы оформить и доставить заказ.',
      'Пароль хранится в виде хеша Argon2id, его не видит никто, включая администратора. Хеш пароля никогда не отправляется в ответах API.',
      'Удалить аккаунт и все заказы может администратор по вашей просьбе.',
    ] },
    kk: { title: 'Құпиялылық саясаты', body: [
      'Сіз көрсеткен атыңызды, email, мекенжай мен телефонды тек тапсырысты рәсімдеу және жеткізу үшін сақтаймыз.',
      'Құпиясөз Argon2id хеші түрінде сақталады, оны ешкім, соның ішінде әкімші де көрмейді. Құпиясөз хеші API жауаптарында ешқашан жіберілмейді.',
      'Сіздің өтінішіңіз бойынша әкімші аккаунтты және барлық тапсырысты жоя алады.',
    ] },
    en: { title: 'Privacy policy', body: [
      'We keep the name, email, address and phone you provide only to process and deliver your order.',
      'Your password is stored as an Argon2id hash that nobody can read, including administrators. The API never returns the password hash.',
      'An administrator can delete your account and all your orders on request.',
    ] },
  },
  returns: {
    ru: { title: 'Условия возврата и обмена', body: [
      'Лекарственные препараты надлежащего качества возврату и обмену не подлежат.',
      'Если препарат повреждён или не совпадает с заказом, откажитесь от него при получении, и заказ будет отменён.',
    ] },
    kk: { title: 'Қайтару және айырбастау шарттары', body: [
      'Тиісті сападағы дәрілік препараттар қайтарылмайды және айырбасталмайды.',
      'Препарат зақымдалса немесе тапсырысқа сәйкес келмесе, оны алу кезінде қабылдамаңыз, тапсырыс жойылады.',
    ] },
    en: { title: 'Returns and exchanges', body: [
      'Medicines of proper quality cannot be returned or exchanged.',
      'If a medicine is damaged or does not match your order, refuse it on delivery and the order will be cancelled.',
    ] },
  },
  offer: {
    ru: { title: 'Публичная оферта', body: [
      'Оформляя заказ, покупатель соглашается получить и оплатить выбранные товары по ценам на момент оформления.',
      'Заказ считается принятым после подтверждения. До подтверждения покупатель может отменить его в личном кабинете.',
    ] },
    kk: { title: 'Жария оферта', body: [
      'Тапсырыс бере отырып, сатып алушы таңдалған тауарларды рәсімдеу сәтіндегі бағамен алуға және төлеуге келіседі.',
      'Тапсырыс расталғаннан кейін қабылданды деп саналады. Расталғанға дейін сатып алушы одан жеке кабинетте бас тарта алады.',
    ] },
    en: { title: 'Public offer', body: [
      'By placing an order, the customer agrees to receive and pay for the selected items at the prices shown at checkout.',
      'An order is accepted once it is confirmed. Until then, the customer can cancel it in their account.',
    ] },
  },
};
