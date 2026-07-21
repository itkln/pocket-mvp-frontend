"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export type Locale = "ru" | "en" | "uk" | "sk";
type Params = Record<string, string | number>;
type TranslationRow = readonly [string, string, string, string];

export const localeStorageKey = "pocket:locale";
export const localeTags: Record<Locale, string> = { ru: "ru-RU", en: "en-GB", uk: "uk-UA", sk: "sk-SK" };
export const localeOptions: { value: Locale; short: string; label: string }[] = [
  { value: "ru", short: "RU", label: "Русский" },
  { value: "en", short: "EN", label: "English" },
  { value: "uk", short: "UA", label: "Українська" },
  { value: "sk", short: "SK", label: "Slovenčina" },
];

const rows: TranslationRow[] = [
  ["Сегодня", "Today", "Сьогодні", "Dnes"],
  ["Главное", "Main", "Головне", "Hlavné"],
  ["Мои действия", "My activity", "Мої дії", "Moje aktivity"],
  ["Смена", "Shift", "Зміна", "Zmena"],
  ["Операции", "Operations", "Операції", "Prevádzka"],
  ["Контроль", "Control", "Контроль", "Kontrola"],
  ["Настройки", "Settings", "Налаштування", "Nastavenia"],
  ["Обзор", "Overview", "Огляд", "Prehľad"],
  ["Заказы", "Orders", "Замовлення", "Objednávky"],
  ["Меню", "Menu", "Меню", "Menu"],
  ["Команда", "Team", "Команда", "Tím"],
  ["Аналитика", "Analytics", "Аналітика", "Analytika"],
  ["Отзывы", "Reviews", "Відгуки", "Recenzie"],
  ["Платежи", "Payments", "Платежі", "Platby"],
  ["Заведение", "Venue", "Заклад", "Prevádzka"],
  ["Подписка", "Subscription", "Підписка", "Predplatné"],
  ["Заведения", "Venues", "Заклади", "Prevádzky"],
  ["Бронь", "Reservation", "Бронювання", "Rezervácia"],
  ["Мои заказы", "My orders", "Мої замовлення", "Moje objednávky"],
  ["Профиль", "Profile", "Профіль", "Profil"],
  ["Сервис", "Service", "Обслуговування", "Obsluha"],
  ["Кухня", "Kitchen", "Кухня", "Kuchyňa"],
  ["Столы", "Tables", "Столи", "Stoly"],
  ["Текущая роль", "Current role", "Поточна роль", "Aktuálna rola"],
  ["Владелец", "Owner", "Власник", "Majiteľ"],
  ["Гость", "Guest", "Гість", "Hosť"],
  ["Сотрудник", "Staff", "Працівник", "Personál"],
  ["Управление заведением", "Venue management", "Керування закладом", "Správa prevádzky"],
  ["Личный аккаунт Pocket", "Personal Pocket account", "Особистий акаунт Pocket", "Osobný účet Pocket"],
  ["Рабочая смена", "Work shift", "Робоча зміна", "Pracovná zmena"],
  ["Управление аккаунтом", "Account settings", "Керування акаунтом", "Správa účtu"],
  ["Сменить роль", "Switch role", "Змінити роль", "Zmeniť rolu"],
  ["Свернуть навигацию", "Collapse navigation", "Згорнути навігацію", "Zbaliť navigáciu"],
  ["Развернуть навигацию", "Expand navigation", "Розгорнути навігацію", "Rozbaliť navigáciu"],
  ["Закрыть меню", "Close menu", "Закрити меню", "Zavrieť menu"],
  ["Основная навигация", "Main navigation", "Основна навігація", "Hlavná navigácia"],
  ["Мои заведения", "My venues", "Мої заклади", "Moje prevádzky"],
  ["Все заведения", "All venues", "Усі заклади", "Všetky prevádzky"],
  ["Добавить заведение", "Add venue", "Додати заклад", "Pridať prevádzku"],
  ["Добавьте первое заведение", "Add your first venue", "Додайте перший заклад", "Pridajte prvú prevádzku"],
  ["После создания откроются меню, команда, заказы и аналитика.", "Menu, team, orders, and analytics will become available after creation.", "Після створення відкриються меню, команда, замовлення й аналітика.", "Po vytvorení sa sprístupní menu, tím, objednávky a analytika."],
  ["Проверяем сессию...", "Checking session...", "Перевіряємо сесію...", "Kontrolujeme reláciu..."],
  ["Поиск", "Search", "Пошук", "Hľadať"],
  ["Уведомления", "Notifications", "Сповіщення", "Upozornenia"],
  ["Корзина", "Cart", "Кошик", "Košík"],
  ["Добавлено в заказ", "Added to order", "Додано до замовлення", "Pridané do objednávky"],
  ["Добрый день, {name}", "Good afternoon, {name}", "Добрий день, {name}", "Dobrý deň, {name}"],
  ["Актуальные данные выбранного заведения.", "Current data for the selected venue.", "Актуальні дані вибраного закладу.", "Aktuálne údaje vybranej prevádzky."],
  ["Отчет", "Report", "Звіт", "Prehľad"],
  ["Выручка сегодня", "Revenue today", "Виторг сьогодні", "Dnešné tržby"],
  ["Оплаченные заказы", "Paid orders", "Оплачені замовлення", "Zaplatené objednávky"],
  ["Средний чек", "Average order", "Середній чек", "Priemerný účet"],
  ["За сегодня", "For today", "За сьогодні", "Za dnes"],
  ["Загрузка зала", "Floor occupancy", "Завантаженість залу", "Obsadenosť sály"],
  ["Последние заказы", "Recent orders", "Останні замовлення", "Posledné objednávky"],
  ["Обновляются из рабочего API", "Updated from the live API", "Оновлюються з робочого API", "Aktualizované z produkčného API"],
  ["Все заказы", "All orders", "Усі замовлення", "Všetky objednávky"],
  ["Заказов пока нет", "No orders yet", "Замовлень поки немає", "Zatiaľ žiadne objednávky"],
  ["Заказов пока нет.", "No orders yet.", "Замовлень поки немає.", "Zatiaľ žiadne objednávky."],
  ["Новые онлайн-заказы появятся здесь автоматически.", "New online orders will appear here automatically.", "Нові онлайн-замовлення з'являться тут автоматично.", "Nové online objednávky sa tu zobrazia automaticky."],
  ["Оценка гостей", "Guest rating", "Оцінка гостей", "Hodnotenie hostí"],
  ["По опубликованным отзывам", "Based on published reviews", "За опублікованими відгуками", "Podľa zverejnených recenzií"],
  ["Оценок пока нет", "No ratings yet", "Оцінок поки немає", "Zatiaľ žiadne hodnotenia"],
  ["Средняя оценка появится после первого отзыва.", "The average rating will appear after the first review.", "Середня оцінка з'явиться після першого відгуку.", "Priemerné hodnotenie sa zobrazí po prvej recenzii."],
  ["Источник", "Source", "Джерело", "Zdroj"],
  ["Сумма", "Amount", "Сума", "Suma"],
  ["Статус", "Status", "Статус", "Stav"],
  ["Создан", "Created", "Створено", "Vytvorené"],
  ["Новый", "New", "Нове", "Nová"],
  ["Принят", "Accepted", "Прийнято", "Prijatá"],
  ["Готовится", "Preparing", "Готується", "Pripravuje sa"],
  ["Готов", "Ready", "Готове", "Pripravená"],
  ["Подан", "Served", "Подано", "Podaná"],
  ["Завершен", "Completed", "Завершено", "Dokončená"],
  ["Отменен", "Cancelled", "Скасовано", "Zrušená"],
  ["Заказы из зала, сайта и предзаказов.", "Dine-in, website, and preorder orders.", "Замовлення із залу, сайту та попередніх замовлень.", "Objednávky zo sály, webu a predobjednávky."],
  ["Все", "All", "Усі", "Všetky"],
  ["Новые", "New", "Нові", "Nové"],
  ["Гость, заказ или текст", "Guest, order, or text", "Гість, замовлення або текст", "Hosť, objednávka alebo text"],
  ["Меню пока пустое", "The menu is empty", "Меню поки порожнє", "Menu je zatiaľ prázdne"],
  ["Меню пока пустое", "The menu is empty", "Меню поки порожнє", "Menu je zatiaľ prázdne"],
  ["Категории, цены и доступность блюд.", "Categories, prices, and item availability.", "Категорії, ціни та доступність страв.", "Kategórie, ceny a dostupnosť položiek."],
  ["Предпросмотр", "Preview", "Попередній перегляд", "Náhľad"],
  ["Добавить", "Add", "Додати", "Pridať"],
  ["Категории", "Categories", "Категорії", "Kategórie"],
  ["Управление категориями", "Manage categories", "Керування категоріями", "Správa kategórií"],
  ["Все позиции", "All items", "Усі позиції", "Všetky položky"],
  ["Позиций:", "Items:", "Позицій:", "Položky:"],
  ["Найти блюдо", "Find an item", "Знайти страву", "Nájsť položku"],
  ["Категория меню", "Menu category", "Категорія меню", "Kategória menu"],
  ["Вид меню", "Menu view", "Вигляд меню", "Zobrazenie menu"],
  ["Показать сеткой", "Grid view", "Показати сіткою", "Zobraziť mriežku"],
  ["Показать списком", "List view", "Показати списком", "Zobraziť zoznam"],
  ["Хит", "Popular", "Хіт", "Obľúbené"],
  ["Описание не добавлено", "No description", "Опис не додано", "Bez popisu"],
  ["Скрыть позицию", "Hide item", "Сховати позицію", "Skryť položku"],
  ["Опубликовать позицию", "Publish item", "Опублікувати позицію", "Zverejniť položku"],
  ["Редактировать", "Edit", "Редагувати", "Upraviť"],
  ["Действия с позицией", "Item actions", "Дії з позицією", "Akcie položky"],
  ["Отметить как «Хит»", "Mark as popular", "Позначити як «Хіт»", "Označiť ako obľúbené"],
  ["Убрать «Хит»", "Remove popular label", "Прибрати «Хіт»", "Odstrániť označenie"],
  ["Создать копию", "Duplicate", "Створити копію", "Vytvoriť kópiu"],
  ["Удалить", "Delete", "Видалити", "Odstrániť"],
  ["Позиции не найдены", "No items found", "Позицій не знайдено", "Nenašli sa žiadne položky"],
  ["Измените категорию или поисковый запрос.", "Change the category or search query.", "Змініть категорію або пошуковий запит.", "Zmeňte kategóriu alebo vyhľadávanie."],
  ["Сначала создайте категорию, затем добавьте первую позицию.", "Create a category first, then add your first item.", "Спочатку створіть категорію, потім додайте першу позицію.", "Najprv vytvorte kategóriu a potom pridajte prvú položku."],
  ["Позицию", "Item", "Позицію", "Položku"],
  ["Блюдо или напиток", "Food or drink", "Страва або напій", "Jedlo alebo nápoj"],
  ["Категорию", "Category", "Категорію", "Kategóriu"],
  ["Новый раздел меню", "New menu section", "Новий розділ меню", "Nová sekcia menu"],
  ["Управление категориями", "Category management", "Керування категоріями", "Správa kategórií"],
  ["Название новой категории", "New category name", "Назва нової категорії", "Názov novej kategórie"],
  ["Новая категория", "New category", "Нова категорія", "Nová kategória"],
  ["В меню", "In menu", "У меню", "V menu"],
  ["Скрыта", "Hidden", "Приховано", "Skrytá"],
  ["Категорий пока нет", "No categories yet", "Категорій поки немає", "Zatiaľ žiadne kategórie"],
  ["Сохранить", "Save", "Зберегти", "Uložiť"],
  ["Сохраняем...", "Saving...", "Зберігаємо...", "Ukladá sa..."],
  ["Закрыть", "Close", "Закрити", "Zavrieť"],
  ["Редактировать позицию", "Edit item", "Редагувати позицію", "Upraviť položku"],
  ["Название", "Name", "Назва", "Názov"],
  ["Категория", "Category", "Категорія", "Kategória"],
  ["Цена", "Price", "Ціна", "Cena"],
  ["Описание", "Description", "Опис", "Popis"],
  ["ПУБЛИЧНОЕ МЕНЮ", "PUBLIC MENU", "ПУБЛІЧНЕ МЕНЮ", "VEREJNÉ MENU"],
  ["Меню заведения", "Venue menu", "Меню закладу", "Menu prevádzky"],
  ["Нет опубликованных позиций", "No published items", "Немає опублікованих позицій", "Žiadne zverejnené položky"],
  ["Команда", "Team", "Команда", "Tím"],
  ["Сотрудники, роли и доступ к заведению.", "Staff, roles, and venue access.", "Працівники, ролі та доступ до закладу.", "Personál, roly a prístup k prevádzke."],
  ["Пригласить сотрудника", "Invite staff member", "Запросити працівника", "Pozvať člena tímu"],
  ["Сотрудников:", "Staff:", "Працівників:", "Personál:"],
  ["Поиск по команде", "Search the team", "Пошук у команді", "Hľadať v tíme"],
  ["Менеджер", "Manager", "Менеджер", "Manažér"],
  ["Официант", "Waiter", "Офіціант", "Čašník"],
  ["Только просмотр", "View only", "Лише перегляд", "Iba na prezeranie"],
  ["Приглашен", "Invited", "Запрошено", "Pozvaný"],
  ["Активен", "Active", "Активний", "Aktívny"],
  ["Неактивен", "Inactive", "Неактивний", "Neaktívny"],
  ["Скопировать e-mail", "Copy email", "Копіювати e-mail", "Kopírovať e-mail"],
  ["Приостановить доступ", "Suspend access", "Призупинити доступ", "Pozastaviť prístup"],
  ["Вернуть доступ", "Restore access", "Відновити доступ", "Obnoviť prístup"],
  ["Удалить из команды", "Remove from team", "Видалити з команди", "Odstrániť z tímu"],
  ["Ничего не найдено", "Nothing found", "Нічого не знайдено", "Nič sa nenašlo"],
  ["Команда пока пустая", "The team is empty", "Команда поки порожня", "Tím je zatiaľ prázdny"],
  ["Измените поисковый запрос.", "Change the search query.", "Змініть пошуковий запит.", "Zmeňte vyhľadávanie."],
  ["Пригласите менеджера, официанта или сотрудника кухни.", "Invite a manager, waiter, or kitchen staff member.", "Запросіть менеджера, офіціанта або працівника кухні.", "Pozvite manažéra, čašníka alebo pracovníka kuchyne."],
  ["Показатели рассчитаны по данным выбранного заведения.", "Metrics are calculated from the selected venue's data.", "Показники розраховано за даними вибраного закладу.", "Ukazovatele sú vypočítané z údajov vybranej prevádzky."],
  ["Экспорт", "Export", "Експорт", "Exportovať"],
  ["Заказов сегодня", "Orders today", "Замовлень сьогодні", "Dnešné objednávky"],
  ["Активные и популярные позиции", "Active and popular items", "Активні та популярні позиції", "Aktívne a obľúbené položky"],
  ["Доступно", "Available", "Доступно", "Dostupné"],
  ["Скрыто", "Hidden", "Приховано", "Skryté"],
  ["Недостаточно данных", "Not enough data", "Недостатньо даних", "Nedostatok údajov"],
  ["Добавьте позиции меню, чтобы видеть сводку.", "Add menu items to see a summary.", "Додайте позиції меню, щоб бачити зведення.", "Pridajte položky menu, aby sa zobrazil súhrn."],
  ["Заказы по каналам", "Orders by channel", "Замовлення за каналами", "Objednávky podľa kanála"],
  ["В зале", "Dine-in", "У залі", "V prevádzke"],
  ["Онлайн", "Online", "Онлайн", "Online"],
  ["Самовывоз", "Pickup", "Самовивіз", "Osobný odber"],
  ["Предзаказ", "Preorder", "Попереднє замовлення", "Predobjednávka"],
  ["Статистика появится после первого заказа.", "Statistics will appear after the first order.", "Статистика з'явиться після першого замовлення.", "Štatistiky sa zobrazia po prvej objednávke."],
  ["Реальные отзывы выбранного заведения.", "Real reviews for the selected venue.", "Справжні відгуки вибраного закладу.", "Skutočné recenzie vybranej prevádzky."],
  ["Все оценки", "All ratings", "Усі оцінки", "Všetky hodnotenia"],
  ["5 звезд", "5 stars", "5 зірок", "5 hviezdičiek"],
  ["4 звезды", "4 stars", "4 зірки", "4 hviezdičky"],
  ["3 и ниже", "3 and below", "3 і нижче", "3 a menej"],
  ["Все столы", "All tables", "Усі столи", "Všetky stoly"],
  ["Без ответа", "No reply", "Без відповіді", "Bez odpovede"],
  ["Требуют внимания", "Needs attention", "Потребують уваги", "Vyžaduje pozornosť"],
  ["Отзывы не найдены", "No reviews found", "Відгуків не знайдено", "Nenašli sa žiadne recenzie"],
  ["Отзывы гостей появятся после завершенных заказов.", "Guest reviews will appear after completed orders.", "Відгуки гостей з'являться після завершених замовлень.", "Recenzie hostí sa zobrazia po dokončených objednávkach."],
  ["Ответ заведения", "Venue reply", "Відповідь закладу", "Odpoveď prevádzky"],
  ["Ответить", "Reply", "Відповісти", "Odpovedať"],
  ["Изменить ответ", "Edit reply", "Змінити відповідь", "Upraviť odpoveď"],
  ["Напишите ответ гостю", "Write a reply to the guest", "Напишіть відповідь гостю", "Napíšte odpoveď hosťovi"],
  ["Отмена", "Cancel", "Скасувати", "Zrušiť"],
  ["Публичная информация и настройки сервиса.", "Public information and service settings.", "Публічна інформація та налаштування сервісу.", "Verejné informácie a nastavenia služby."],
  ["Основное", "General", "Основне", "Základné"],
  ["Расписание", "Schedule", "Розклад", "Otváracie hodiny"],
  ["План зала", "Floor plan", "План залу", "Plán sály"],
  ["Профиль заведения", "Venue profile", "Профіль закладу", "Profil prevádzky"],
  ["Эти данные видят гости.", "Guests can see this information.", "Ці дані бачать гості.", "Tieto údaje vidia hostia."],
  ["Обложка заведения", "Venue cover", "Обкладинка закладу", "Titulná fotografia prevádzky"],
  ["Изменить обложку", "Change cover", "Змінити обкладинку", "Zmeniť titulnú fotografiu"],
  ["Обрабатываем...", "Processing...", "Обробляємо...", "Spracúva sa..."],
  ["Тип кухни", "Cuisine type", "Тип кухні", "Typ kuchyne"],
  ["Телефон", "Phone", "Телефон", "Telefón"],
  ["Город", "City", "Місто", "Mesto"],
  ["Адрес", "Address", "Адреса", "Adresa"],
  ["Черновик", "Draft", "Чернетка", "Koncept"],
  ["Открыто", "Open", "Відкрито", "Otvorené"],
  ["Приостановлено", "Paused", "Призупинено", "Pozastavené"],
  ["Закрыто", "Closed", "Закрито", "Zatvorené"],
  ["Язык и валюта", "Language and currency", "Мова та валюта", "Jazyk a mena"],
  ["Настройки интерфейса и расчетов.", "Interface and payment settings.", "Налаштування інтерфейсу та розрахунків.", "Nastavenia rozhrania a platieb."],
  ["Валюта меню и заказов", "Menu and order currency", "Валюта меню та замовлень", "Mena menu a objednávok"],
  ["Язык интерфейса", "Interface language", "Мова інтерфейсу", "Jazyk rozhrania"],
  ["Язык применяется ко всем экранам и сохраняется на этом устройстве.", "The language applies to every screen and is saved on this device.", "Мова застосовується до всіх екранів і зберігається на цьому пристрої.", "Jazyk sa použije na všetkých obrazovkách a uloží sa v tomto zariadení."],
  ["Часы работы", "Opening hours", "Години роботи", "Otváracie hodiny"],
  ["Доступность бронирований и заказов.", "Reservation and order availability.", "Доступність бронювань і замовлень.", "Dostupnosť rezervácií a objednávok."],
  ["Заведение открыто по расписанию", "Venue follows opening hours", "Заклад працює за розкладом", "Prevádzka sa riadi otváracími hodinami"],
  ["Принимать брони только в рабочие часы.", "Accept reservations only during opening hours.", "Приймати бронювання лише в робочі години.", "Prijímať rezervácie iba počas otváracích hodín."],
  ["Разрешить бронирование сегодня", "Allow same-day reservations", "Дозволити бронювання сьогодні", "Povoliť rezervácie v ten istý deň"],
  ["Гости могут выбрать свободное время на текущий день.", "Guests can select an available time today.", "Гості можуть вибрати вільний час на сьогодні.", "Hostia si môžu vybrať voľný čas na dnešný deň."],
  ["Прием заказов", "Order acceptance", "Приймання замовлень", "Prijímanie objednávok"],
  ["Доступные каналы для гостей.", "Available channels for guests.", "Доступні канали для гостей.", "Dostupné kanály pre hostí."],
  ["Заказы в зале", "Dine-in orders", "Замовлення в залі", "Objednávky v prevádzke"],
  ["Заказ после сканирования QR-кода.", "Order after scanning a QR code.", "Замовлення після сканування QR-коду.", "Objednávka po naskenovaní QR kódu."],
  ["Онлайн-заказы с получением в заведении.", "Online orders for pickup at the venue.", "Онлайн-замовлення з отриманням у закладі.", "Online objednávky s vyzdvihnutím v prevádzke."],
  ["Предзаказ при бронировании", "Preorder with reservation", "Попереднє замовлення при бронюванні", "Predobjednávka pri rezervácii"],
  ["Выбор блюд до визита.", "Choose items before the visit.", "Вибір страв до візиту.", "Výber jedál pred návštevou."],
  ["События для владельца и команды.", "Events for the owner and team.", "Події для власника й команди.", "Udalosti pre majiteľa a tím."],
  ["Новый онлайн-заказ", "New online order", "Нове онлайн-замовлення", "Nová online objednávka"],
  ["Уведомлять рабочие устройства.", "Notify work devices.", "Сповіщати робочі пристрої.", "Upozorniť pracovné zariadenia."],
  ["Новый отзыв", "New review", "Новий відгук", "Nová recenzia"],
  ["Уведомлять владельца о новой оценке.", "Notify the owner about a new rating.", "Сповіщати власника про нову оцінку.", "Upozorniť majiteľa na nové hodnotenie."],
  ["Перетаскивайте элементы и настройте каждый этаж отдельно.", "Drag elements and configure each floor separately.", "Перетягуйте елементи й налаштовуйте кожен поверх окремо.", "Presúvajte prvky a nastavte každé poschodie samostatne."],
  ["Сохранить план", "Save plan", "Зберегти план", "Uložiť plán"],
  ["QR-коды", "QR codes", "QR-коди", "QR kódy"],
  ["Добавить этаж", "Add floor", "Додати поверх", "Pridať poschodie"],
  ["Удалить этаж", "Delete floor", "Видалити поверх", "Odstrániť poschodie"],
  ["Этажи заведения", "Venue floors", "Поверхи закладу", "Poschodia prevádzky"],
  ["Уменьшить масштаб", "Zoom out", "Зменшити масштаб", "Oddialiť"],
  ["Сбросить масштаб", "Reset zoom", "Скинути масштаб", "Obnoviť priblíženie"],
  ["Увеличить масштаб", "Zoom in", "Збільшити масштаб", "Priblížiť"],
  ["Стол", "Table", "Стіл", "Stôl"],
  ["Бар", "Bar", "Бар", "Bar"],
  ["Окно", "Window", "Вікно", "Okno"],
  ["Вход", "Entrance", "Вхід", "Vchod"],
  ["Барная стойка", "Bar counter", "Барна стійка", "Barový pult"],
  ["Граница зала", "Room boundary", "Межа залу", "Hranica sály"],
  ["Дверь или проход", "Door or passage", "Двері або прохід", "Dvere alebo priechod"],
  ["Новый план", "New plan", "Новий план", "Nový plán"],
  ["Поворот", "Rotation", "Поворот", "Otočenie"],
  ["Размер", "Size", "Розмір", "Veľkosť"],
  ["Удалить с плана", "Remove from plan", "Видалити з плану", "Odstrániť z plánu"],
  ["Номер стола", "Table number", "Номер столу", "Číslo stola"],
  ["Количество мест", "Number of seats", "Кількість місць", "Počet miest"],
  ["Позиция:", "Position:", "Позиція:", "Poloha:"],
  ["Скачать QR-код", "Download QR code", "Завантажити QR-код", "Stiahnuť QR kód"],
  ["Удалить стол", "Delete table", "Видалити стіл", "Odstrániť stôl"],
  ["План пока пуст", "The plan is empty", "План поки порожній", "Plán je zatiaľ prázdny"],
  ["Добавить стол", "Add table", "Додати стіл", "Pridať stôl"],
  ["Добавить первый стол", "Add first table", "Додати перший стіл", "Pridať prvý stôl"],
  ["Загружаем", "Loading", "Завантажуємо", "Načítava sa"],
  ["Загружаем план", "Loading plan", "Завантажуємо план", "Načítava sa plán"],
  ["Получаем сохраненную расстановку.", "Loading the saved layout.", "Отримуємо збережене розташування.", "Načítava sa uložené rozloženie."],
  ["Подписка не выбрана", "No subscription selected", "Підписку не вибрано", "Predplatné nie je vybrané"],
  ["Тариф рабочего пространства Pocket.", "Pocket workspace plan.", "Тариф робочого простору Pocket.", "Program pracovného priestoru Pocket."],
  ["Выберите тариф", "Choose a plan", "Виберіть тариф", "Vyberte program"],
  ["Тариф можно изменить по мере роста команды.", "You can change the plan as your team grows.", "Тариф можна змінювати зі зростанням команди.", "Program môžete meniť podľa rastu tímu."],
  ["Ежемесячно", "Monthly", "Щомісяця", "Mesačne"],
  ["Ежегодно", "Yearly", "Щороку", "Ročne"],
  ["Для небольшого заведения", "For a small venue", "Для невеликого закладу", "Pre malú prevádzku"],
  ["Для растущей команды", "For a growing team", "Для команди, що зростає", "Pre rastúci tím"],
  ["Для сети заведений", "For a venue group", "Для мережі закладів", "Pre sieť prevádzok"],
  ["Онлайн-меню", "Online menu", "Онлайн-меню", "Online menu"],
  ["QR-коды столов", "Table QR codes", "QR-коди столів", "QR kódy stolov"],
  ["До 5 сотрудников", "Up to 5 staff", "До 5 працівників", "Do 5 členov tímu"],
  ["Аналитика и отзывы", "Analytics and reviews", "Аналітика та відгуки", "Analytika a recenzie"],
  ["Брони и предзаказы", "Reservations and preorders", "Бронювання та передзамовлення", "Rezervácie a predobjednávky"],
  ["Приоритетная поддержка", "Priority support", "Пріоритетна підтримка", "Prioritná podpora"],
  ["Без ограничений", "Unlimited", "Без обмежень", "Bez obmedzení"],
  ["/ месяц", "/ month", "/ місяць", "/ mesiac"],
  ["При ежегодной оплате два месяца бесплатно.", "Two months free with annual billing.", "Два місяці безкоштовно при щорічній оплаті.", "Pri ročnej platbe sú dva mesiace zadarmo."],
  ["Списание один раз в месяц.", "Charged once a month.", "Списання раз на місяць.", "Platba raz mesačne."],
  ["Изменить тариф", "Change plan", "Змінити тариф", "Zmeniť program"],
  ["Начать пробный период", "Start free trial", "Почати пробний період", "Začať skúšobné obdobie"],
  ["Транзакции выбранного заведения.", "Transactions for the selected venue.", "Транзакції вибраного закладу.", "Transakcie vybranej prevádzky."],
  ["Скачать CSV", "Download CSV", "Завантажити CSV", "Stiahnuť CSV"],
  ["Получено", "Received", "Отримано", "Prijaté"],
  ["Последние транзакции", "Recent transactions", "Останні транзакції", "Posledné transakcie"],
  ["Данные платежного провайдера", "Payment provider data", "Дані платіжного провайдера", "Údaje poskytovateľa platieb"],
  ["Платеж", "Payment", "Платіж", "Platba"],
  ["Провайдер", "Provider", "Провайдер", "Poskytovateľ"],
  ["Дата", "Date", "Дата", "Dátum"],
  ["Успешно", "Successful", "Успішно", "Úspešná"],
  ["Возврат", "Refund", "Повернення", "Vrátenie"],
  ["В обработке", "Processing", "В обробці", "Spracúva sa"],
  ["Транзакций пока нет", "No transactions yet", "Транзакцій поки немає", "Zatiaľ žiadne transakcie"],
  ["Платежи появятся после подключения провайдера и первого онлайн-заказа.", "Payments will appear after connecting a provider and receiving the first online order.", "Платежі з'являться після підключення провайдера й першого онлайн-замовлення.", "Platby sa zobrazia po pripojení poskytovateľa a prvej online objednávke."],
  ["Аккаунт", "Account", "Акаунт", "Účet"],
  ["Личные данные и безопасность входа.", "Personal details and sign-in security.", "Особисті дані та безпека входу.", "Osobné údaje a bezpečnosť prihlásenia."],
  ["Аккаунт Pocket", "Pocket account", "Акаунт Pocket", "Účet Pocket"],
  ["Личные данные", "Personal details", "Особисті дані", "Osobné údaje"],
  ["Фамилия", "Last name", "Прізвище", "Priezvisko"],
  ["Телефон не добавлен", "Phone not added", "Телефон не додано", "Telefón nebol pridaný"],
  ["Безопасность", "Security", "Безпека", "Bezpečnosť"],
  ["Защищенная сессия", "Secure session", "Захищена сесія", "Zabezpečená relácia"],
  ["Пароль хранится в виде Argon2id-хеша", "Password is stored as an Argon2id hash", "Пароль зберігається як хеш Argon2id", "Heslo je uložené ako hash Argon2id"],
  ["Выйти из аккаунта", "Sign out", "Вийти з акаунта", "Odhlásiť sa"],
  ["Куда пойдем сегодня?", "Where shall we go today?", "Куди підемо сьогодні?", "Kam pôjdeme dnes?"],
  ["Братислава · рядом с вами", "Bratislava · near you", "Братислава · поруч із вами", "Bratislava · vo vašom okolí"],
  ["Ресторан, кухня или район", "Restaurant, cuisine, or area", "Ресторан, кухня або район", "Reštaurácia, kuchyňa alebo lokalita"],
  ["Найти", "Search", "Знайти", "Hľadať"],
  ["До 2 км", "Within 2 km", "До 2 км", "Do 2 km"],
  ["Открыто сейчас", "Open now", "Відкрито зараз", "Otvorené teraz"],
  ["Есть места", "Tables available", "Є місця", "Voľné miesta"],
  ["Заказ навынос", "Takeaway", "Замовлення із собою", "Jedlo so sebou"],
  ["Сегодня в Братиславе", "Today in Bratislava", "Сьогодні у Братиславі", "Dnes v Bratislave"],
  ["Подобрано по вашим предпочтениям", "Selected for your preferences", "Підібрано за вашими вподобаннями", "Vybrané podľa vašich preferencií"],
  ["Открыть меню", "Open menu", "Відкрити меню", "Otvoriť menu"],
  ["Сохраненные места", "Saved venues", "Збережені місця", "Uložené prevádzky"],
  ["Рядом с вами", "Near you", "Поруч із вами", "Vo vašom okolí"],
  ["Смотреть все", "View all", "Переглянути всі", "Zobraziť všetko"],
  ["Открыто до 22:30", "Open until 22:30", "Відкрито до 22:30", "Otvorené do 22:30"],
  ["Забронировать", "Reserve", "Забронювати", "Rezervovať"],
  ["Поделиться", "Share", "Поділитися", "Zdieľať"],
  ["В избранное", "Save", "До обраного", "Uložiť"],
  ["Поиск по меню", "Search menu", "Пошук у меню", "Hľadať v menu"],
  ["Сегодня в меню", "Today's menu", "Сьогодні в меню", "Dnešné menu"],
  ["Готовим из сезонных продуктов. Сообщите нам об аллергиях.", "Made with seasonal ingredients. Tell us about any allergies.", "Готуємо із сезонних продуктів. Повідомте про алергії.", "Varíme zo sezónnych surovín. Informujte nás o alergiách."],
  ["Выбор гостей", "Guest favorite", "Вибір гостей", "Voľba hostí"],
  ["Посмотреть заказ", "View order", "Переглянути замовлення", "Zobraziť objednávku"],
  ["Вернуться в меню", "Back to menu", "Повернутися до меню", "Späť do menu"],
  ["Ваш заказ", "Your order", "Ваше замовлення", "Vaša objednávka"],
  ["Позиции", "Items", "Позиції", "Položky"],
  ["Без изменений", "No changes", "Без змін", "Bez zmien"],
  ["Добавить комментарий", "Add a note", "Додати коментар", "Pridať poznámku"],
  ["Уменьшить", "Decrease", "Зменшити", "Znížiť"],
  ["Увеличить", "Increase", "Збільшити", "Zvýšiť"],
  ["Корзина пуста", "Your cart is empty", "Кошик порожній", "Košík je prázdny"],
  ["Вернитесь в меню и выберите блюда.", "Return to the menu and choose some items.", "Поверніться до меню та виберіть страви.", "Vráťte sa do menu a vyberte si položky."],
  ["Чаевые команде", "Team tip", "Чайові команді", "Prepitné pre tím"],
  ["100% чаевых получают сотрудники", "100% of tips go to the team", "100% чайових отримують працівники", "100 % prepitného dostane tím"],
  ["Без чаевых", "No tip", "Без чайових", "Bez prepitného"],
  ["Другая сумма", "Other amount", "Інша сума", "Iná suma"],
  ["Способ оплаты", "Payment method", "Спосіб оплати", "Spôsob platby"],
  ["Основной способ", "Primary method", "Основний спосіб", "Hlavný spôsob"],
  ["Быстрая оплата", "Fast payment", "Швидка оплата", "Rýchla platba"],
  ["Итого", "Total", "Разом", "Spolu"],
  ["Блюда", "Items", "Страви", "Položky"],
  ["Сервисный сбор", "Service fee", "Сервісний збір", "Servisný poplatok"],
  ["К оплате", "Amount due", "До сплати", "Na úhradu"],
  ["Оплатить", "Pay", "Сплатити", "Zaplatiť"],
  ["Безопасная оплата через Stripe", "Secure payment via Stripe", "Безпечна оплата через Stripe", "Bezpečná platba cez Stripe"],
  ["Забронировать стол", "Reserve a table", "Забронювати стіл", "Rezervovať stôl"],
  ["Когда вас ждать?", "When should we expect you?", "Коли на вас чекати?", "Kedy vás máme očakávať?"],
  ["Количество гостей", "Number of guests", "Кількість гостей", "Počet hostí"],
  ["Выберите стол", "Choose a table", "Виберіть стіл", "Vyberte stôl"],
  ["Можно выбрать конкретный свободный стол.", "You can choose a specific available table.", "Можна вибрати конкретний вільний стіл.", "Môžete si vybrať konkrétny voľný stôl."],
  ["Заказать блюда заранее", "Preorder items", "Замовити страви заздалегідь", "Objednať jedlá vopred"],
  ["Комментарий", "Note", "Коментар", "Poznámka"],
  ["Детский стул, аллергии или повод", "High chair, allergies, or occasion", "Дитячий стілець, алергії або привід", "Detská stolička, alergie alebo príležitosť"],
  ["Подтвердить бронь", "Confirm reservation", "Підтвердити бронювання", "Potvrdiť rezerváciu"],
  ["Бесплатная отмена не позднее чем за 2 часа.", "Free cancellation up to 2 hours before.", "Безкоштовне скасування не пізніше ніж за 2 години.", "Bezplatné zrušenie najneskôr 2 hodiny vopred."],
  ["История визитов, заказов и оплат.", "Visit, order, and payment history.", "Історія відвідувань, замовлень і оплат.", "História návštev, objednávok a platieb."],
  ["Стол сегодня", "Table today", "Стіл сьогодні", "Stôl dnes"],
  ["Стол через 20 мин", "Table in 20 min", "Стіл за 20 хв", "Stôl o 20 min"],
  ["Следить за заказом", "Track order", "Стежити за замовленням", "Sledovať objednávku"],
  ["Оставить отзыв", "Leave a review", "Залишити відгук", "Pridať recenziu"],
  ["Ваш аккаунт, предпочтения и способы оплаты.", "Your account, preferences, and payment methods.", "Ваш акаунт, уподобання та способи оплати.", "Váš účet, preferencie a platobné metódy."],
  ["Выйти", "Sign out", "Вийти", "Odhlásiť sa"],
  ["Оплата", "Payment", "Оплата", "Platba"],
  ["Добавить способ оплаты", "Add payment method", "Додати спосіб оплати", "Pridať spôsob platby"],
  ["Предпочтения", "Preferences", "Уподобання", "Preferencie"],
  ["Безлактозные блюда", "Lactose-free items", "Безлактозні страви", "Bezlaktózové jedlá"],
  ["Показывать подсказки в меню.", "Show suggestions in the menu.", "Показувати підказки в меню.", "Zobrazovať tipy v menu."],
  ["Новости любимых мест", "News from favorite venues", "Новини улюблених місць", "Novinky z obľúbených prevádzok"],
  ["Редкие и полезные письма от заведений.", "Occasional useful emails from venues.", "Рідкісні й корисні листи від закладів.", "Občasné užitočné e-maily z prevádzok."],
  ["Ваша смена · 12:00–22:30", "Your shift · 12:00–22:30", "Ваша зміна · 12:00–22:30", "Vaša zmena · 12:00–22:30"],
  ["Сканировать стол", "Scan table", "Сканувати стіл", "Naskenovať stôl"],
  ["Смена активна", "Shift active", "Зміна активна", "Zmena je aktívna"],
  ["Завершить смену", "End shift", "Завершити зміну", "Ukončiť zmenu"],
  ["Все готово", "All done", "Усе готово", "Všetko hotové"],
  ["В этой колонке нет заказов.", "There are no orders in this column.", "У цій колонці немає замовлень.", "V tomto stĺpci nie sú žiadne objednávky."],
  ["Принять", "Accept", "Прийняти", "Prijať"],
  ["Проверить", "Check", "Перевірити", "Skontrolovať"],
  ["Подано", "Served", "Подано", "Podané"],
  ["Очередь блюд по времени приготовления.", "Item queue by preparation time.", "Черга страв за часом приготування.", "Poradie jedál podľa času prípravy."],
  ["Готовятся", "Preparing", "Готуються", "Pripravuje sa"],
  ["Готовы", "Ready", "Готові", "Pripravené"],
  ["Создать аккаунт", "Create account", "Створити акаунт", "Vytvoriť účet"],
  ["Один аккаунт для бронирований, заказов и управления заведениями.", "One account for reservations, orders, and venue management.", "Один акаунт для бронювань, замовлень і керування закладами.", "Jeden účet na rezervácie, objednávky a správu prevádzok."],
  ["Уже есть аккаунт?", "Already have an account?", "Уже маєте акаунт?", "Už máte účet?"],
  ["Войти", "Sign in", "Увійти", "Prihlásiť sa"],
  ["Войти в Pocket", "Sign in to Pocket", "Увійти в Pocket", "Prihlásiť sa do Pocket"],
  ["Управляйте заведениями или продолжите как гость.", "Manage venues or continue as a guest.", "Керуйте закладами або продовжуйте як гість.", "Spravujte prevádzky alebo pokračujte ako hosť."],
  ["Нет аккаунта?", "No account?", "Немає акаунта?", "Nemáte účet?"],
  ["Зарегистрироваться", "Register", "Зареєструватися", "Registrovať sa"],
  ["Имя", "First name", "Ім'я", "Meno"],
  ["Пароль", "Password", "Пароль", "Heslo"],
  ["Повторите пароль", "Repeat password", "Повторіть пароль", "Zopakujte heslo"],
  ["Показать пароль", "Show password", "Показати пароль", "Zobraziť heslo"],
  ["Скрыть пароль", "Hide password", "Сховати пароль", "Skryť heslo"],
  ["Введите пароль", "Enter password", "Введіть пароль", "Zadajte heslo"],
  ["Запомнить меня", "Remember me", "Запам'ятати мене", "Zapamätať si ma"],
  ["Забыли пароль?", "Forgot password?", "Забули пароль?", "Zabudli ste heslo?"],
  ["Я принимаю условия использования и политику конфиденциальности", "I accept the terms of use and privacy policy", "Я приймаю умови використання та політику конфіденційності", "Súhlasím s podmienkami používania a zásadami ochrany súkromia"],
  ["От 12 до 128 символов", "12 to 128 characters", "Від 12 до 128 символів", "12 až 128 znakov"],
  ["Входим...", "Signing in...", "Входимо...", "Prihlasuje sa..."],
  ["Создаем аккаунт...", "Creating account...", "Створюємо акаунт...", "Vytvára sa účet..."],
  ["Пароли не совпадают", "Passwords do not match", "Паролі не збігаються", "Heslá sa nezhodujú"],
  ["Сервер временно недоступен. Попробуйте еще раз", "The server is temporarily unavailable. Try again.", "Сервер тимчасово недоступний. Спробуйте ще раз.", "Server je dočasne nedostupný. Skúste to znova."],
  ["Управление", "Management", "Керування", "Správa"],
  ["Завершены", "Completed", "Завершені", "Dokončené"],
  ["За текущий день", "For the current day", "За поточний день", "Za aktuálny deň"],
  ["Средняя оценка", "Average rating", "Середня оцінка", "Priemerné hodnotenie"],
  ["отзывов", "reviews", "відгуків", "recenzií"],
  ["Успешных платежей:", "Successful payments:", "Успішних платежів:", "Úspešné platby:"],
  ["Отзывов пока нет", "No reviews yet", "Відгуків поки немає", "Zatiaľ žiadne recenzie"],
  ["Пробный период", "Trial", "Пробний період", "Skúšobné obdobie"],
  ["Все возможности Start", "Everything in Start", "Усі можливості Start", "Všetko z plánu Start"],
  ["Все возможности Business", "Everything in Business", "Усі можливості Business", "Všetko z plánu Business"],
  ["Без ограничения заведений", "Unlimited venues", "Без обмеження закладів", "Neobmedzený počet prevádzok"],
  ["Современная европейская", "Modern European", "Сучасна європейська", "Moderná európska"],
  ["Итальянская", "Italian", "Італійська", "Talianska"],
  ["Японская", "Japanese", "Японська", "Japonská"],
  ["Евро (€)", "Euro (€)", "Євро (€)", "Euro (€)"],
  ["Доллар США ($)", "US dollar ($)", "Долар США ($)", "Americký dolár ($)"],
  ["Фунт стерлингов (£)", "Pound sterling (£)", "Фунт стерлінгів (£)", "Libra šterlingov (£)"],
  ["Украинская гривна (₴)", "Ukrainian hryvnia (₴)", "Українська гривня (₴)", "Ukrajinská hrivna (₴)"],
  ["Российский рубль (₽)", "Russian ruble (₽)", "Російський рубль (₽)", "Ruský rubeľ (₽)"],
  ["Чешская крона (Kč)", "Czech koruna (Kč)", "Чеська крона (Kč)", "Česká koruna (Kč)"],
  ["Pocket, на главную", "Pocket, home", "Pocket, на головну", "Pocket, domov"],
  ["Откройте стол, закажите заранее или забронируйте вечер.", "Open a table, preorder, or reserve an evening.", "Відкрийте стіл, замовте заздалегідь або забронюйте вечір.", "Otvorte si stôl, objednajte vopred alebo si rezervujte večer."],
  ["Ваш любимый стол в North & Vine", "Your favourite table at North & Vine", "Ваш улюблений стіл у North & Vine", "Váš obľúbený stôl v North & Vine"],
  ["у окна", "by the window", "біля вікна", "pri okne"],
  ["Закуски", "Starters", "Закуски", "Predjedlá"],
  ["Паста", "Pasta", "Паста", "Cestoviny"],
  ["Десерты", "Desserts", "Десерти", "Dezerty"],
  ["Напитки", "Drinks", "Напої", "Nápoje"],
  ["Когда", "When", "Коли", "Kedy"],
  ["Детали", "Details", "Деталі", "Podrobnosti"],
  ["Вс", "Sun", "Нд", "Ne"],
  ["Пн", "Mon", "Пн", "Po"],
  ["Вт", "Tue", "Вт", "Ut"],
  ["Ср", "Wed", "Ср", "St"],
  ["Чт", "Thu", "Чт", "Št"],
  ["Продолжить", "Continue", "Продовжити", "Pokračovať"],
  ["Дата", "Date", "Дата", "Dátum"],
  ["Время", "Time", "Час", "Čas"],
  ["Гости", "Guests", "Гості", "Hostia"],
  ["места", "seats", "місця", "miesta"],
  ["ЭТАЖ", "FLOOR", "ПОВЕРХ", "POSCHODIE"],
  ["СТОЛ", "TABLE", "СТІЛ", "STÔL"],
  ["· СТОЛ", "· TABLE", "· СТІЛ", "· STÔL"],
  ["1 стол", "1 table", "1 стіл", "1 stôl"],
  ["СЕГОДНЯ", "TODAY", "СЬОГОДНІ", "DNES"],
  ["В ЗАЛЕ", "DINE-IN", "У ЗАЛІ", "V PREVÁDZKE"],
  ["Подтвержден", "Confirmed", "Підтверджено", "Potvrdená"],
  ["ОПЛАЧЕН", "PAID", "ОПЛАЧЕНО", "ZAPLATENÉ"],
  ["Карта •••• 4242", "Card •••• 4242", "Картка •••• 4242", "Karta •••• 4242"],
  ["Подробнее", "Details", "Докладніше", "Podrobnosti"],
  ["Подтвердите удаление", "Confirm deletion", "Підтвердьте видалення", "Potvrďte odstránenie"],
  ["Это действие нельзя отменить.", "This action cannot be undone.", "Цю дію неможливо скасувати.", "Túto akciu nemožno vrátiť späť."],
  ["Удаление...", "Deleting...", "Видалення...", "Odstraňuje sa..."],
  ["Удалить обложку заведения?", "Delete the venue cover?", "Видалити обкладинку закладу?", "Odstrániť titulnú fotografiu prevádzky?"],
  ["Удалить этаж", "Delete floor", "Видалити поверх", "Odstrániť poschodie"],
  ["Удалить этаж «{name}» вместе со всеми элементами плана?", "Delete “{name}” and all floor-plan elements?", "Видалити «{name}» разом з усіма елементами плану?", "Odstrániť „{name}“ spolu so všetkými prvkami plánu?"],
  ["Удалить {type} с плана?", "Remove {type} from the plan?", "Видалити {type} з плану?", "Odstrániť {type} z plánu?"],
  ["Удалить стол {id} с плана?", "Delete table {id} from the plan?", "Видалити стіл {id} з плану?", "Odstrániť stôl {id} z plánu?"],
  ["Удалить позицию «{name}»?", "Delete item “{name}”?", "Видалити позицію «{name}»?", "Odstrániť položku „{name}“?"],
  ["Удалить категорию «{name}»?", "Delete category “{name}”?", "Видалити категорію «{name}»?", "Odstrániť kategóriu „{name}“?"],
  ["Удалить сотрудника {name} из команды?", "Remove {name} from the team?", "Видалити {name} з команди?", "Odstrániť člena {name} z tímu?"],
];

const localeIndex: Record<Locale, number> = { ru: 0, en: 1, uk: 2, sk: 3 };
const dictionaries = Object.fromEntries((Object.keys(localeIndex) as Locale[]).map((locale) => [locale, new Map(rows.map((row) => [row[0], row[localeIndex[locale]]]))])) as Record<Locale, Map<string, string>>;

const interpolate = (value: string, params?: Params) => params ? value.replace(/\{(\w+)\}/g, (_, key: string) => String(params[key] ?? `{${key}}`)) : value;

const dynamicTranslation = (source: string, locale: Locale) => {
  const templates: [RegExp, string, string, string][] = [
    [/^(\d+) этаж$/, "$1 floor", "$1 поверх", "$1. poschodie"],
    [/^(\d+) (?:стол|стола|столов)$/, "$1 tables", "$1 столів", "$1 stolov"],
    [/^(\d+) (?:позиция|позиции|позиций)$/, "$1 items", "$1 позицій", "$1 položiek"],
    [/^(\d+) (?:гость|гостя|гостей)$/, "$1 guests", "$1 гостей", "$1 hostí"],
    [/^(\d+) (?:место|места|мест)$/, "$1 seats", "$1 місць", "$1 miest"],
    [/^(\d+) мин$/, "$1 min", "$1 хв", "$1 min"],
    [/^(\d+) новых$/, "$1 new", "$1 нових", "$1 nových"],
    [/^(\d+) из (\d+)$/, "$1 of $2", "$1 з $2", "$1 z $2"],
    [/^Завершено: (\d+)$/, "Completed: $1", "Завершено: $1", "Dokončené: $1"],
    [/^Активных столов: (\d+)$/, "Active tables: $1", "Активних столів: $1", "Aktívne stoly: $1"],
    [/^Отзывов: (\d+)$/, "Reviews: $1", "Відгуків: $1", "Recenzie: $1"],
    [/^(\d+) (?:отзыв|отзыва|отзывов)$/, "$1 reviews", "$1 відгуків", "$1 recenzií"],
    [/^до (\d+) гостей$/, "up to $1 guests", "до $1 гостей", "do $1 hostí"],
    [/^(\d+) июля$/, "$1 July", "$1 липня", "$1. júla"],
    [/^(\d+) июня$/, "$1 June", "$1 червня", "$1. júna"],
    [/^(\d+(?:[.,]\d+)?) км$/, "$1 km", "$1 км", "$1 km"],
    [/^(\d+) ЭТАЖ$/, "FLOOR $1", "$1 ПОВЕРХ", "$1. POSCHODIE"],
    [/^Удалить (\d+) этаж$/, "Delete floor $1", "Видалити поверх $1", "Odstrániť $1. poschodie"],
    [/^Удалить (.+)$/, "Delete $1", "Видалити $1", "Odstrániť $1"],
    [/^Добрый день, (.+)$/, "Good afternoon, $1", "Добрий день, $1", "Dobrý deň, $1"],
    [/^Стол (.+)$/, "Table $1", "Стіл $1", "Stôl $1"],
    [/^Заказ #(.+)$/, "Order #$1", "Замовлення #$1", "Objednávka #$1"],
    [/^До (\d+) заведений$/, "Up to $1 venues", "До $1 закладів", "Do $1 prevádzok"],
    [/^Доступных позиций: (\d+)$/, "$1 available items", "Доступних позицій: $1", "Dostupné položky: $1"],
    [/^Успешных платежей: (\d+)$/, "Successful payments: $1", "Успішних платежів: $1", "Úspešné platby: $1"],
    [/^Чаевые \((\d+)%\)$/, "Tip ($1%)", "Чайові ($1%)", "Prepitné ($1%)"],
    [/^Пробный период до (.+)$/, "Trial until $1", "Пробний період до $1", "Skúšobné obdobie do $1"],
  ];
  for (const template of templates) {
    if (!template[0].test(source)) continue;
    const replacement = locale === "en" ? template[1] : locale === "uk" ? template[2] : locale === "sk" ? template[3] : source;
    return source.replace(template[0], replacement);
  }
  return source;
};

export const translate = (source: string, locale: Locale, params?: Params): string => {
  if (locale === "ru") return interpolate(source, params);
  const exact = dictionaries[locale].get(source);
  if (exact) return interpolate(exact, params);
  for (const separator of [" · ", " — ", " / "]) {
    if (!source.includes(separator)) continue;
    const parts = source.split(separator);
    const translated = parts.map((part) => translate(part, locale));
    if (translated.some((part, index) => part !== parts[index])) return translated.join(separator);
  }
  const dynamic = dynamicTranslation(source, locale);
  if (dynamic !== source) return interpolate(dynamic, params);
  return interpolate(source, params);
};

type I18nValue = { locale: Locale; setLocale: (locale: Locale) => void; t: (source: string, params?: Params) => string };
const I18nContext = createContext<I18nValue>({ locale: "ru", setLocale: () => undefined, t: (source, params) => interpolate(source, params) });

const sourceText = new WeakMap<Text, string>();
const renderedText = new WeakMap<Text, string>();
const sourceAttributes = new WeakMap<Element, Map<string, string>>();
const renderedAttributes = new WeakMap<Element, Map<string, string>>();
const translatedAttributes = ["placeholder", "title", "aria-label", "alt"];

const translateTextNode = (node: Text, locale: Locale) => {
  const previousRendered = renderedText.get(node);
  if (!sourceText.has(node) || (previousRendered !== undefined && node.data !== previousRendered)) sourceText.set(node, node.data);
  const source = sourceText.get(node) ?? node.data;
  const leading = source.match(/^\s*/)?.[0] ?? "";
  const trailing = source.match(/\s*$/)?.[0] ?? "";
  const core = source.trim();
  const next = core ? `${leading}${translate(core, locale)}${trailing}` : source;
  renderedText.set(node, next);
  if (node.data !== next) node.data = next;
};

const translateElement = (element: Element, locale: Locale) => {
  const sourceMap = sourceAttributes.get(element) ?? new Map<string, string>();
  const renderedMap = renderedAttributes.get(element) ?? new Map<string, string>();
  for (const attribute of translatedAttributes) {
    const current = element.getAttribute(attribute);
    if (current === null) continue;
    if (!sourceMap.has(attribute) || (renderedMap.has(attribute) && current !== renderedMap.get(attribute))) sourceMap.set(attribute, current);
    const next = translate(sourceMap.get(attribute) ?? current, locale);
    renderedMap.set(attribute, next);
    if (current !== next) element.setAttribute(attribute, next);
  }
  sourceAttributes.set(element, sourceMap);
  renderedAttributes.set(element, renderedMap);
};

const translateTree = (root: Node, locale: Locale) => {
  if (root.nodeType === Node.TEXT_NODE) { translateTextNode(root as Text, locale); return; }
  if (!(root instanceof Element) && !(root instanceof DocumentFragment) && !(root instanceof Document)) return;
  if (root instanceof Element) {
    if (["SCRIPT", "STYLE", "CODE"].includes(root.tagName)) return;
    translateElement(root, locale);
  }
  root.childNodes.forEach((child) => translateTree(child, locale));
};

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("ru");
  useEffect(() => {
    const stored = window.localStorage.getItem(localeStorageKey);
    if (stored !== "ru" && stored !== "en" && stored !== "uk" && stored !== "sk") return;

    const restoreLocale = window.setTimeout(() => setLocaleState(stored), 0);
    return () => window.clearTimeout(restoreLocale);
  }, []);
  useEffect(() => {
    document.documentElement.lang = locale;
    translateTree(document.body, locale);
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === "characterData") translateTree(mutation.target, locale);
        else if (mutation.type === "attributes") translateTree(mutation.target, locale);
        else mutation.addedNodes.forEach((node) => translateTree(node, locale));
      }
    });
    observer.observe(document.body, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: translatedAttributes });
    return () => observer.disconnect();
  }, [locale]);
  const value = useMemo<I18nValue>(() => ({
    locale,
    setLocale: (next) => { window.localStorage.setItem(localeStorageKey, next); setLocaleState(next); },
    t: (source, params) => translate(source, locale, params),
  }), [locale]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export const useI18n = () => useContext(I18nContext);
