// Политика конфиденциальности на трёх языках. Описывает то, что сайт делает на самом деле:
// какие поля хранит база, что лежит в localStorage, какие внешние сервисы видят посетителя.
// Реквизиты Оператора — шаблоны, их заполняет владелец аптеки.
import { SUPPORT_EMAIL } from './info.js';

const OFFER_LINK = '#/info/offer';

export const PRIVACY = {
  ru: {
    title: 'Политика конфиденциальности',
    subtitle: 'Политика в отношении обработки персональных данных. Республика Казахстан, редакция от 16 ноября 2026 г.',
    toc: 'Содержание',
    sections: [
      {
        id: 'general',
        title: 'Общие положения',
        blocks: [
          '1.1. Настоящая Политика определяет порядок обработки и меры по защите персональных данных пользователей интернет-аптеки «Мята» (далее — Сайт) в соответствии с Законом Республики Казахстан от 21 мая 2013 года № 94-V «О персональных данных и их защите».',
          '1.2. Оператором персональных данных является лицо, указанное в разделе 11 (далее — Оператор).',
          '1.3. Политика применяется ко всей информации, которую Оператор получает о пользователях при использовании Сайта.',
        ],
      },
      {
        id: 'data',
        title: 'Какие данные мы обрабатываем',
        blocks: [
          'Мы обрабатываем только данные, необходимые для работы аптеки:',
          {
            terms: [
              ['Имя и адрес электронной почты', 'указываются при регистрации.'],
              ['Пароль', 'хранится только в виде необратимого криптографического хеша (Argon2id). Сам пароль Оператору недоступен и никогда не передаётся в ответах Сайта.'],
              ['Адрес доставки, телефон и комментарий', 'указываются при оформлении заказа и нужны, чтобы доставить его.'],
              ['История заказов', 'купленные Товары, их количество, цены на момент покупки, даты и статусы заказов.'],
              ['Технические данные', 'IP-адрес используется для ограничения частоты попыток входа и регистрации и не сохраняется в базе данных.'],
            ],
          },
          'Мы не собираем платёжные реквизиты (оплата производится курьеру при получении), паспортные данные, копии рецептов и медицинские документы.',
          '2.2. Состав заказа может косвенно указывать на состояние здоровья пользователя. Поэтому доступ к истории заказов есть только у самого пользователя и администраторов аптеки, и она не используется ни для каких целей, кроме исполнения заказа.',
        ],
      },
      {
        id: 'purposes',
        title: 'Цели обработки',
        blocks: [
          {
            list: [
              'регистрация и идентификация пользователя, предоставление доступа к Личному кабинету;',
              'заключение и исполнение договора купли-продажи по публичной оферте: оформление, подтверждение и доставка заказов;',
              'связь с пользователем по вопросам заказа и ответы на обращения;',
              'обеспечение безопасности Сайта и защита от несанкционированного доступа.',
            ],
          },
          { html: `Условия продажи описаны в <a href="${OFFER_LINK}">Публичной оферте</a>.` },
        ],
      },
      {
        id: 'grounds',
        title: 'Правовые основания',
        blocks: [
          'Обработка осуществляется на основании согласия пользователя, которое он даёт при регистрации, а также для исполнения договора, стороной которого является пользователь, в соответствии с Законом Республики Казахстан «О персональных данных и их защите».',
        ],
      },
      {
        id: 'processing',
        title: 'Порядок и сроки обработки',
        blocks: [
          '5.1. Оператор осуществляет сбор, запись, систематизацию, накопление, хранение, уточнение, использование, блокирование, удаление и уничтожение персональных данных с использованием средств автоматизации.',
          '5.2. Персональные данные хранятся в базе данных Оператора.',
          '5.3. Данные хранятся, пока существует учётная запись пользователя. Сведения о заказах хранятся в течение сроков, установленных законодательством о бухгалтерском учёте и налогообложении.',
          '5.4. При удалении учётной записи вместе с ней удаляются и все заказы пользователя. При отзыве согласия или достижении целей обработки данные удаляются в течение 30 дней, если иное не предусмотрено законом.',
        ],
      },
      {
        id: 'third-parties',
        title: 'Передача третьим лицам',
        blocks: [
          '6.1. Оператор не продаёт и не передаёт персональные данные третьим лицам, за исключением курьера, доставляющего заказ (имя, адрес, телефон и состав заказа), и случаев, предусмотренных законодательством Республики Казахстан.',
          '6.2. Для работы Сайта используются сторонние сервисы:',
          {
            terms: [
              ['Render', 'хостинг сервера Сайта; через него проходят все запросы к Сайту.'],
              ['Neon', 'хостинг базы данных PostgreSQL, в которой хранятся учётные записи и заказы.'],
              ['Google Fonts', 'загрузка шрифтов; сервису становится известен IP-адрес браузера пользователя.'],
              ['Wikimedia Commons', 'загрузка части фотографий Товаров; сервису становится известен IP-адрес браузера пользователя.'],
            ],
          },
        ],
      },
      {
        id: 'browser',
        title: 'Данные в браузере',
        blocks: [
          'Сайт не использует cookie, в том числе для отслеживания и рекламы. В локальном хранилище браузера (localStorage) сохраняются:',
          {
            list: [
              'токен авторизации после входа: действует 1 сутки, удаляется при выходе из аккаунта и не содержит пароля;',
              'имя и роль пользователя для отображения в шапке Сайта;',
              'содержимое корзины;',
              'выбранный язык интерфейса.',
            ],
          },
          'В хранилище сеанса (sessionStorage) на время открытой вкладки сохраняются служебные отметки: открытый раздел панели администратора и страница, на которую нужно вернуться после входа.',
          'Эти данные хранятся только на устройстве пользователя. Их можно удалить, очистив данные Сайта в настройках браузера.',
        ],
      },
      {
        id: 'security',
        title: 'Защита данных',
        blocks: [
          'Оператор принимает правовые, организационные и технические меры защиты персональных данных:',
          {
            list: [
              'хранение паролей только в виде хеша Argon2id;',
              'разграничение доступа по ролям: данные покупателей и их заказы доступны только администраторам аптеки, роль проверяется при каждом запросе;',
              'ограничение числа попыток входа и регистрации: не более 20 за 15 минут;',
              'передача данных по защищённому протоколу HTTPS;',
              'заголовки безопасности браузера, запрещающие загрузку сторонних скриптов на страницы Сайта.',
            ],
          },
        ],
      },
      {
        id: 'rights',
        title: 'Права пользователя',
        blocks: [
          'Пользователь вправе:',
          {
            list: [
              'получать сведения об обработке своих персональных данных;',
              'требовать уточнения, блокирования или уничтожения данных, если они неполные, устаревшие или обрабатываются незаконно;',
              'требовать удаления учётной записи вместе с историей заказов;',
              'отозвать согласие на обработку персональных данных;',
              'обжаловать действия Оператора в уполномоченном органе в сфере защиты персональных данных или в суде.',
            ],
          },
          'Запросы направляются на адрес электронной почты Оператора, указанный в разделе 11. Оператор рассматривает запрос и отвечает на него в сроки, установленные законодательством Республики Казахстан.',
        ],
      },
      {
        id: 'changes',
        title: 'Изменение Политики',
        blocks: [
          'Оператор вправе вносить изменения в Политику. Новая редакция вступает в силу с момента её публикации на Сайте. Актуальная редакция всегда доступна на этой странице.',
        ],
      },
      {
        id: 'contacts',
        title: 'Контакты Оператора',
        requisites: [
          ['Оператор', 'ФИО ИП или наименование организации', true],
          ['ИИН / БИН', 'ИИН или БИН', true],
          ['Адрес', 'юридический адрес', true],
          ['Электронная почта', SUPPORT_EMAIL, false],
        ],
      },
    ],
  },

  kk: {
    title: 'Құпиялылық саясаты',
    subtitle: 'Дербес деректерді өңдеуге қатысты саясат. Қазақстан Республикасы, 2026 жылғы 16 қарашадағы редакция.',
    toc: 'Мазмұны',
    sections: [
      {
        id: 'general',
        title: 'Жалпы ережелер',
        blocks: [
          '1.1. Осы Саясат «Дербес деректер және оларды қорғау туралы» Қазақстан Республикасының 2013 жылғы 21 мамырдағы № 94-V Заңына сәйкес «Мята» интернет-дәріханасы (бұдан әрі — Сайт) пайдаланушыларының дербес деректерін өңдеу тәртібін және оларды қорғау шараларын айқындайды.',
          '1.2. Дербес деректердің операторы — 11-бөлімде көрсетілген тұлға (бұдан әрі — Оператор).',
          '1.3. Саясат Оператор Сайтты пайдалану кезінде пайдаланушылар туралы алатын барлық ақпаратқа қолданылады.',
        ],
      },
      {
        id: 'data',
        title: 'Қандай деректерді өңдейміз',
        blocks: [
          'Біз тек дәріхананың жұмысына қажетті деректерді өңдейміз:',
          {
            terms: [
              ['Аты және электрондық пошта мекенжайы', 'тіркелу кезінде көрсетіледі.'],
              ['Құпиясөз', 'тек қайтымсыз криптографиялық хеш (Argon2id) түрінде сақталады. Құпиясөздің өзі Операторға қолжетімсіз және Сайттың жауаптарында ешқашан берілмейді.'],
              ['Жеткізу мекенжайы, телефон және түсініктеме', 'тапсырысты рәсімдеу кезінде көрсетіледі және оны жеткізу үшін қажет.'],
              ['Тапсырыстар тарихы', 'сатып алынған Тауарлар, олардың саны, сатып алу сәтіндегі бағалары, тапсырыстардың күндері мен күйлері.'],
              ['Техникалық деректер', 'IP-мекенжай кіру және тіркелу әрекеттерінің жиілігін шектеу үшін пайдаланылады және дерекқорда сақталмайды.'],
            ],
          },
          'Біз төлем деректемелерін (төлем алу кезінде курьерге жасалады), паспорт деректерін, рецепт көшірмелерін және медициналық құжаттарды жинамаймыз.',
          '2.2. Тапсырыс құрамы пайдаланушының денсаулық жағдайын жанама түрде көрсетуі мүмкін. Сондықтан тапсырыстар тарихына тек пайдаланушының өзі мен дәріхана әкімшілері қол жеткізе алады және ол тапсырысты орындаудан басқа ешқандай мақсатта пайдаланылмайды.',
        ],
      },
      {
        id: 'purposes',
        title: 'Өңдеу мақсаттары',
        blocks: [
          {
            list: [
              'пайдаланушыны тіркеу және сәйкестендіру, Жеке кабинетке қолжетімділік беру;',
              'жария оферта бойынша сату-сатып алу шартын жасасу және орындау: тапсырыстарды рәсімдеу, растау және жеткізу;',
              'тапсырыс мәселелері бойынша пайдаланушымен байланысу және өтініштерге жауап беру;',
              'Сайттың қауіпсіздігін қамтамасыз ету және рұқсатсыз қол жеткізуден қорғау.',
            ],
          },
          { html: `Сату шарттары <a href="${OFFER_LINK}">Жария офертада</a> сипатталған.` },
        ],
      },
      {
        id: 'grounds',
        title: 'Құқықтық негіздер',
        blocks: [
          'Өңдеу «Дербес деректер және оларды қорғау туралы» Қазақстан Республикасының Заңына сәйкес пайдаланушының тіркелу кезінде беретін келісімі негізінде, сондай-ақ пайдаланушы тарапы болып табылатын шартты орындау үшін жүзеге асырылады.',
        ],
      },
      {
        id: 'processing',
        title: 'Өңдеу тәртібі мен мерзімдері',
        blocks: [
          '5.1. Оператор дербес деректерді автоматтандыру құралдарын пайдалана отырып жинауды, жазуды, жүйелеуді, жинақтауды, сақтауды, нақтылауды, пайдалануды, бұғаттауды, өшіруді және жоюды жүзеге асырады.',
          '5.2. Дербес деректер Оператордың дерекқорында сақталады.',
          '5.3. Деректер пайдаланушының есептік жазбасы бар болғанша сақталады. Тапсырыстар туралы мәліметтер бухгалтерлік есеп және салық салу туралы заңнамада белгіленген мерзімдер ішінде сақталады.',
          '5.4. Есептік жазба жойылған кезде онымен бірге пайдаланушының барлық тапсырысы да жойылады. Келісім кері қайтарылған немесе өңдеу мақсаттарына қол жеткізілген кезде, егер заңда өзгеше көзделмесе, деректер 30 күн ішінде жойылады.',
        ],
      },
      {
        id: 'third-parties',
        title: 'Үшінші тұлғаларға беру',
        blocks: [
          '6.1. Оператор дербес деректерді сатпайды және үшінші тұлғаларға бермейді, тапсырысты жеткізетін курьерді (аты, мекенжайы, телефоны және тапсырыс құрамы) және Қазақстан Республикасының заңнамасында көзделген жағдайларды қоспағанда.',
          '6.2. Сайттың жұмысы үшін үшінші тарап сервистері пайдаланылады:',
          {
            terms: [
              ['Render', 'Сайт серверінің хостингі; Сайтқа барлық сұраулар ол арқылы өтеді.'],
              ['Neon', 'есептік жазбалар мен тапсырыстар сақталатын PostgreSQL дерекқорының хостингі.'],
              ['Google Fonts', 'қаріптерді жүктеу; сервиске пайдаланушы браузерінің IP-мекенжайы белгілі болады.'],
              ['Wikimedia Commons', 'Тауарлар фотосуреттерінің бір бөлігін жүктеу; сервиске пайдаланушы браузерінің IP-мекенжайы белгілі болады.'],
            ],
          },
        ],
      },
      {
        id: 'browser',
        title: 'Браузердегі деректер',
        blocks: [
          'Сайт cookie файлдарын, соның ішінде бақылау мен жарнама үшін пайдаланбайды. Браузердің жергілікті қоймасында (localStorage) мыналар сақталады:',
          {
            list: [
              'кіргеннен кейінгі авторизация токені: 1 тәулік әрекет етеді, аккаунттан шыққанда жойылады және құпиясөзді қамтымайды;',
              'Сайттың тақырыпшасында көрсету үшін пайдаланушының аты мен рөлі;',
              'себеттің мазмұны;',
              'интерфейстің таңдалған тілі.',
            ],
          },
          'Сеанс қоймасында (sessionStorage) қойынды ашық тұрған уақытта қызметтік белгілер сақталады: әкімші панелінің ашық бөлімі және кіргеннен кейін оралу керек бет.',
          'Бұл деректер тек пайдаланушының құрылғысында сақталады. Оларды браузер баптауларында Сайт деректерін тазалау арқылы жоюға болады.',
        ],
      },
      {
        id: 'security',
        title: 'Деректерді қорғау',
        blocks: [
          'Оператор дербес деректерді қорғаудың құқықтық, ұйымдастырушылық және техникалық шараларын қабылдайды:',
          {
            list: [
              'құпиясөздерді тек Argon2id хеші түрінде сақтау;',
              'рөлдер бойынша қолжетімділікті бөлу: сатып алушылардың деректері мен тапсырыстары тек дәріхана әкімшілеріне қолжетімді, рөл әр сұрау кезінде тексеріледі;',
              'кіру және тіркелу әрекеттерінің санын шектеу: 15 минутта 20-дан аспайды;',
              'деректерді қорғалған HTTPS хаттамасы арқылы беру;',
              'Сайт беттеріне бөгде скрипттерді жүктеуге тыйым салатын браузер қауіпсіздігі тақырыптары.',
            ],
          },
        ],
      },
      {
        id: 'rights',
        title: 'Пайдаланушының құқықтары',
        blocks: [
          'Пайдаланушы:',
          {
            list: [
              'өз дербес деректерін өңдеу туралы мәліметтер алуға;',
              'деректер толық емес, ескірген немесе заңсыз өңделген жағдайда оларды нақтылауды, бұғаттауды немесе жоюды талап етуге;',
              'есептік жазбаны тапсырыстар тарихымен бірге жоюды талап етуге;',
              'дербес деректерді өңдеуге келісімді кері қайтарып алуға;',
              'Оператордың әрекеттеріне дербес деректерді қорғау саласындағы уәкілетті органға немесе сотқа шағымдануға құқылы.',
            ],
          },
          'Сұраулар Оператордың 11-бөлімде көрсетілген электрондық пошта мекенжайына жіберіледі. Оператор сұрауды қарап, оған Қазақстан Республикасының заңнамасында белгіленген мерзімдерде жауап береді.',
        ],
      },
      {
        id: 'changes',
        title: 'Саясатты өзгерту',
        blocks: [
          'Оператор Саясатқа өзгерістер енгізуге құқылы. Жаңа редакция Сайтта жарияланған сәттен бастап күшіне енеді. Өзекті редакция әрқашан осы бетте қолжетімді.',
        ],
      },
      {
        id: 'contacts',
        title: 'Оператордың байланыс деректері',
        requisites: [
          ['Оператор', 'ЖК-ның аты-жөні немесе ұйымның атауы', true],
          ['ЖСН / БСН', 'ЖСН немесе БСН', true],
          ['Мекенжай', 'заңды мекенжай', true],
          ['Электрондық пошта', SUPPORT_EMAIL, false],
        ],
      },
    ],
  },

  en: {
    title: 'Privacy policy',
    subtitle: 'Policy on the processing of personal data. Republic of Kazakhstan, version of 16 November 2026.',
    toc: 'Contents',
    sections: [
      {
        id: 'general',
        title: 'General provisions',
        blocks: [
          '1.1. This Policy sets out how personal data of users of the Myata online pharmacy (the Site) is processed and protected, in accordance with Law of the Republic of Kazakhstan No. 94-V of 21 May 2013 "On Personal Data and Their Protection".',
          '1.2. The personal data operator is the person named in section 11 (the Operator).',
          '1.3. The Policy applies to all information the Operator receives about users while they use the Site.',
        ],
      },
      {
        id: 'data',
        title: 'What data we process',
        blocks: [
          'We process only the data needed to run the pharmacy:',
          {
            terms: [
              ['Name and email address', 'provided at registration.'],
              ['Password', 'stored only as an irreversible cryptographic hash (Argon2id). The Operator cannot see the password itself, and the Site never returns it.'],
              ['Delivery address, phone and comment', 'provided when placing an order and needed to deliver it.'],
              ['Order history', 'the Products bought, their quantities, prices at the time of purchase, order dates and statuses.'],
              ['Technical data', 'the IP address is used to limit the rate of sign-in and registration attempts and is not stored in the database.'],
            ],
          },
          'We do not collect payment details (payment is made to the courier on delivery), passport data, copies of prescriptions or medical records.',
          '2.2. The contents of an order may indirectly reveal a user’s health. For this reason only the user and the pharmacy administrators can see the order history, and it is not used for any purpose other than fulfilling the order.',
        ],
      },
      {
        id: 'purposes',
        title: 'Purposes of processing',
        blocks: [
          {
            list: [
              'registering and identifying the user and giving access to the Account;',
              'concluding and performing the sale agreement under the public offer: placing, confirming and delivering orders;',
              'contacting the user about orders and answering requests;',
              'keeping the Site secure and protecting it from unauthorised access.',
            ],
          },
          { html: `The terms of sale are set out in the <a href="${OFFER_LINK}">Public offer</a>.` },
        ],
      },
      {
        id: 'grounds',
        title: 'Legal grounds',
        blocks: [
          'Processing is based on the consent the user gives at registration and on the need to perform an agreement to which the user is a party, in accordance with the Law of the Republic of Kazakhstan "On Personal Data and Their Protection".',
        ],
      },
      {
        id: 'processing',
        title: 'How and how long we process data',
        blocks: [
          '5.1. The Operator collects, records, organises, accumulates, stores, updates, uses, blocks, deletes and destroys personal data using automated means.',
          '5.2. Personal data is stored in the Operator’s database.',
          '5.3. Data is kept for as long as the user account exists. Order records are kept for the periods required by accounting and tax legislation.',
          '5.4. When an account is deleted, all of the user’s orders are deleted with it. When consent is withdrawn or the purposes of processing are achieved, the data is deleted within 30 days unless the law requires otherwise.',
        ],
      },
      {
        id: 'third-parties',
        title: 'Sharing with third parties',
        blocks: [
          '6.1. The Operator does not sell or share personal data with third parties, except the courier delivering the order (name, address, phone and order contents) and in cases provided for by the legislation of the Republic of Kazakhstan.',
          '6.2. The Site relies on the following third-party services:',
          {
            terms: [
              ['Render', 'hosts the Site’s server; all requests to the Site pass through it.'],
              ['Neon', 'hosts the PostgreSQL database where accounts and orders are stored.'],
              ['Google Fonts', 'serves fonts; the service learns the IP address of the user’s browser.'],
              ['Wikimedia Commons', 'serves some of the Product photos; the service learns the IP address of the user’s browser.'],
            ],
          },
        ],
      },
      {
        id: 'browser',
        title: 'Data in your browser',
        blocks: [
          'The Site does not use cookies, including for tracking or advertising. The browser’s local storage (localStorage) keeps:',
          {
            list: [
              'the sign-in token after you sign in: valid for 1 day, removed when you sign out, and it does not contain your password;',
              'your name and role, shown in the Site header;',
              'the contents of your cart;',
              'the interface language you chose.',
            ],
          },
          'Session storage (sessionStorage) keeps two service values while the tab is open: the open section of the admin panel and the page to return to after signing in.',
          'This data stays on your device only. You can delete it by clearing the Site’s data in your browser settings.',
        ],
      },
      {
        id: 'security',
        title: 'Data protection',
        blocks: [
          'The Operator takes legal, organisational and technical measures to protect personal data:',
          {
            list: [
              'passwords are stored only as Argon2id hashes;',
              'role-based access: customer data and orders are available only to pharmacy administrators, and the role is checked on every request;',
              'a limit on sign-in and registration attempts: at most 20 per 15 minutes;',
              'data is transferred over HTTPS;',
              'browser security headers that block third-party scripts on the Site’s pages.',
            ],
          },
        ],
      },
      {
        id: 'rights',
        title: 'Your rights',
        blocks: [
          'You have the right to:',
          {
            list: [
              'receive information about how your personal data is processed;',
              'request correction, blocking or destruction of data that is incomplete, outdated or processed unlawfully;',
              'request deletion of your account together with your order history;',
              'withdraw your consent to the processing of personal data;',
              'appeal against the Operator’s actions to the authorised personal data protection body or to court.',
            ],
          },
          'Send requests to the Operator’s email address given in section 11. The Operator reviews each request and responds within the periods set by the legislation of the Republic of Kazakhstan.',
        ],
      },
      {
        id: 'changes',
        title: 'Changes to this Policy',
        blocks: [
          'The Operator may change this Policy. A new version takes effect when it is published on the Site. The current version is always available on this page.',
        ],
      },
      {
        id: 'contacts',
        title: 'Operator contacts',
        requisites: [
          ['Operator', 'full name of the individual entrepreneur or company name', true],
          ['IIN / BIN', 'IIN or BIN', true],
          ['Address', 'legal address', true],
          ['Email', SUPPORT_EMAIL, false],
        ],
      },
    ],
  },
};
