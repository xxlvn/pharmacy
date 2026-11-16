// Публичная оферта интернет-аптеки на трёх языках.
// Реквизиты Продавца — шаблоны: их заполняет владелец аптеки (номер лицензии, БИН, банк).
// Блоки текста: строка — абзац, { list: [...] } — маркированный список,
// { terms: [[термин, определение], ...] } — список терминов.
import { SUPPORT_EMAIL } from './info.js';

const PRIVACY = '#/info/privacy';

export const OFFER = {
  ru: {
    title: 'Публичная оферта',
    subtitle: 'Договор розничной купли-продажи товаров аптечного ассортимента с доставкой. Республика Казахстан, редакция от 16 ноября 2026 г.',
    toc: 'Содержание',
    sections: [
      {
        id: 'general',
        title: 'Общие положения',
        blocks: [
          '1.1. Настоящий документ является публичной офертой (предложением) Продавца, указанного в разделе 13, заключить договор розничной купли-продажи товаров аптечного ассортимента с любым дееспособным лицом (далее — Покупатель) на условиях, изложенных ниже, в соответствии с пунктом 5 статьи 395 Гражданского кодекса Республики Казахстан.',
          '1.2. Полным и безоговорочным принятием (акцептом) оферты является оформление Покупателем заказа на сайте интернет-аптеки «Мята» (далее — Сайт) (пункт 3 статьи 396 Гражданского кодекса Республики Казахстан). С момента акцепта договор считается заключённым.',
          { html: `1.3. Оформляя заказ, Покупатель подтверждает, что ознакомился с офертой и <a href="${PRIVACY}">Политикой конфиденциальности</a> и согласен с ними.` },
          '1.4. Продавец осуществляет фармацевтическую деятельность на основании лицензии, номер и дата выдачи которой указаны в разделе 13.',
        ],
      },
      {
        id: 'terms',
        title: 'Термины',
        blocks: [
          {
            terms: [
              ['Товар', 'лекарственные средства, медицинские изделия, биологически активные добавки, средства гигиены и ухода, представленные в каталоге Сайта.'],
              ['Рецептурный препарат', 'лекарственное средство, которое отпускается только по рецепту врача. На Сайте такие Товары отмечены пометкой «По рецепту».'],
              ['Личный кабинет', 'раздел Сайта, доступный Покупателю после регистрации, в котором отображаются заказы и их статусы.'],
              ['Заказ', 'запрос Покупателя на приобретение Товаров, оформленный через Сайт.'],
              ['Курьер', 'представитель Продавца или службы доставки, который передаёт Заказ Покупателю.'],
            ],
          },
        ],
      },
      {
        id: 'subject',
        title: 'Предмет договора',
        blocks: [
          '3.1. Продавец обязуется передать Покупателю Товары, указанные в Заказе, а Покупатель — принять и оплатить их на условиях настоящей оферты.',
          '3.2. Описание, форма выпуска, дозировка, производитель и наличие Товара указаны на его странице на Сайте. Фотографии носят иллюстративный характер: упаковка полученного Товара может отличаться от изображённой.',
          '3.3. Информация о Товаре на Сайте не является рекомендацией к применению. Перед применением лекарственного средства Покупатель знакомится с инструкцией и при необходимости консультируется с врачом.',
        ],
      },
      {
        id: 'order',
        title: 'Оформление заказа и цена',
        blocks: [
          '4.1. Для оформления заказа Покупатель регистрируется на Сайте, указывая достоверные имя и адрес электронной почты, а при оформлении заказа — адрес доставки в городе Алматы и номер телефона.',
          '4.2. Цены указаны в казахстанских тенге (₸, KZT). Цена Товара фиксируется в момент оформления заказа и не меняется для этого заказа, даже если впоследствии цена на Сайте изменится.',
          '4.3. Количество Товара в заказе ограничено его остатком на складе и не может превышать 50 единиц одной позиции. Если Товара недостаточно, оформить заказ на запрошенное количество невозможно.',
          '4.4. После оформления заказ получает статус «Ожидает подтверждения». Пока заказ не подтверждён Продавцом, Покупатель может отменить его в Личном кабинете.',
          '4.5. После подтверждения Продавец передаёт заказ в доставку. Статус заказа отображается в Личном кабинете.',
        ],
      },
      {
        id: 'payment',
        title: 'Оплата',
        blocks: [
          '5.1. Покупатель оплачивает Заказ при получении, Курьеру, в сумме, указанной в Заказе.',
          '5.2. Стоимость доставки включена в цену Заказа и отдельно не оплачивается.',
          '5.3. Если Покупатель отказывается от части Товаров при получении на основании разделов 6 и 7, он оплачивает только принятые Товары.',
        ],
      },
      {
        id: 'delivery',
        title: 'Доставка и передача Товара',
        blocks: [
          '6.1. Продавец доставляет Заказ по адресу в городе Алматы, указанному Покупателем при оформлении.',
          '6.2. Рецептурные препараты передаются только при предъявлении рецепта, выписанного врачом. Если рецепта нет, Курьер не передаёт такой Товар, и его стоимость не оплачивается.',
          '6.3. При получении Покупатель проверяет состав Заказа, целостность упаковки и срок годности Товаров.',
          '6.4. Обязательство Продавца по передаче Товара считается исполненным с момента вручения Заказа Покупателю.',
        ],
      },
      {
        id: 'refund',
        title: 'Отказ от заказа и возврат',
        blocks: [
          '7.1. Покупатель вправе отменить заказ в Личном кабинете до его подтверждения Продавцом, а после подтверждения — отказаться от Заказа при получении.',
          '7.2. Лекарственные средства и медицинские изделия надлежащего качества возврату и обмену не подлежат в соответствии с законодательством Республики Казахстан.',
          '7.3. Если Товар ненадлежащего качества (повреждена упаковка, истёк срок годности, Товар не соответствует Заказу), Покупатель вправе отказаться от него при получении либо потребовать замены Товара или возврата уплаченной суммы в соответствии с Законом Республики Казахстан «О защите прав потребителей».',
          '7.4. Требование о замене или возврате направляется на адрес электронной почты Продавца, указанный в разделе 13, с указанием номера заказа. Денежные средства возвращаются в течение 10 дней с момента получения требования.',
        ],
      },
      {
        id: 'duties',
        title: 'Права и обязанности сторон',
        blocks: [
          '8.1. Продавец обязуется:',
          {
            list: [
              'передать Товар надлежащего качества со сроком годности, достаточным для его применения;',
              'размещать на Сайте достоверное описание Товаров;',
              'отпускать рецептурные препараты только при предъявлении рецепта;',
              'обеспечивать конфиденциальность персональных данных Покупателя.',
            ],
          },
          '8.2. Покупатель обязуется:',
          {
            list: [
              'указывать достоверные данные при регистрации и оформлении заказа;',
              'принять и оплатить Заказ в порядке разделов 5 и 6;',
              'предъявить рецепт врача при получении рецептурных препаратов;',
              'применять лекарственные средства в соответствии с инструкцией и назначением врача.',
            ],
          },
        ],
      },
      {
        id: 'personal-data',
        title: 'Персональные данные',
        blocks: [
          { html: `Продавец обрабатывает персональные данные Покупателя в соответствии с Законом Республики Казахстан «О персональных данных и их защите» и <a href="${PRIVACY}">Политикой конфиденциальности</a>. Данные используются только для оформления, доставки и сопровождения заказа и не передаются третьим лицам, кроме службы доставки в объёме, необходимом для вручения Заказа.` },
        ],
      },
      {
        id: 'liability',
        title: 'Ответственность',
        blocks: [
          '10.1. Стороны несут ответственность за неисполнение обязательств в соответствии с законодательством Республики Казахстан.',
          '10.2. Продавец не несёт ответственности за последствия применения лекарственных средств без назначения врача или с нарушением инструкции, а также за невозможность доставки из-за неверно указанных адреса или телефона.',
          '10.3. Стороны освобождаются от ответственности при наступлении обстоятельств непреодолимой силы.',
        ],
      },
      {
        id: 'disputes',
        title: 'Разрешение споров',
        blocks: [
          'Споры разрешаются путём переговоров. Претензионный порядок обязателен: срок ответа на претензию — 10 дней с момента её получения. Если спор не урегулирован, он передаётся в суд по правилам подсудности, установленным законодательством Республики Казахстан.',
        ],
      },
      {
        id: 'validity',
        title: 'Срок действия и изменение оферты',
        blocks: [
          '12.1. Оферта вступает в силу с момента публикации на Сайте и действует до её отзыва.',
          '12.2. Продавец вправе изменять условия оферты. Новая редакция вступает в силу с момента публикации и не распространяется на заказы, оформленные до её публикации.',
        ],
      },
      {
        id: 'requisites',
        title: 'Реквизиты Продавца',
        requisites: [
          ['Продавец', 'ФИО ИП или наименование организации', true],
          ['ИИН / БИН', 'ИИН индивидуального предпринимателя или БИН организации', true],
          ['Лицензия', 'номер и дата выдачи лицензии на фармацевтическую деятельность', true],
          ['Банковские реквизиты', 'банк, ИИК, БИК', true],
          ['Адрес', 'юридический адрес', true],
          ['Электронная почта', SUPPORT_EMAIL, false],
        ],
      },
    ],
  },

  kk: {
    title: 'Жария оферта',
    subtitle: 'Дәріхана ассортиментіндегі тауарларды жеткізумен бөлшек сату-сатып алу шарты. Қазақстан Республикасы, 2026 жылғы 16 қарашадағы редакция.',
    toc: 'Мазмұны',
    sections: [
      {
        id: 'general',
        title: 'Жалпы ережелер',
        blocks: [
          '1.1. Осы құжат 13-бөлімде көрсетілген Сатушының Қазақстан Республикасы Азаматтық кодексінің 395-бабының 5-тармағына сәйкес кез келген әрекетке қабілетті тұлғамен (бұдан әрі — Сатып алушы) төменде баяндалған шарттар бойынша дәріхана ассортиментіндегі тауарларды бөлшек сату-сатып алу шартын жасасу туралы жария офертасы (ұсынысы) болып табылады.',
          '1.2. Офертаны толық әрі сөзсіз қабылдау (акцепт) — Сатып алушының «Мята» интернет-дәріханасының сайтында (бұдан әрі — Сайт) тапсырыс рәсімдеуі (Қазақстан Республикасы Азаматтық кодексінің 396-бабының 3-тармағы). Акцепт сәтінен бастап шарт жасалды деп саналады.',
          { html: `1.3. Тапсырысты рәсімдей отырып, Сатып алушы офертамен және <a href="${PRIVACY}">Құпиялылық саясатымен</a> танысқанын және олармен келісетінін растайды.` },
          '1.4. Сатушы фармацевтикалық қызметті нөмірі мен берілген күні 13-бөлімде көрсетілген лицензия негізінде жүзеге асырады.',
        ],
      },
      {
        id: 'terms',
        title: 'Терминдер',
        blocks: [
          {
            terms: [
              ['Тауар', 'Сайт каталогында ұсынылған дәрілік заттар, медициналық бұйымдар, биологиялық белсенді қоспалар, гигиена және күтім құралдары.'],
              ['Рецептілік препарат', 'тек дәрігердің рецептімен берілетін дәрілік зат. Сайтта мұндай Тауарлар «Рецептпен» белгісімен белгіленген.'],
              ['Жеке кабинет', 'Сатып алушыға тіркелгеннен кейін қолжетімді, тапсырыстар мен олардың күйлері көрсетілетін Сайт бөлімі.'],
              ['Тапсырыс', 'Сатып алушының Сайт арқылы рәсімделген Тауарларды сатып алу туралы сұрауы.'],
              ['Курьер', 'Тапсырысты Сатып алушыға тапсыратын Сатушының немесе жеткізу қызметінің өкілі.'],
            ],
          },
        ],
      },
      {
        id: 'subject',
        title: 'Шарттың мәні',
        blocks: [
          '3.1. Сатушы Тапсырыста көрсетілген Тауарларды Сатып алушыға беруге, ал Сатып алушы оларды осы оферта шарттарымен қабылдап, төлеуге міндеттенеді.',
          '3.2. Тауардың сипаттамасы, шығарылу түрі, мөлшері, өндірушісі және қолда бары Сайттағы оның бетінде көрсетілген. Фотосуреттер иллюстрациялық сипатта: алынған Тауардың қаптамасы суреттегіден өзгеше болуы мүмкін.',
          '3.3. Сайттағы Тауар туралы ақпарат қолдану жөніндегі ұсыным болып табылмайды. Дәрілік затты қолданар алдында Сатып алушы нұсқаулықпен танысады және қажет болса дәрігермен кеңеседі.',
        ],
      },
      {
        id: 'order',
        title: 'Тапсырысты рәсімдеу және баға',
        blocks: [
          '4.1. Тапсырыс беру үшін Сатып алушы Сайтта шынайы аты мен электрондық пошта мекенжайын көрсетіп тіркеледі, ал тапсырысты рәсімдеу кезінде Алматы қаласындағы жеткізу мекенжайы мен телефон нөмірін көрсетеді.',
          '4.2. Бағалар қазақстандық теңгемен (₸, KZT) көрсетілген. Тауардың бағасы тапсырысты рәсімдеу сәтінде бекітіледі және кейін Сайттағы баға өзгерсе де, бұл тапсырыс үшін өзгермейді.',
          '4.3. Тапсырыстағы Тауар саны оның қоймадағы қалдығымен шектеледі және бір позициядан 50 бірліктен аспауы тиіс. Тауар жеткіліксіз болса, сұралған мөлшерге тапсырыс беру мүмкін емес.',
          '4.4. Рәсімделгеннен кейін тапсырыс «Растауды күтуде» күйін алады. Тапсырысты Сатушы растамайынша, Сатып алушы одан Жеке кабинетте бас тарта алады.',
          '4.5. Расталғаннан кейін Сатушы тапсырысты жеткізуге береді. Тапсырыс күйі Жеке кабинетте көрсетіледі.',
        ],
      },
      {
        id: 'payment',
        title: 'Төлем',
        blocks: [
          '5.1. Сатып алушы Тапсырысты алу кезінде Курьерге Тапсырыста көрсетілген сомада төлейді.',
          '5.2. Жеткізу құны Тапсырыс бағасына кіреді және бөлек төленбейді.',
          '5.3. Егер Сатып алушы 6 және 7-бөлімдер негізінде алу кезінде Тауарлардың бір бөлігінен бас тартса, ол тек қабылданған Тауарларды төлейді.',
        ],
      },
      {
        id: 'delivery',
        title: 'Тауарды жеткізу және беру',
        blocks: [
          '6.1. Сатушы Тапсырысты Сатып алушы рәсімдеу кезінде көрсеткен Алматы қаласындағы мекенжайға жеткізеді.',
          '6.2. Рецептілік препараттар дәрігер жазып берген рецептті көрсеткенде ғана беріледі. Рецепт болмаса, Курьер мұндай Тауарды бермейді және оның құны төленбейді.',
          '6.3. Алу кезінде Сатып алушы Тапсырыстың құрамын, қаптаманың бүтіндігін және Тауарлардың жарамдылық мерзімін тексереді.',
          '6.4. Сатушының Тауарды беру жөніндегі міндеттемесі Тапсырыс Сатып алушыға тапсырылған сәттен бастап орындалды деп саналады.',
        ],
      },
      {
        id: 'refund',
        title: 'Тапсырыстан бас тарту және қайтару',
        blocks: [
          '7.1. Сатып алушы тапсырысты Сатушы растағанға дейін Жеке кабинетте жоюға, ал расталғаннан кейін Тапсырысты алу кезінде одан бас тартуға құқылы.',
          '7.2. Тиісті сападағы дәрілік заттар мен медициналық бұйымдар Қазақстан Республикасының заңнамасына сәйкес қайтарылмайды және айырбасталмайды.',
          '7.3. Егер Тауар тиісті сапада болмаса (қаптама зақымдалса, жарамдылық мерзімі өтсе, Тауар Тапсырысқа сәйкес келмесе), Сатып алушы оны алу кезінде қабылдамауға не «Тұтынушылардың құқықтарын қорғау туралы» Қазақстан Республикасының Заңына сәйкес Тауарды ауыстыруды немесе төленген соманы қайтаруды талап етуге құқылы.',
          '7.4. Ауыстыру немесе қайтару туралы талап тапсырыс нөмірі көрсетіле отырып, Сатушының 13-бөлімде көрсетілген электрондық пошта мекенжайына жіберіледі. Ақша талап алынған сәттен бастап 10 күн ішінде қайтарылады.',
        ],
      },
      {
        id: 'duties',
        title: 'Тараптардың құқықтары мен міндеттері',
        blocks: [
          '8.1. Сатушы:',
          {
            list: [
              'жарамдылық мерзімі қолдануға жеткілікті тиісті сападағы Тауарды беруге;',
              'Сайтта Тауарлардың шынайы сипаттамасын орналастыруға;',
              'рецептілік препараттарды тек рецепт көрсетілгенде беруге;',
              'Сатып алушының дербес деректерінің құпиялылығын қамтамасыз етуге міндеттенеді.',
            ],
          },
          '8.2. Сатып алушы:',
          {
            list: [
              'тіркелу және тапсырыс рәсімдеу кезінде шынайы деректерді көрсетуге;',
              'Тапсырысты 5 және 6-бөлімдерде белгіленген тәртіппен қабылдап, төлеуге;',
              'рецептілік препараттарды алу кезінде дәрігер рецептін көрсетуге;',
              'дәрілік заттарды нұсқаулыққа және дәрігердің тағайындауына сәйкес қолдануға міндеттенеді.',
            ],
          },
        ],
      },
      {
        id: 'personal-data',
        title: 'Дербес деректер',
        blocks: [
          { html: `Сатушы Сатып алушының дербес деректерін «Дербес деректер және оларды қорғау туралы» Қазақстан Республикасының Заңына және <a href="${PRIVACY}">Құпиялылық саясатына</a> сәйкес өңдейді. Деректер тек тапсырысты рәсімдеу, жеткізу және сүйемелдеу үшін пайдаланылады және Тапсырысты тапсыруға қажетті көлемдегі жеткізу қызметінен басқа үшінші тұлғаларға берілмейді.` },
        ],
      },
      {
        id: 'liability',
        title: 'Жауапкершілік',
        blocks: [
          '10.1. Тараптар міндеттемелерді орындамағаны үшін Қазақстан Республикасының заңнамасына сәйкес жауап береді.',
          '10.2. Сатушы дәрілік заттарды дәрігердің тағайындауынсыз немесе нұсқаулықты бұза отырып қолданудың салдары үшін, сондай-ақ мекенжай немесе телефон қате көрсетілгендіктен жеткізу мүмкін болмағаны үшін жауап бермейді.',
          '10.3. Еңсерілмейтін күш мән-жайлары туындаған кезде тараптар жауапкершіліктен босатылады.',
        ],
      },
      {
        id: 'disputes',
        title: 'Дауларды шешу',
        blocks: [
          'Даулар келіссөздер жолымен шешіледі. Талап қою тәртібі міндетті: талапқа жауап беру мерзімі — ол алынған сәттен бастап 10 күн. Егер дау реттелмесе, ол Қазақстан Республикасының заңнамасында белгіленген соттылық қағидалары бойынша сотқа беріледі.',
        ],
      },
      {
        id: 'validity',
        title: 'Офертаның қолданылу мерзімі және өзгертілуі',
        blocks: [
          '12.1. Оферта Сайтта жарияланған сәттен бастап күшіне енеді және кері қайтарылғанға дейін қолданылады.',
          '12.2. Сатушы оферта шарттарын өзгертуге құқылы. Жаңа редакция жарияланған сәттен бастап күшіне енеді және ол жарияланғанға дейін рәсімделген тапсырыстарға қолданылмайды.',
        ],
      },
      {
        id: 'requisites',
        title: 'Сатушының деректемелері',
        requisites: [
          ['Сатушы', 'ЖК-ның аты-жөні немесе ұйымның атауы', true],
          ['ЖСН / БСН', 'жеке кәсіпкердің ЖСН-і немесе ұйымның БСН-і', true],
          ['Лицензия', 'фармацевтикалық қызметке арналған лицензияның нөмірі мен берілген күні', true],
          ['Банктік деректемелер', 'банк, ЖСК, БСК', true],
          ['Мекенжай', 'заңды мекенжай', true],
          ['Электрондық пошта', SUPPORT_EMAIL, false],
        ],
      },
    ],
  },

  en: {
    title: 'Public offer',
    subtitle: 'Retail sale and delivery agreement for pharmacy products. Republic of Kazakhstan, version of 16 November 2026.',
    toc: 'Contents',
    sections: [
      {
        id: 'general',
        title: 'General provisions',
        blocks: [
          '1.1. This document is a public offer by the Seller named in section 13 to enter into a retail sale agreement for pharmacy products with any person of full legal capacity (the Buyer) on the terms set out below, in accordance with paragraph 5 of Article 395 of the Civil Code of the Republic of Kazakhstan.',
          '1.2. The Buyer fully and unconditionally accepts this offer by placing an order on the Myata online pharmacy website (the Site) (paragraph 3 of Article 396 of the Civil Code of the Republic of Kazakhstan). The agreement is concluded at the moment of acceptance.',
          { html: `1.3. By placing an order, the Buyer confirms that they have read and agree with this offer and the <a href="${PRIVACY}">Privacy policy</a>.` },
          '1.4. The Seller carries out pharmaceutical activity under the licence whose number and date of issue are given in section 13.',
        ],
      },
      {
        id: 'terms',
        title: 'Definitions',
        blocks: [
          {
            terms: [
              ['Product', 'medicines, medical devices, dietary supplements, hygiene and care products listed in the Site catalog.'],
              ['Prescription drug', 'a medicine dispensed only with a doctor’s prescription. Such Products are marked "Prescription" on the Site.'],
              ['Account', 'the section of the Site available to the Buyer after registration, where orders and their statuses are shown.'],
              ['Order', 'the Buyer’s request to purchase Products, placed through the Site.'],
              ['Courier', 'a representative of the Seller or a delivery service who hands the Order over to the Buyer.'],
            ],
          },
        ],
      },
      {
        id: 'subject',
        title: 'Subject of the agreement',
        blocks: [
          '3.1. The Seller undertakes to transfer the Products listed in the Order to the Buyer, and the Buyer undertakes to accept and pay for them on the terms of this offer.',
          '3.2. The description, dosage form, strength, manufacturer and availability of a Product are shown on its page on the Site. Photos are for illustration only: the packaging received may differ from the picture.',
          '3.3. Product information on the Site is not a recommendation for use. Before using a medicine, the Buyer reads its leaflet and consults a doctor if needed.',
        ],
      },
      {
        id: 'order',
        title: 'Placing an order and price',
        blocks: [
          '4.1. To place an order, the Buyer registers on the Site with a genuine name and email address and, when ordering, gives a delivery address in Almaty and a phone number.',
          '4.2. Prices are in Kazakhstani tenge (₸, KZT). The price of a Product is fixed when the order is placed and does not change for that order, even if the price on the Site changes later.',
          '4.3. The quantity of a Product in an order is limited by the stock available and may not exceed 50 units of one item. If there is not enough stock, the order cannot be placed for the requested quantity.',
          '4.4. After it is placed, the order has the status "Awaiting confirmation". Until the Seller confirms the order, the Buyer may cancel it in their Account.',
          '4.5. Once confirmed, the Seller hands the order over for delivery. The order status is shown in the Account.',
        ],
      },
      {
        id: 'payment',
        title: 'Payment',
        blocks: [
          '5.1. The Buyer pays the Courier for the Order on delivery, in the amount stated in the Order.',
          '5.2. Delivery is included in the Order price and is not paid separately.',
          '5.3. If the Buyer refuses some of the Products on delivery under sections 6 and 7, they pay only for the Products accepted.',
        ],
      },
      {
        id: 'delivery',
        title: 'Delivery and handover',
        blocks: [
          '6.1. The Seller delivers the Order to the address in Almaty given by the Buyer when ordering.',
          '6.2. Prescription drugs are handed over only on presentation of a prescription issued by a doctor. Without a prescription the Courier does not hand over such a Product, and it is not paid for.',
          '6.3. On delivery, the Buyer checks the contents of the Order, the integrity of the packaging and the expiry dates of the Products.',
          '6.4. The Seller’s obligation to transfer the Products is fulfilled when the Order is handed over to the Buyer.',
        ],
      },
      {
        id: 'refund',
        title: 'Cancellation and returns',
        blocks: [
          '7.1. The Buyer may cancel the order in their Account until the Seller confirms it, and after confirmation may refuse the Order on delivery.',
          '7.2. Medicines and medical devices of proper quality cannot be returned or exchanged in accordance with the legislation of the Republic of Kazakhstan.',
          '7.3. If a Product is of improper quality (damaged packaging, expired, or not matching the Order), the Buyer may refuse it on delivery or demand a replacement or a refund under the Law of the Republic of Kazakhstan "On Consumer Protection".',
          '7.4. A request for replacement or refund is sent to the Seller’s email address given in section 13, stating the order number. The money is refunded within 10 days of receiving the request.',
        ],
      },
      {
        id: 'duties',
        title: 'Rights and obligations of the parties',
        blocks: [
          '8.1. The Seller undertakes to:',
          {
            list: [
              'hand over Products of proper quality with a shelf life sufficient for their use;',
              'publish accurate Product descriptions on the Site;',
              'dispense prescription drugs only on presentation of a prescription;',
              'keep the Buyer’s personal data confidential.',
            ],
          },
          '8.2. The Buyer undertakes to:',
          {
            list: [
              'provide accurate data when registering and ordering;',
              'accept and pay for the Order as set out in sections 5 and 6;',
              'present a doctor’s prescription when receiving prescription drugs;',
              'use medicines in accordance with their leaflet and the doctor’s instructions.',
            ],
          },
        ],
      },
      {
        id: 'personal-data',
        title: 'Personal data',
        blocks: [
          { html: `The Seller processes the Buyer’s personal data in accordance with the Law of the Republic of Kazakhstan "On Personal Data and Their Protection" and the <a href="${PRIVACY}">Privacy policy</a>. The data is used only to process, deliver and support the order and is not shared with third parties, except the delivery service to the extent needed to hand over the Order.` },
        ],
      },
      {
        id: 'liability',
        title: 'Liability',
        blocks: [
          '10.1. The parties are liable for failure to perform their obligations in accordance with the legislation of the Republic of Kazakhstan.',
          '10.2. The Seller is not liable for the consequences of using medicines without a doctor’s prescription or contrary to the leaflet, nor for failed delivery due to an incorrect address or phone number.',
          '10.3. The parties are released from liability in the event of force majeure.',
        ],
      },
      {
        id: 'disputes',
        title: 'Dispute resolution',
        blocks: [
          'Disputes are settled by negotiation. A written claim is mandatory: the response period is 10 days from receipt. If the dispute is not settled, it is referred to court under the jurisdiction rules of the Republic of Kazakhstan.',
        ],
      },
      {
        id: 'validity',
        title: 'Term and changes to the offer',
        blocks: [
          '12.1. The offer takes effect when published on the Site and remains valid until withdrawn.',
          '12.2. The Seller may change the terms of the offer. A new version takes effect when published and does not apply to orders placed before its publication.',
        ],
      },
      {
        id: 'requisites',
        title: 'Seller details',
        requisites: [
          ['Seller', 'full name of the individual entrepreneur or company name', true],
          ['IIN / BIN', 'IIN of the individual entrepreneur or BIN of the company', true],
          ['Licence', 'number and date of issue of the pharmaceutical licence', true],
          ['Bank details', 'bank, IIC, BIC', true],
          ['Address', 'legal address', true],
          ['Email', SUPPORT_EMAIL, false],
        ],
      },
    ],
  },
};
