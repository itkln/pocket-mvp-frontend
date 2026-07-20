"use client";

import { useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  Activity,
  ArrowUpDown,
  ArrowRight,
  BadgeCheck,
  BarChart3,
  Bell,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  Clock3,
  Coffee,
  Copy,
  CreditCard,
  Download,
  Edit3,
  Ellipsis,
  Eye,
  EyeOff,
  Heart,
  ImagePlus,
  LayoutDashboard,
  ListFilter,
  LayoutGrid,
  LogOut,
  MapPin,
  Menu as MenuIcon,
  MessageSquareText,
  Minus,
  PackageCheck,
  Pencil,
  Plus,
  QrCode,
  RefreshCw,
  ReceiptText,
  Rows3,
  Search,
  Send,
  Settings,
  Share2,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Star,
  Store,
  Table2,
  Trash2,
  TrendingUp,
  UserRound,
  Users,
  Utensils,
  UtensilsCrossed,
  WalletCards,
  X,
  type LucideIcon,
} from "lucide-react";

type Role = "owner" | "customer" | "staff";
type Status = "Новый" | "Готовится" | "Готов" | "Подан";

type Venue = {
  id: string;
  name: string;
  initials: string;
  location: string;
};

const venues: Venue[] = [
  { id: "north-vine", name: "North & Vine", initials: "NV", location: "Братислава · Центр" },
  { id: "casa-forma", name: "Casa Forma", initials: "CF", location: "Братислава · Старый город" },
  { id: "mizu-table", name: "Mizu Table", initials: "MT", location: "Братислава · Ружинов" },
];

type MenuItem = {
  id: number;
  name: string;
  description: string;
  price: number;
  category: string;
  position: string;
  popular?: boolean;
};

const menuItems: MenuItem[] = [
  { id: 1, name: "Тальятелле с трюфелем", description: "Лесные грибы, пармезан, трюфельное масло", price: 18.5, category: "Паста", position: "0% 0%", popular: true },
  { id: 2, name: "Сибас на гриле", description: "Лимон, травы, молодой картофель", price: 24, category: "Основное", position: "50% 0%", popular: true },
  { id: 3, name: "Буррата и томаты", description: "Сезонные томаты, базилик, оливковое масло", price: 13.5, category: "Закуски", position: "100% 0%" },
  { id: 4, name: "Куриный шницель", description: "Рукола, редис, лимонный соус", price: 17, category: "Основное", position: "0% 100%" },
  { id: 5, name: "Тирамису", description: "Маскарпоне, эспрессо, какао", price: 8.5, category: "Десерты", position: "50% 100%", popular: true },
  { id: 6, name: "Красный апельсин", description: "Цитрус, тоник, розмарин", price: 7, category: "Напитки", position: "100% 100%" },
];

const liveOrders = [
  { id: "#1048", source: "Стол 08", guest: "4 гостя", total: 76.5, status: "Новый" as Status, time: "2 мин" },
  { id: "#1047", source: "Онлайн", guest: "Анна К.", total: 42, status: "Готовится" as Status, time: "8 мин" },
  { id: "#1046", source: "Стол 03", guest: "2 гостя", total: 58.5, status: "Готов" as Status, time: "14 мин" },
  { id: "#1045", source: "Стол 12", guest: "6 гостей", total: 124, status: "Подан" as Status, time: "26 мин" },
  { id: "#1044", source: "Самовывоз", guest: "Марк С.", total: 31.5, status: "Готовится" as Status, time: "29 мин" },
];

const ownerNavigation = [
  { id: "overview", label: "Обзор", icon: LayoutDashboard },
  { id: "orders", label: "Заказы", icon: ReceiptText, count: 8 },
  { id: "menu", label: "Меню", icon: UtensilsCrossed },
  { id: "floor", label: "План зала", icon: Table2 },
  { id: "team", label: "Команда", icon: Users },
  { id: "analytics", label: "Аналитика", icon: BarChart3 },
  { id: "reviews", label: "Отзывы", icon: MessageSquareText },
  { id: "venue", label: "Заведение", icon: Store },
  { id: "payments", label: "Платежи", icon: WalletCards },
  { id: "subscription", label: "Подписка", icon: Sparkles },
];

const customerNavigation = [
  { id: "discover", label: "Заведения", icon: Search },
  { id: "browse-menu", label: "Меню", icon: Utensils },
  { id: "reservation", label: "Бронь", icon: CalendarDays },
  { id: "history", label: "Мои заказы", icon: ReceiptText },
  { id: "profile", label: "Профиль", icon: UserRound },
];

const staffNavigation = [
  { id: "service", label: "Сервис", icon: Activity, count: 5 },
  { id: "kitchen", label: "Кухня", icon: Coffee },
  { id: "staff-floor", label: "Столы", icon: Table2 },
];

const mobilePrimaryNavigation: Record<Role, string[]> = {
  owner: ["overview", "orders", "menu", "floor"],
  customer: ["discover", "browse-menu", "reservation", "history"],
  staff: ["service", "kitchen", "staff-floor"],
};

function money(value: number) {
  return `€${value.toFixed(2)}`;
}

function Button({ children, icon: Icon, kind = "primary", onClick, type = "button", disabled = false, className = "" }: { children?: ReactNode; icon?: LucideIcon; kind?: "primary" | "secondary" | "quiet" | "danger"; onClick?: () => void; type?: "button" | "submit"; disabled?: boolean; className?: string }) {
  return <button type={type} className={`button ${kind} ${className}`} onClick={onClick} disabled={disabled}>{Icon && <Icon size={17} />}{children}</button>;
}

function IconButton({ icon: Icon, label, onClick, active = false }: { icon: LucideIcon; label: string; onClick?: () => void; active?: boolean }) {
  return <button className={`icon-button ${active ? "active" : ""}`} onClick={onClick} aria-label={label} title={label}><Icon size={19} /></button>;
}

function StatusPill({ status }: { status: string }) {
  return <span className={`status status-${status.toLowerCase().replaceAll(" ", "-")}`}><i />{status}</span>;
}

function FoodImage({ item, className = "" }: { item: MenuItem; className?: string }) {
  return <div className={`food-image ${className}`} style={{ backgroundPosition: item.position }} role="img" aria-label={item.name} />;
}

function EmptyIllustration({ icon: Icon, title, text }: { icon: LucideIcon; title: string; text: string }) {
  return <div className="empty-state"><span><Icon size={24} /></span><h3>{title}</h3><p>{text}</p></div>;
}

export default function PocketApp() {
  const router = useRouter();
  const [role, setRole] = useState<Role>("owner");
  const [screen, setScreen] = useState("overview");
  const [venue, setVenue] = useState(venues[0]);
  const [cart, setCart] = useState<Record<number, number>>({ 1: 1, 3: 1 });
  const [modal, setModal] = useState<"item" | "invite" | "order" | null>(null);
  const [toast, setToast] = useState("");
  const [mobileNav, setMobileNav] = useState(false);

  const navigation = role === "owner" ? ownerNavigation : role === "customer" ? customerNavigation : staffNavigation;
  const cartCount = Object.values(cart).reduce((sum, qty) => sum + qty, 0);
  const cartTotal = menuItems.reduce((sum, item) => sum + item.price * (cart[item.id] || 0), 0);

  const changeRole = (next: Role) => {
    setRole(next);
    setScreen(next === "owner" ? "overview" : next === "customer" ? "discover" : "service");
    setMobileNav(false);
  };

  const navigate = (next: string) => {
    setScreen(next);
    setMobileNav(false);
  };

  const notify = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 2400);
  };

  const addItem = (id: number) => {
    setCart((current) => ({ ...current, [id]: (current[id] || 0) + 1 }));
    notify("Добавлено в заказ");
  };

  const updateQty = (id: number, delta: number) => {
    setCart((current) => {
      const next = Math.max(0, (current[id] || 0) + delta);
      const copy = { ...current };
      if (next === 0) delete copy[id]; else copy[id] = next;
      return copy;
    });
  };

  return (
    <div className="app-shell">
      <Sidebar role={role} screen={screen} navigation={navigation} venue={venue} venues={venues} mobileNav={mobileNav} onNavigate={navigate} onRole={changeRole} onVenue={(nextVenue) => { setVenue(nextVenue); notify(`Выбрано заведение ${nextVenue.name}`); }} onClose={() => setMobileNav(false)} />
      <main className="main-shell">
        <Topbar role={role} screen={screen} navigation={navigation} venueName={venue.name} cartCount={cartCount} onMenu={() => setMobileNav(true)} onCart={() => navigate("checkout")} />
        <div className={`page-area ${role === "customer" ? "customer-area" : ""}`}>
          {role === "owner" && screen === "overview" && <OwnerOverview onNavigate={navigate} onOrder={() => setModal("order")} />}
          {role === "owner" && screen === "orders" && <OrdersScreen onOrder={() => setModal("order")} />}
          {role === "owner" && screen === "menu" && <MenuManager venueName={venue.name} onAdd={() => setModal("item")} notify={notify} />}
          {role === "owner" && screen === "floor" && <FloorPlan mode="owner" venueName={venue.name} notify={notify} />}
          {role === "owner" && screen === "team" && <TeamScreen onInvite={() => setModal("invite")} notify={notify} />}
          {role === "owner" && screen === "analytics" && <AnalyticsScreen />}
          {role === "owner" && screen === "reviews" && <ReviewsScreen notify={notify} />}
          {role === "owner" && screen === "venue" && <VenueScreen key={venue.id} venue={venue} notify={notify} />}
          {role === "owner" && screen === "payments" && <PaymentsScreen notify={notify} />}
          {role === "owner" && screen === "subscription" && <SubscriptionScreen venueCount={venues.length} notify={notify} />}

          {role === "customer" && screen === "discover" && <DiscoverScreen onVenue={() => navigate("browse-menu")} />}
          {role === "customer" && screen === "browse-menu" && <CustomerMenu cart={cart} onAdd={addItem} onCart={() => navigate("checkout")} />}
          {role === "customer" && screen === "checkout" && <Checkout cart={cart} total={cartTotal} updateQty={updateQty} onBack={() => navigate("browse-menu")} onDone={() => { setCart({}); navigate("history"); notify("Заказ #1049 принят"); }} />}
          {role === "customer" && screen === "reservation" && <ReservationScreen onMenu={() => navigate("browse-menu")} notify={notify} />}
          {role === "customer" && screen === "history" && <HistoryScreen notify={notify} />}
          {role === "customer" && screen === "profile" && <ProfileScreen notify={notify} onLogout={() => router.push("/login")} />}

          {role === "staff" && screen === "service" && <ServiceBoard notify={notify} />}
          {role === "staff" && screen === "kitchen" && <KitchenScreen notify={notify} />}
          {role === "staff" && screen === "staff-floor" && <FloorPlan mode="staff" venueName={venue.name} notify={notify} />}
          {role !== "customer" && screen === "account" && <AccountScreen notify={notify} onLogout={() => router.push("/login")} />}
        </div>
      </main>
      <MobileBottomNavigation role={role} screen={screen} navigation={navigation} onNavigate={navigate} />
      {toast && <div className="toast"><CheckCircle2 size={18} />{toast}</div>}
      {modal && <Modal type={modal} onClose={() => setModal(null)} notify={(message) => { setModal(null); notify(message); }} />}
    </div>
  );
}

function Sidebar({ role, screen, navigation, venue, venues: availableVenues, mobileNav, onNavigate, onRole, onVenue, onClose }: { role: Role; screen: string; navigation: { id: string; label: string; icon: LucideIcon; count?: number }[]; venue: Venue; venues: Venue[]; mobileNav: boolean; onNavigate: (id: string) => void; onRole: (role: Role) => void; onVenue: (venue: Venue) => void; onClose: () => void }) {
  const [roleMenuOpen, setRoleMenuOpen] = useState(false);
  const [venueMenuOpen, setVenueMenuOpen] = useState(false);
  const roleMeta = role === "owner" ? { label: "Владелец", detail: "Управление заведением", icon: Store } : role === "staff" ? { label: "Сотрудник", detail: "Рабочая смена", icon: BadgeCheck } : { label: "Гость", detail: "Личный аккаунт Pocket", icon: UserRound };
  const CurrentRoleIcon = roleMeta.icon;
  const selectRole = (nextRole: Role) => {
    onRole(nextRole);
    setRoleMenuOpen(false);
  };
  return (
    <aside className={`sidebar ${mobileNav ? "open" : ""}`}>
      <div className="brand-row"><div className="brand-mark"><Image src="/logo.svg" alt="" width={28} height={28} priority /></div><strong>Pocket</strong><IconButton icon={X} label="Закрыть меню" onClick={onClose} /></div>
      {role === "customer" ? <div className="venue-switcher personal-context"><span className="venue-avatar">P</span><div><strong>Все заведения</strong><small>Аккаунт Pocket</small></div><Search size={16} /></div> : role === "owner" ? <div className="venue-menu"><button className="venue-switcher" onClick={() => setVenueMenuOpen((open) => !open)} aria-expanded={venueMenuOpen}><span className="venue-avatar">{venue.initials}</span><div><strong>{venue.name}</strong><small>{venue.location}</small></div><ChevronDown size={16} /></button>{venueMenuOpen && <div className="venue-menu-popover">{availableVenues.map((item) => <button key={item.id} className={item.id === venue.id ? "active" : ""} onClick={() => { onVenue(item); setVenueMenuOpen(false); }}><span className="venue-avatar">{item.initials}</span><span><strong>{item.name}</strong><small>{item.location}</small></span>{item.id === venue.id && <Check size={16} />}</button>)}</div>}</div> : <div className="venue-switcher personal-context"><span className="venue-avatar">{venue.initials}</span><div><strong>{venue.name}</strong><small>Рабочая смена</small></div><BadgeCheck size={16} /></div>}
      <nav className="side-nav">
        <p className="nav-label">Рабочее пространство</p>
        {navigation.map(({ id, label, icon: Icon, count }) => <button key={id} className={`${screen === id ? "active" : ""} ${mobilePrimaryNavigation[role].includes(id) ? "mobile-primary-link" : ""}`} onClick={() => onNavigate(id)}><Icon size={18} /><span>{label}</span>{count && <b>{count}</b>}</button>)}
      </nav>
      <div className="sidebar-bottom">
        <p className="nav-label">Текущая роль</p>
        <div className="role-menu">
          <button className="role-menu-trigger" onClick={() => setRoleMenuOpen((open) => !open)} aria-expanded={roleMenuOpen}><span><CurrentRoleIcon size={17} /></span><div><strong>{roleMeta.label}</strong><small>{roleMeta.detail}</small></div><ChevronDown size={16} /></button>
          {roleMenuOpen && <div className="role-menu-popover">
            <button className={role === "owner" ? "active" : ""} onClick={() => selectRole("owner")}><Store size={17} /><span><strong>Владелец</strong><small>Управление заведением</small></span>{role === "owner" && <Check size={16} />}</button>
            <button className={role === "staff" ? "active" : ""} onClick={() => selectRole("staff")}><BadgeCheck size={17} /><span><strong>Сотрудник</strong><small>Рабочая смена</small></span>{role === "staff" && <Check size={16} />}</button>
            <button className={role === "customer" ? "active" : ""} onClick={() => selectRole("customer")}><UserRound size={17} /><span><strong>Гость</strong><small>Личный аккаунт Pocket</small></span>{role === "customer" && <Check size={16} />}</button>
          </div>}
        </div>
        <button className={`user-chip ${screen === (role === "customer" ? "profile" : "account") ? "active" : ""}`} onClick={() => onNavigate(role === "customer" ? "profile" : "account")}><span>DI</span><div><strong>Денис Иткин</strong><small>Управление аккаунтом</small></div><Settings size={17} /></button>
      </div>
    </aside>
  );
}

function MobileBottomNavigation({ role, screen, navigation, onNavigate }: { role: Role; screen: string; navigation: { id: string; label: string; icon: LucideIcon }[]; onNavigate: (id: string) => void }) {
  const primaryItems = navigation.filter((item) => mobilePrimaryNavigation[role].includes(item.id));
  return <nav className="mobile-bottom-nav" aria-label="Основная навигация">
    {primaryItems.map(({ id, label, icon: Icon }) => <button key={id} className={screen === id ? "active" : ""} onClick={() => onNavigate(id)}><Icon size={21} strokeWidth={screen === id ? 2.3 : 1.9} /><span>{label === "План зала" ? "Зал" : label === "Мои заказы" ? "Заказы" : label}</span></button>)}
  </nav>;
}

function Topbar({ role, screen, navigation, venueName, cartCount, onMenu, onCart }: { role: Role; screen: string; navigation: { id: string; label: string }[]; venueName: string; cartCount: number; onMenu: () => void; onCart: () => void }) {
  const title = screen === "checkout" ? "Оформление заказа" : screen === "account" ? "Аккаунт" : navigation.find((item) => item.id === screen)?.label || "Pocket";
  return <header className="topbar"><div className="topbar-title"><IconButton icon={MenuIcon} label="Открыть меню" onClick={onMenu} /><div><small>{role === "owner" ? `${venueName} / Управление` : role === "staff" ? `${venueName} / Смена` : "Сегодня в Братиславе"}</small><strong>{title}</strong></div></div><div className="topbar-actions">{role === "customer" && <button className="cart-button" onClick={onCart}><ShoppingBag size={18} /><span>Корзина</span>{cartCount > 0 && <b>{cartCount}</b>}</button>}<IconButton icon={Search} label="Поиск" /><IconButton icon={Bell} label="Уведомления" active /></div></header>;
}

function PageHeader({ eyebrow, title, subtitle, actions }: { eyebrow?: string; title: string; subtitle?: string; actions?: ReactNode }) {
  return <div className="page-header"><div>{eyebrow && <p className="eyebrow">{eyebrow}</p>}<h1>{title}</h1>{subtitle && <p>{subtitle}</p>}</div>{actions && <div className="header-actions">{actions}</div>}</div>;
}

function OwnerOverview({ onNavigate, onOrder }: { onNavigate: (screen: string) => void; onOrder: () => void }) {
  return <>
    <PageHeader eyebrow="Воскресенье, 19 июля" title="Добрый день, Денис" subtitle="Зал открыт. Сейчас 7 активных столов и 3 онлайн-заказа." actions={<Button icon={Download} kind="secondary">Отчет</Button>} />
    <section className="metric-grid">
      <Metric label="Выручка сегодня" value="€2,846" change="+12.4%" icon={CircleDollarSign} tone="coral" />
      <Metric label="Заказы" value="84" change="+8 сегодня" icon={ShoppingBag} tone="green" />
      <Metric label="Средний чек" value="€33.88" change="+€2.14" icon={ReceiptText} tone="blue" />
      <Metric label="Загрузка зала" value="68%" change="12 из 18" icon={Table2} tone="gold" />
    </section>
    <section className="dashboard-grid">
      <div className="panel revenue-panel"><PanelTitle title="Выручка" subtitle="Последние 7 дней" action={<button className="text-button">Эта неделя <ChevronDown size={14} /></button>} /><RevenueChart /><div className="chart-legend"><span><i className="legend-current" />Эта неделя €15,280</span><span><i className="legend-past" />Прошлая €13,490</span></div></div>
      <div className="panel channel-panel"><PanelTitle title="Каналы продаж" subtitle="Сегодня" /><div className="donut-wrap"><div className="donut"><span><strong>84</strong><small>заказа</small></span></div><div className="donut-legend"><p><i className="dine" /><span>В зале</span><strong>61%</strong></p><p><i className="online" /><span>Онлайн</span><strong>27%</strong></p><p><i className="pickup" /><span>Самовывоз</span><strong>12%</strong></p></div></div></div>
    </section>
    <section className="panel orders-panel"><PanelTitle title="Текущие заказы" subtitle="Обновлено только что" action={<Button kind="quiet" onClick={() => onNavigate("orders")}>Все заказы <ArrowRight size={16} /></Button>} /><OrderTable orders={liveOrders.slice(0, 4)} onOrder={onOrder} /></section>
  </>;
}

function Metric({ label, value, change, icon: Icon, tone }: { label: string; value: string; change: string; icon: LucideIcon; tone: string }) {
  return <div className="metric"><div className={`metric-icon ${tone}`}><Icon size={19} /></div><p>{label}</p><strong>{value}</strong><span><TrendingUp size={14} />{change}</span></div>;
}

function PanelTitle({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return <div className="panel-title"><div><h2>{title}</h2>{subtitle && <p>{subtitle}</p>}</div>{action}</div>;
}

function RevenueChart() {
  const bars = [48, 64, 51, 78, 68, 88, 74];
  return <div className="bar-chart"><div className="axis-labels"><span>€3k</span><span>€2k</span><span>€1k</span><span>€0</span></div><div className="bars">{bars.map((height, index) => <div className="bar-column" key={index}><div className="bar-ghost" style={{ height: `${Math.max(30, height - 18)}%` }} /><div className="bar-current" style={{ height: `${height}%` }} /><span>{["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"][index]}</span></div>)}</div></div>;
}

function OrderTable({ orders, onOrder }: { orders: typeof liveOrders; onOrder?: () => void }) {
  return <div className="table-wrap"><table><thead><tr><th>Заказ</th><th>Источник</th><th>Гость</th><th>Сумма</th><th>Статус</th><th>Время</th><th /></tr></thead><tbody>{orders.map((order) => <tr key={order.id} onClick={onOrder}><td><strong>{order.id}</strong></td><td>{order.source}</td><td>{order.guest}</td><td><strong>{money(order.total)}</strong></td><td><StatusPill status={order.status} /></td><td className="muted-cell">{order.time}</td><td><IconButton icon={ChevronRight} label="Открыть заказ" /></td></tr>)}</tbody></table></div>;
}

function OrdersScreen({ onOrder }: { onOrder: () => void }) {
  const [filter, setFilter] = useState("Все");
  const filtered = filter === "Все" ? liveOrders : liveOrders.filter((order) => order.status === filter);
  return <><PageHeader title="Заказы" subtitle="Все заказы из зала, сайта и самовывоза." /><div className="toolbar"><div className="segmented">{["Все", "Новый", "Готовится", "Готов", "Подан"].map((item) => <button key={item} onClick={() => setFilter(item)} className={filter === item ? "active" : ""}>{item}{item === "Новый" && <b>1</b>}</button>)}</div><div className="toolbar-actions"><label className="search-field"><Search size={17} /><input placeholder="Номер или гость" /></label><IconButton icon={ListFilter} label="Фильтр" /></div></div><div className="panel"><OrderTable orders={filtered} onOrder={onOrder} />{filtered.length === 0 && <EmptyIllustration icon={ReceiptText} title="Таких заказов пока нет" text="Новые заказы появятся здесь автоматически." />}</div></>;
}

function MenuManager({ venueName, onAdd, notify }: { venueName: string; onAdd: () => void; notify: (message: string) => void }) {
  const [category, setCategory] = useState("Все позиции");
  const [categories, setCategories] = useState(["Все позиции", "Закуски", "Паста", "Основное", "Десерты", "Напитки"]);
  const [categoryDraft, setCategoryDraft] = useState("");
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [createMenuOpen, setCreateMenuOpen] = useState(false);
  const [view, setView] = useState<"grid" | "list">("grid");
  const [previewOpen, setPreviewOpen] = useState(false);
  const [actionsItem, setActionsItem] = useState<number | null>(null);
  const visible = category === "Все позиции" ? menuItems : menuItems.filter((item) => item.category === category);
  const positionWord = visible.length % 10 === 1 && visible.length % 100 !== 11 ? "позиция" : visible.length % 10 >= 2 && visible.length % 10 <= 4 && (visible.length % 100 < 12 || visible.length % 100 > 14) ? "позиции" : "позиций";
  const counts: Record<string, number> = { "Все позиции": 32, "Закуски": 5, "Паста": 6, "Основное": 9, "Десерты": 5, "Напитки": 7 };
  const addCategory = () => {
    const nextCategory = categoryDraft.trim();
    if (!nextCategory || categories.includes(nextCategory)) return;
    setCategories((current) => [...current, nextCategory]);
    setCategory(nextCategory);
    setCategoryDraft("");
    setCategoryDialogOpen(false);
    notify("Категория добавлена");
  };
  const runAction = (message: string) => {
    setActionsItem(null);
    notify(message);
  };
  const addMenuItem = () => {
    setCreateMenuOpen(false);
    onAdd();
  };
  const openCategoryDialog = () => {
    setCreateMenuOpen(false);
    setCategoryDialogOpen(true);
  };
  const pageActions = <><Button kind="secondary" icon={Eye} onClick={() => setPreviewOpen(true)}>Предпросмотр</Button><div className="menu-create-menu"><Button icon={Plus} onClick={() => setCreateMenuOpen((open) => !open)}>Добавить <ChevronDown size={15} /></Button>{createMenuOpen && <div className="menu-create-popover"><button onClick={addMenuItem}><Utensils size={17} /><span><strong>Позицию</strong><small>Новое блюдо или напиток</small></span></button><button onClick={openCategoryDialog}><Rows3 size={17} /><span><strong>Категорию</strong><small>Новый раздел меню</small></span></button></div>}</div></>;

  return <>
    <PageHeader title="Меню" subtitle="Управляйте категориями, ценами и доступностью блюд." actions={pageActions} />
    <div className="menu-layout">
      <aside className="category-list">
        <div className="category-heading"><strong>Категории</strong><IconButton icon={Plus} label="Добавить категорию" onClick={() => setCategoryDialogOpen(true)} /></div>
        {categories.map((item) => <button className={category === item ? "active" : ""} key={item} onClick={() => setCategory(item)}><span>{item}</span><b>{counts[item] ?? 0}</b></button>)}
      </aside>
      <section className="menu-items-section">
        <div className="list-toolbar menu-list-toolbar"><label className="mobile-category-select"><span>Категория</span><select value={category} onChange={(event) => setCategory(event.target.value)}>{categories.map((item) => <option key={item}>{item}</option>)}</select><ChevronDown size={16} /></label><p><strong>{visible.length}</strong> {positionWord}</p><div><label className="search-field"><Search size={17} /><input placeholder="Найти блюдо" /></label></div></div>
        <div className="menu-view-row"><span>Вид меню</span><div className="view-toggle" aria-label="Вид меню"><IconButton icon={LayoutGrid} label="Показать сеткой" active={view === "grid"} onClick={() => setView("grid")} /><IconButton icon={Rows3} label="Показать списком" active={view === "list"} onClick={() => setView("list")} /></div></div>
        <div className={`manager-grid view-${view}`}>{visible.map((item) => <article className="manager-item" key={item.id}><FoodImage item={item} />{item.popular && <span className="menu-status"><Sparkles size={12} />Хит</span>}<div className="manager-copy"><div><small>{item.category}</small></div><h3>{item.name}</h3><p>{item.description}</p><footer><strong>{money(item.price)}</strong><label className="switch"><input type="checkbox" defaultChecked onChange={() => notify("Доступность обновлена")} /><span /></label><IconButton icon={Pencil} label="Редактировать" onClick={onAdd} /><IconButton icon={Ellipsis} label="Действия с позицией" active={actionsItem === item.id} onClick={() => setActionsItem((current) => current === item.id ? null : item.id)} /></footer>{actionsItem === item.id && <div className="item-actions-menu"><button onClick={() => { setActionsItem(null); onAdd(); }}><Pencil size={16} />Редактировать</button><button onClick={() => runAction(`${item.name}: копия создана`)}><Copy size={16} />Дублировать</button><button onClick={() => runAction(`${item.name}: выберите новую категорию`)}><ArrowUpDown size={16} />Переместить в категорию</button><button onClick={() => runAction(`${item.name}: скрыто из меню`)}><EyeOff size={16} />Скрыть из меню</button><button className="danger" onClick={() => runAction(`${item.name}: удалено`)}><Trash2 size={16} />Удалить</button></div>}</div></article>)}</div>
      </section>
    </div>
    <div className={`mobile-create-fab ${createMenuOpen ? "open" : ""}`}>
      {createMenuOpen && <div className="mobile-create-popover"><button onClick={addMenuItem}><Utensils size={20} /><span><strong>Добавить позицию</strong><small>Новое блюдо или напиток</small></span></button><button onClick={openCategoryDialog}><Rows3 size={20} /><span><strong>Добавить категорию</strong><small>Новый раздел меню</small></span></button></div>}
      <button className="mobile-create-trigger" aria-label={createMenuOpen ? "Закрыть меню создания" : "Открыть меню создания"} onClick={() => setCreateMenuOpen((open) => !open)}>{createMenuOpen ? <X size={27} /> : <Pencil size={24} fill="currentColor" />}</button>
    </div>
    {categoryDialogOpen && <CategoryDialog value={categoryDraft} onChange={setCategoryDraft} onSubmit={addCategory} onClose={() => { setCategoryDialogOpen(false); setCategoryDraft(""); }} />}
    {previewOpen && <MenuPreview venueName={venueName} onClose={() => setPreviewOpen(false)} />}
  </>;
}

function CategoryDialog({ value, onChange, onSubmit, onClose }: { value: string; onChange: (value: string) => void; onSubmit: () => void; onClose: () => void }) {
  return <div className="modal-backdrop" onMouseDown={onClose}><section className="modal category-dialog" onMouseDown={(event) => event.stopPropagation()}><header><div><h2>Новая категория</h2><p>Добавьте понятное название для раздела меню.</p></div><IconButton icon={X} label="Закрыть" onClick={onClose} /></header><div className="modal-body"><Field label="Название категории"><input autoFocus value={value} onChange={(event) => onChange(event.target.value)} onKeyDown={(event) => event.key === "Enter" && onSubmit()} placeholder="Например, Завтраки" /></Field></div><footer><Button kind="secondary" onClick={onClose}>Отмена</Button><Button icon={Plus} disabled={!value.trim()} onClick={onSubmit}>Создать категорию</Button></footer></section></div>;
}

function MenuPreview({ venueName, onClose }: { venueName: string; onClose: () => void }) {
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");
  return <div className="preview-backdrop" onMouseDown={onClose}><section className="menu-preview-modal" onMouseDown={(event) => event.stopPropagation()}><header><div><p className="eyebrow">ПУБЛИЧНОЕ МЕНЮ</p><h2>Предпросмотр {venueName}</h2></div><div className="preview-actions"><div className="view-toggle"><IconButton icon={LayoutGrid} label="Широкий экран" active={device === "desktop"} onClick={() => setDevice("desktop")} /><IconButton icon={UserRound} label="Мобильный экран" active={device === "mobile"} onClick={() => setDevice("mobile")} /></div><IconButton icon={X} label="Закрыть предпросмотр" onClick={onClose} /></div></header><div className="preview-stage"><div className={`preview-device ${device}`}><div className="preview-cover" /><div className="preview-venue"><span>Открыто до 22:30</span><h3>{venueName}</h3><p>Современная европейская · €€</p></div><div className="preview-tabs"><b>Все</b><span>Закуски</span><span>Основное</span><span>Десерты</span></div><div className="preview-menu-grid">{menuItems.slice(0, device === "mobile" ? 2 : 3).map((item) => <article key={item.id}><FoodImage item={item} />{item.popular && <span>Хит</span>}<div><small>{item.category}</small><strong>{item.name}</strong><b>{money(item.price)}</b></div></article>)}</div></div></div><footer><p>Так меню увидят гости по ссылке и QR-коду стола.</p><Button kind="secondary" onClick={onClose}>Закрыть</Button></footer></section></div>;
}

const tables = [
  { id: "01", seats: 2, x: 8, y: 12, state: "free" }, { id: "02", seats: 2, x: 33, y: 12, state: "busy" }, { id: "03", seats: 4, x: 61, y: 10, state: "busy" },
  { id: "04", seats: 4, x: 9, y: 42, state: "reserved" }, { id: "05", seats: 6, x: 37, y: 43, state: "free" }, { id: "06", seats: 2, x: 76, y: 45, state: "busy" },
  { id: "07", seats: 4, x: 11, y: 74, state: "free" }, { id: "08", seats: 6, x: 42, y: 72, state: "busy" }, { id: "09", seats: 2, x: 78, y: 76, state: "reserved" },
];

function FloorPlan({ mode, venueName, notify }: { mode: "owner" | "staff"; venueName: string; notify: (message: string) => void }) {
  const [selected, setSelected] = useState(tables[7]);
  const [showQrCodes, setShowQrCodes] = useState(false);
  return <>
    <PageHeader title={mode === "owner" ? "План зала" : "Столы"} subtitle={mode === "owner" ? "Настройте расположение столов и отслеживайте загрузку." : "Состояние зала и ваши назначенные столы."} actions={mode === "owner" ? <><Button kind="secondary" icon={QrCode} onClick={() => setShowQrCodes(true)}>QR-коды</Button><Button icon={Plus} onClick={() => notify("Новый стол добавлен")}>Добавить стол</Button></> : <Button icon={Plus}>Открыть счет</Button>} />
    <div className="floor-layout">
      <section className="panel floor-panel">
        <div className="floor-toolbar"><div className="floor-legend"><span><i className="free" />Свободен</span><span><i className="busy" />Занят</span><span><i className="reserved" />Бронь</span></div><div><IconButton icon={Minus} label="Уменьшить" /><span className="zoom-label">100%</span><IconButton icon={Plus} label="Увеличить" /></div></div>
        <div className="floor-canvas"><div className="bar-zone">БАР</div><div className="window-zone">ОКНА</div>{tables.map((table) => <button key={table.id} className={`floor-table ${table.state} ${selected.id === table.id ? "selected" : ""} ${table.seats >= 6 ? "wide" : ""}`} style={{ left: `${table.x}%`, top: `${table.y}%` }} onClick={() => setSelected(table)}><strong>{table.id}</strong><span>{table.seats} места</span></button>)}</div>
      </section>
      <aside className="panel table-detail"><div className="detail-heading"><div><small>СТОЛ</small><h2>{selected.id}</h2></div><IconButton icon={Ellipsis} label="Действия" /></div><StatusPill status={selected.state === "busy" ? "Занят" : selected.state === "reserved" ? "Бронь" : "Свободен"} /><dl><div><dt>Мест</dt><dd>{selected.seats}</dd></div><div><dt>Официант</dt><dd>София М.</dd></div><div><dt>Текущий счет</dt><dd>{selected.state === "busy" ? "€76.50" : "—"}</dd></div><div><dt>Открыт</dt><dd>{selected.state === "busy" ? "38 мин" : "—"}</dd></div></dl>{selected.state === "busy" ? <><div className="mini-order"><p><span>Тальятелле</span><b>2</b></p><p><span>Буррата</span><b>1</b></p><p><span>Красный апельсин</span><b>3</b></p></div><Button className="full" onClick={() => notify("Счет стола открыт")}>Открыть счет</Button></> : <Button className="full" icon={Plus} onClick={() => notify("Счет создан")}>Открыть новый счет</Button>}<Button className="full" kind="quiet" icon={UserRound}>Назначить официанта</Button></aside>
    </div>
    {showQrCodes && <QrCodesDialog venueName={venueName} onClose={() => setShowQrCodes(false)} notify={notify} />}
  </>;
}

function QrCodesDialog({ venueName, onClose, notify }: { venueName: string; onClose: () => void; notify: (message: string) => void }) {
  const [versions, setVersions] = useState<Record<string, number>>({});
  const venueSlug = venues.find((item) => item.name === venueName)?.id ?? "venue";
  const regenerate = (tableId: string) => {
    setVersions((current) => ({ ...current, [tableId]: (current[tableId] ?? 1) + 1 }));
    notify(`QR-код стола ${tableId} перегенерирован`);
  };
  return <div className="preview-backdrop" onMouseDown={onClose}><section className="qr-dialog" onMouseDown={(event) => event.stopPropagation()}><header><div><p className="eyebrow">QR-КОДЫ СТОЛОВ</p><h2>{venueName}</h2><p>После сканирования гость увидит меню, а заказ и счет автоматически привяжутся к выбранному столу. Перегенерация отключает прежний код.</p></div><IconButton icon={X} label="Закрыть QR-коды" onClick={onClose} /></header><div className="qr-grid">{tables.map((table) => { const version = versions[table.id] ?? 1; return <article key={table.id}><div className="qr-symbol"><QrCode size={72} strokeWidth={1.4} /></div><div><strong>Стол {table.id}</strong><span>{table.seats} места · версия {version}</span><small>pocket.app/{venueSlug}/t/{table.id}?v={version}</small></div><div className="qr-card-actions"><IconButton icon={RefreshCw} label={`Перегенерировать QR-код стола ${table.id}`} onClick={() => regenerate(table.id)} /><IconButton icon={Download} label={`Скачать QR-код стола ${table.id}`} onClick={() => notify(`QR-код стола ${table.id} скачан`)} /></div></article>; })}</div><footer><p>Напечатайте коды и разместите их на соответствующих столах.</p><div><Button kind="secondary" onClick={onClose}>Закрыть</Button><Button icon={Download} onClick={() => notify("Архив QR-кодов подготовлен")}>Скачать все</Button></div></footer></section></div>;
}

function TeamScreen({ onInvite, notify }: { onInvite: () => void; notify: (message: string) => void }) {
  const staff = [
    { initials: "SM", name: "София Марек", email: "sofia@northvine.sk", role: "Официант", status: "На смене", color: "coral" },
    { initials: "AK", name: "Адам Ковач", email: "adam@northvine.sk", role: "Менеджер", status: "На смене", color: "green" },
    { initials: "LN", name: "Лукас Новак", email: "lukas@northvine.sk", role: "Кухня", status: "Не на смене", color: "blue" },
    { initials: "EV", name: "Эма Вarga", email: "ema@northvine.sk", role: "Официант", status: "Приглашен", color: "gold" },
  ];
  return <><PageHeader title="Команда" subtitle="Сотрудники, роли и доступ к рабочему пространству." actions={<Button icon={Plus} onClick={onInvite}>Пригласить сотрудника</Button>} /><section className="panel team-panel"><div className="list-toolbar"><p><strong>4</strong> сотрудника</p><label className="search-field"><Search size={17} /><input placeholder="Поиск по команде" /></label></div><div className="team-list">{staff.map((person) => <div className="team-row" key={person.email}><span className={`person-avatar ${person.color}`}>{person.initials}</span><div className="person-copy"><strong>{person.name}</strong><small>{person.email}</small></div><select defaultValue={person.role} onChange={() => notify("Роль сотрудника обновлена")}><option>Менеджер</option><option>Официант</option><option>Кухня</option><option>Только просмотр</option></select><StatusPill status={person.status} /><IconButton icon={Ellipsis} label="Действия" /></div>)}</div></section></>;
}

function AnalyticsScreen() {
  const popular = menuItems.slice(0, 5);
  return <><PageHeader title="Аналитика" subtitle="Продажи, загрузка и предпочтения гостей." actions={<><Button kind="secondary" icon={CalendarDays}>1–19 июля</Button><Button kind="secondary" icon={Download}>Экспорт</Button></>} /><section className="metric-grid"><Metric label="Чистая выручка" value="€42,680" change="+14.2%" icon={CircleDollarSign} tone="coral" /><Metric label="Заказов" value="1,284" change="+9.8%" icon={ReceiptText} tone="green" /><Metric label="Средний чек" value="€33.24" change="+4.1%" icon={TrendingUp} tone="blue" /><Metric label="Новых гостей" value="318" change="+18.6%" icon={Users} tone="gold" /></section><section className="analytics-grid"><div className="panel analytics-revenue"><PanelTitle title="Динамика выручки" subtitle="Июль 2026" action={<div className="segmented tiny"><button className="active">День</button><button>Неделя</button></div>} /><AreaChart /></div><div className="panel"><PanelTitle title="Загрузка по времени" subtitle="Средняя за неделю" /><HeatMap /></div><div className="panel popular-list"><PanelTitle title="Популярные позиции" subtitle="По количеству продаж" />{popular.map((item, index) => <div key={item.id}><span>{index + 1}</span><FoodImage item={item} /><p><strong>{item.name}</strong><small>{[184, 156, 142, 121, 98][index]} продано</small></p><b>{money([3404, 3744, 1917, 2057, 833][index])}</b></div>)}</div><div className="panel reviews-panel"><PanelTitle title="Отзывы гостей" subtitle="Последние 30 дней" /><div className="rating-main"><strong>4.8</strong><div><div className="stars">★★★★★</div><small>На основе 128 отзывов</small></div></div>{[5, 4, 3, 2, 1].map((value, index) => <div className="rating-row" key={value}><span>{value}</span><Star size={12} /><i><b style={{ width: `${[82, 14, 3, 1, 0][index]}%` }} /></i><small>{[105, 18, 4, 1, 0][index]}</small></div>)}</div></section></>;
}

function AreaChart() {
  const values = [38, 44, 36, 57, 52, 64, 61, 75, 68, 86, 78, 92, 88, 98];
  return <div className="area-chart"><div className="area-grid"><i /><i /><i /><i /></div><div className="area-columns">{values.map((v, i) => <span key={i} style={{ height: `${v}%` }} />)}</div><div className="area-labels"><span>1 июл</span><span>7 июл</span><span>13 июл</span><span>19 июл</span></div></div>;
}

function HeatMap() {
  const values = [1,1,2,3,4,3, 1,2,2,4,4,3, 1,2,3,4,5,4, 1,2,3,5,5,4, 1,1,2,4,5,3, 1,2,3,4,4,2, 1,1,2,3,4,2];
  return <div className="heatmap"><div className="heat-times"><span>12:00</span><span>14:00</span><span>16:00</span><span>18:00</span><span>20:00</span><span>22:00</span></div><div className="heat-grid">{values.map((v, i) => <i className={`heat-${v}`} key={i} />)}</div><div className="heat-days">{["Пн","Вт","Ср","Чт","Пт","Сб","Вс"].map((d) => <span key={d}>{d}</span>)}</div></div>;
}

const venueReviews = [
  { id: 1, guest: "Анна Ковач", initials: "АК", rating: 5, table: "08", order: "#1048", date: "Сегодня, 15:12", text: "Очень внимательный сервис и отличная паста. Отдельное спасибо Софии за рекомендацию вина.", items: "Тальятелле, буррата, красный апельсин" },
  { id: 2, guest: "Мартин Горак", initials: "МГ", rating: 4, table: "03", order: "#1046", date: "Сегодня, 14:08", text: "Все было вкусно, но основное блюдо пришлось ждать немного дольше, чем ожидали.", items: "Сибас на гриле, тирамису" },
  { id: 3, guest: "Елена Новак", initials: "ЕН", rating: 2, table: "12", order: "#1039", date: "Вчера, 21:44", text: "В зале было шумно, а счет принесли только после повторной просьбы. Еда хорошая, сервис стоит улучшить.", items: "Куриный шницель, напитки" },
  { id: 4, guest: "Лукаш Белик", initials: "ЛБ", rating: 5, table: "08", order: "#1037", date: "Вчера, 20:16", text: "Любимый стол у окна и стабильно прекрасный ужин. Вернемся снова.", items: "Буррата, сибас, тирамису" },
  { id: 5, guest: "Сара Миклова", initials: "СМ", rating: 3, table: "02", order: "#1031", date: "18 июля, 19:32", text: "Красивое место и приятная команда. Хотелось бы больше безлактозных десертов.", items: "Паста, красный апельсин" },
  { id: 6, guest: "Петер Варга", initials: "ПВ", rating: 5, table: "06", order: "#1028", date: "18 июля, 18:45", text: "Быстро заказали по QR-коду, разделили счет и оставили чаевые без ожидания официанта.", items: "Шницель, буррата, напитки" },
];

function ReviewsScreen({ notify }: { notify: (message: string) => void }) {
  const [tableFilter, setTableFilter] = useState("all");
  const [ratingFilter, setRatingFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [replying, setReplying] = useState<number | null>(null);
  const [replyDraft, setReplyDraft] = useState("");
  const [replies, setReplies] = useState<Record<number, string>>({ 4: "Спасибо, Лукаш! Будем рады видеть вас снова за столом 08." });
  const tables = [...new Set(venueReviews.map((review) => review.table))].sort();
  const filteredReviews = venueReviews.filter((review) => {
    const matchesTable = tableFilter === "all" || review.table === tableFilter;
    const matchesRating = ratingFilter === "all" || (ratingFilter === "low" ? review.rating <= 3 : review.rating === Number(ratingFilter));
    const searchable = `${review.guest} ${review.order} ${review.text}`.toLowerCase();
    return matchesTable && matchesRating && searchable.includes(query.trim().toLowerCase());
  });
  const startReply = (reviewId: number) => {
    setReplying(reviewId);
    setReplyDraft(replies[reviewId] ?? "");
  };
  const publishReply = (reviewId: number) => {
    if (!replyDraft.trim()) return;
    setReplies((current) => ({ ...current, [reviewId]: replyDraft.trim() }));
    setReplying(null);
    setReplyDraft("");
    notify("Ответ на отзыв опубликован");
  };
  return <><PageHeader title="Отзывы" subtitle="Обратная связь гостей по залу, столам и заказам." actions={<Button kind="secondary" icon={Download}>Экспорт отзывов</Button>} /><section className="reviews-overview"><div className="panel review-score"><span>Средняя оценка</span><strong>4.8</strong><div className="review-stars">{[1,2,3,4,5].map((star) => <Star key={star} size={16} fill="currentColor" />)}</div><small>128 отзывов за 30 дней</small></div><div className="panel review-stat"><span><MessageSquareText size={19} /></span><div><small>Новых отзывов</small><strong>18</strong><p>+12% к прошлому месяцу</p></div></div><div className="panel review-stat"><span><Clock3 size={19} /></span><div><small>Среднее время ответа</small><strong>2 ч 14 мин</strong><p>Ответ опубликован на 92%</p></div></div></section><section className="reviews-toolbar"><div className="segmented review-rating-filter">{[["all","Все"],["5","5 звезд"],["4","4 звезды"],["low","3 и ниже"]].map(([value,label]) => <button key={value} className={ratingFilter === value ? "active" : ""} onClick={() => setRatingFilter(value)}>{label}</button>)}</div><div className="reviews-toolbar-actions"><label className="review-table-filter"><Table2 size={17} /><select value={tableFilter} onChange={(event) => setTableFilter(event.target.value)} aria-label="Фильтр по столу"><option value="all">Все столы</option>{tables.map((table) => <option value={table} key={table}>Стол {table}</option>)}</select><ChevronDown size={15} /></label><label className="search-field"><Search size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Гость, заказ или текст" /></label></div></section><div className="reviews-list"><div className="reviews-list-heading"><p><strong>{filteredReviews.length}</strong> отзывов</p><span>Сначала новые <ChevronDown size={14} /></span></div>{filteredReviews.map((review) => <article className="panel review-card" key={review.id}><header><span className="review-avatar">{review.initials}</span><div><strong>{review.guest}</strong><small>{review.date} · Заказ {review.order}</small></div><div className="review-stars" aria-label={`${review.rating} из 5`}>{[1,2,3,4,5].map((star) => <Star key={star} size={15} fill={star <= review.rating ? "currentColor" : "none"} />)}</div><span className="review-table"><Table2 size={14} />Стол {review.table}</span><IconButton icon={Ellipsis} label="Действия с отзывом" /></header><p className="review-text">{review.text}</p><div className="review-order"><ReceiptText size={15} /><span>{review.items}</span><button onClick={() => notify(`Заказ ${review.order} открыт`)}>Открыть заказ</button></div>{replies[review.id] && replying !== review.id && <div className="owner-review-reply"><span>DI</span><div><strong>Ответ заведения</strong><p>{replies[review.id]}</p></div></div>}{replying === review.id ? <div className="review-reply-editor"><textarea autoFocus value={replyDraft} onChange={(event) => setReplyDraft(event.target.value)} placeholder="Напишите ответ гостю" /><div><Button kind="secondary" onClick={() => { setReplying(null); setReplyDraft(""); }}>Отмена</Button><Button icon={Send} disabled={!replyDraft.trim()} onClick={() => publishReply(review.id)}>Опубликовать</Button></div></div> : <footer><Button kind="quiet" icon={MessageSquareText} onClick={() => startReply(review.id)}>{replies[review.id] ? "Изменить ответ" : "Ответить"}</Button></footer>}</article>)}{filteredReviews.length === 0 && <div className="panel"><EmptyIllustration icon={MessageSquareText} title="Отзывы не найдены" text="Измените фильтр по столу, оценке или поисковый запрос." /></div>}</div></>;
}

function VenueScreen({ venue, notify }: { venue: Venue; notify: (message: string) => void }) {
  const [tab, setTab] = useState("Основное");
  return <><PageHeader title={venue.name} subtitle="Публичная информация, расписание и настройки сервиса." actions={<Button icon={Check} onClick={() => notify("Изменения сохранены")}>Сохранить</Button>} /><div className="settings-layout"><aside className="settings-nav">{["Основное", "Расписание", "Заказы", "Уведомления"].map((item) => <button className={tab === item ? "active" : ""} key={item} onClick={() => setTab(item)}>{item}</button>)}</aside><section className="panel settings-form">{tab === "Основное" ? <><PanelTitle title="Профиль заведения" subtitle="Эти данные видят ваши гости." /><div className="cover-upload"><div className="cover-photo" /><Button kind="secondary" icon={ImagePlus}>Изменить обложку</Button></div><div className="form-grid"><Field label="Название"><input defaultValue={venue.name} /></Field><Field label="Тип кухни"><select defaultValue="modern"><option value="modern">Современная европейская</option></select></Field><Field label="Телефон"><input defaultValue="+421 2 555 01 148" /></Field><Field label="E-mail"><input defaultValue={`hello@${venue.id}.sk`} /></Field><Field label="Адрес" wide><input defaultValue={venue.location.replace(" · ", ", ")} /></Field><Field label="Описание" wide><textarea defaultValue="Сезонная европейская кухня, натуральные вина и спокойный городской ритм." /></Field></div></> : tab === "Расписание" ? <ScheduleSettings /> : tab === "Заказы" ? <OrderSettings /> : <NotificationSettings />}</section></div></>;
}

function Field({ label, wide = false, children }: { label: string; wide?: boolean; children: ReactNode }) { return <label className={`field ${wide ? "wide" : ""}`}><span>{label}</span>{children}</label>; }

function ScheduleSettings() { return <><PanelTitle title="Часы работы" subtitle="Гости смогут бронировать и заказывать только в эти часы." /><div className="schedule-list">{["Понедельник","Вторник","Среда","Четверг","Пятница","Суббота","Воскресенье"].map((day, index) => <div key={day}><label className="switch"><input type="checkbox" defaultChecked={index !== 0} /><span /></label><strong>{day}</strong><input defaultValue={index === 0 ? "Закрыто" : "11:30"} disabled={index === 0} /><span>—</span><input defaultValue={index === 0 ? "Закрыто" : index > 4 ? "23:30" : "22:30"} disabled={index === 0} /></div>)}</div></>; }
function OrderSettings() { return <><PanelTitle title="Прием заказов" subtitle="Настройте доступные каналы и правила." /><div className="setting-toggles"><ToggleRow title="Заказы в зале" text="Гости сканируют QR-код и заказывают за столом." checked /><ToggleRow title="Заказ навынос" text="Онлайн-заказы с получением в заведении." checked /><ToggleRow title="Предзаказ при бронировании" text="Гости выбирают блюда заранее." checked /><ToggleRow title="Доставка" text="Доставка собственной службой или партнером." /></div></>; }
function NotificationSettings() { return <><PanelTitle title="Уведомления" subtitle="Выберите события и каналы для команды." /><div className="setting-toggles"><ToggleRow title="Новый онлайн-заказ" text="Push и звуковой сигнал на рабочих устройствах." checked /><ToggleRow title="Новая бронь" text="E-mail владельцу и менеджеру." checked /><ToggleRow title="Низкая оценка" text="Уведомлять об отзывах с оценкой ниже 4." checked /><ToggleRow title="Еженедельный отчет" text="Сводка продаж каждый понедельник." /></div></>; }
function ToggleRow({ title, text, checked = false }: { title: string; text: string; checked?: boolean }) { return <div><div><strong>{title}</strong><p>{text}</p></div><label className="switch"><input type="checkbox" defaultChecked={checked} /><span /></label></div>; }

const subscriptionPlans = [
  { id: "start", name: "Start", price: 29, description: "Для небольшого заведения", venues: "1 заведение", venueLimit: 1, features: ["Онлайн-меню и QR-коды", "Заказы и счета столов", "До 5 сотрудников"] },
  { id: "business", name: "Business", price: 69, description: "Для растущей команды", venues: "До 3 заведений", venueLimit: 3, features: ["Все возможности Start", "Аналитика и роли команды", "Брони и предзаказы"] },
  { id: "pro", name: "Pro", price: 129, description: "Для сети заведений", venues: "Без ограничений", venueLimit: Number.POSITIVE_INFINITY, features: ["Все возможности Business", "Расширенная аналитика", "Приоритетная поддержка"] },
] as const;

function SubscriptionScreen({ venueCount, notify }: { venueCount: number; notify: (message: string) => void }) {
  const [billing, setBilling] = useState<"monthly" | "yearly">("yearly");
  const [planId, setPlanId] = useState<(typeof subscriptionPlans)[number]["id"]>("business");
  const [method, setMethod] = useState<"card" | "new">("card");
  const [activated, setActivated] = useState(false);
  const plan = subscriptionPlans.find((item) => item.id === planId) ?? subscriptionPlans[1];
  const planFitsVenueCount = plan.venueLimit >= venueCount;
  const subtotal = billing === "yearly" ? plan.price * 10 : plan.price;
  const tax = subtotal * 0.2;
  const total = subtotal + tax;
  const activate = () => {
    if (!planFitsVenueCount) {
      notify(`Тариф ${plan.name} не поддерживает ${venueCount} заведения`);
      return;
    }
    setActivated(true);
    notify(`Подписка Pocket ${plan.name} подключена`);
  };
  return <><PageHeader title="Подписка" subtitle="Выберите тариф для всего рабочего пространства Pocket." /><section className={`subscription-status ${activated ? "active" : ""}`}><span><Sparkles size={22} /></span><div><strong>{activated ? `Pocket ${plan.name} активен` : "Пробный период активен"}</strong><p>{activated ? `Следующее списание ${billing === "yearly" ? "19 июля 2027" : "19 августа 2026"}.` : "Все возможности Business доступны до 28 июля без списаний."}</p></div><b>{activated ? "Оплачено" : "9 дней"}</b></section><div className="subscription-heading"><div><h2>Выберите тариф</h2><p>Тариф можно изменить или отменить в любой момент.</p></div><div className="segmented billing-toggle"><button className={billing === "monthly" ? "active" : ""} onClick={() => { setBilling("monthly"); setActivated(false); }}>Ежемесячно</button><button className={billing === "yearly" ? "active" : ""} onClick={() => { setBilling("yearly"); setActivated(false); }}>Ежегодно <b>−17%</b></button></div></div><section className="subscription-plans">{subscriptionPlans.map((item) => { const incompatible = item.venueLimit < venueCount; return <button className={`subscription-plan ${planId === item.id ? "selected" : ""} ${incompatible ? "incompatible" : ""}`} key={item.id} disabled={incompatible} onClick={() => { setPlanId(item.id); setActivated(false); }}><div className="plan-title"><div><strong>{item.name}</strong><span>{item.description}</span></div>{planId === item.id && <Check size={18} />}</div><div className="plan-price"><strong>{money(item.price)}</strong><span>/ месяц</span></div><p>{billing === "yearly" ? `€${item.price * 10} в год · 2 месяца бесплатно` : "Оплата каждый месяц"}</p><ul>{item.features.map((feature) => <li key={feature}><Check size={15} />{feature}</li>)}</ul><small className={incompatible ? "plan-limit-warning" : ""}><Store size={14} />{incompatible ? `Не подходит для ${venueCount} заведений` : item.venues}</small></button>; })}</section><div className="subscription-checkout"><section className="panel subscription-details"><PanelTitle title="Данные для оплаты" subtitle="Счет будет оформлен на владельца рабочего пространства." /><div className="subscription-methods"><button className={method === "card" ? "active" : ""} onClick={() => setMethod("card")}><span><CreditCard size={19} /></span><div><strong>Visa •••• 4242</strong><small>Срок действия 08/29</small></div><i /></button><button className={method === "new" ? "active" : ""} onClick={() => setMethod("new")}><span><Plus size={19} /></span><div><strong>Новая карта</strong><small>Добавить другой способ оплаты</small></div><i /></button></div>{method === "new" && <div className="form-grid subscription-card-form"><Field label="Номер карты" wide><input placeholder="0000 0000 0000 0000" /></Field><Field label="Срок действия"><input placeholder="ММ / ГГ" /></Field><Field label="CVC"><input placeholder="123" /></Field></div>}<hr /><PanelTitle title="Платежные реквизиты" /><div className="form-grid"><Field label="Компания"><input defaultValue="Pocket Hospitality s.r.o." /></Field><Field label="VAT ID"><input defaultValue="SK2026123456" /></Field><Field label="E-mail для счетов" wide><input defaultValue="billing@pocket.app" /></Field></div></section><aside className="panel subscription-summary"><PanelTitle title="Ваш заказ" /><div className="subscription-summary-plan"><span><Sparkles size={18} /></span><div><strong>Pocket {plan.name}</strong><small>{billing === "yearly" ? "Ежегодная оплата" : "Ежемесячная оплата"}</small></div><b>{money(subtotal)}</b></div><dl><div><dt>Заведений в аккаунте</dt><dd>{venueCount}</dd></div><div><dt>Стоимость</dt><dd>{money(subtotal)}</dd></div><div><dt>VAT 20%</dt><dd>{money(tax)}</dd></div></dl><div className="subscription-total"><span>К оплате сегодня</span><strong>{money(total)}</strong></div><Button className="full" icon={ShieldCheck} disabled={activated || !planFitsVenueCount} onClick={activate}>{activated ? "Подписка подключена" : !planFitsVenueCount ? "Выберите подходящий тариф" : `Оплатить ${money(total)}`}</Button><p className="secure-note"><ShieldCheck size={14} />Безопасная оплата. Отмена в любой момент.</p></aside></div></>;
}

function AccountScreen({ notify, onLogout }: { notify: (message: string) => void; onLogout: () => void }) {
  return <><PageHeader title="Аккаунт" subtitle="Личные данные, безопасность и настройки входа." actions={<Button icon={Check} onClick={() => notify("Настройки аккаунта сохранены")}>Сохранить</Button>} /><div className="account-layout"><aside className="panel account-summary"><span>DI</span><h2>Денис Иткин</h2><p>Владелец Pocket</p><small>denis@pocket.app</small></aside><section className="panel settings-form"><PanelTitle title="Личные данные" subtitle="Используются для входа и рабочих уведомлений." /><div className="form-grid"><Field label="Имя"><input defaultValue="Денис" /></Field><Field label="Фамилия"><input defaultValue="Иткин" /></Field><Field label="E-mail"><input defaultValue="denis@pocket.app" /></Field><Field label="Телефон"><input defaultValue="+421 900 123 456" /></Field></div><hr /><PanelTitle title="Безопасность" subtitle="Пароль и активные рабочие сессии." /><div className="account-security"><span><ShieldCheck size={20} /></span><div><strong>Пароль обновлен</strong><p>Последнее изменение 12 июня 2026</p></div><Button kind="secondary" onClick={() => notify("Ссылка для смены пароля отправлена")}>Изменить пароль</Button></div><Button kind="danger" icon={LogOut} onClick={onLogout}>Выйти из аккаунта</Button></section></div></>;
}

function PaymentsScreen({ notify }: { notify: (message: string) => void }) {
  const transactions = [
    { id: "#1048", date: "Сегодня, 14:28", method: "Visa •••• 4242", amount: "€76.50", status: "Успешно" },
    { id: "#1047", date: "Сегодня, 13:54", method: "Apple Pay", amount: "€42.00", status: "Успешно" },
    { id: "#1044", date: "Сегодня, 12:38", method: "Mastercard •••• 1881", amount: "€31.50", status: "В обработке" },
    { id: "#1042", date: "Вчера, 21:16", method: "Visa •••• 9330", amount: "€68.00", status: "Возврат" },
  ];
  return <><PageHeader title="Платежи" subtitle="Прием онлайн-оплаты и выплаты заведению." /><div className="payment-banner"><span><BadgeCheck size={24} /></span><div><strong>Онлайн-платежи подключены</strong><p>Аккаунт проверен. Гости могут платить картой, Apple Pay и Google Pay.</p></div><Button kind="secondary" icon={Settings}>Настроить</Button></div><section className="metric-grid payment-metrics"><Metric label="Доступно к выплате" value="€3,284.60" change="21 июля" icon={WalletCards} tone="green" /><Metric label="В обработке" value="€846.20" change="24 платежа" icon={Clock3} tone="gold" /><Metric label="Выплачено в июле" value="€28,140" change="+11.8%" icon={CheckCircle2} tone="blue" /></section><section className="panel payment-table-panel"><PanelTitle title="Последние транзакции" subtitle="Все способы оплаты" action={<Button kind="quiet" icon={Download}>Скачать CSV</Button>} /><div className="payment-table"><div className="payment-table-head"><span>Платеж</span><span>Способ оплаты</span><span>Сумма</span><span>Статус</span><span /></div>{transactions.map((transaction) => <div className="payment-row" key={transaction.id}><div className="payment-order"><span className="transaction-icon"><CreditCard size={18} /></span><p><strong>{transaction.id}</strong><small>{transaction.date}</small></p></div><span className="payment-method">{transaction.method}</span><b>{transaction.amount}</b><StatusPill status={transaction.status} /><IconButton icon={ChevronRight} label={`Открыть транзакцию ${transaction.id}`} onClick={() => notify("Транзакция открыта")} /></div>)}</div></section></>;
}

function DiscoverScreen({ onVenue }: { onVenue: () => void }) {
  return <><section className="discover-hero"><div className="discover-copy"><p className="eyebrow">Братислава · рядом с вами</p><h1>Куда пойдем сегодня?</h1><p>Откройте стол, закажите заранее или забронируйте вечер.</p><label className="discover-search"><Search size={20} /><input placeholder="Ресторан, кухня или район" /><Button>Найти</Button></label><div className="quick-filters"><button>Открыто сейчас</button><button>Стол сегодня</button><button>До 2 км</button></div></div><div className="hero-food" /></section><section className="discover-section"><PanelTitle title="Рядом с вами" subtitle="Подобрано по вашим предпочтениям" action={<Button kind="quiet">Смотреть все <ArrowRight size={16} /></Button>} /><div className="venue-grid"><VenueCard name="North & Vine" meta="Современная европейская · 0.8 км" rating="4.8" tag="Стол через 20 мин" position="0% 0%" onClick={onVenue} /><VenueCard name="Casa Forma" meta="Итальянская · 1.2 км" rating="4.7" tag="Заказ навынос" position="50% 0%" onClick={onVenue} /><VenueCard name="Mizu Table" meta="Японская · 1.7 км" rating="4.9" tag="Есть места" position="100% 0%" onClick={onVenue} /></div></section><section className="discover-section"><PanelTitle title="Сохраненные места" /><div className="saved-row"><div className="saved-image" /><div><strong>Ваш любимый стол в North & Vine</strong><p>Стол 08 · у окна · до 6 гостей</p></div><Button kind="secondary" icon={CalendarDays} onClick={onVenue}>Забронировать</Button></div></section></>;
}

function VenueCard({ name, meta, rating, tag, position, onClick }: { name: string; meta: string; rating: string; tag: string; position: string; onClick: () => void }) {
  return <article className="venue-card"><div className="venue-card-image" style={{ backgroundPosition: position }}><span>{tag}</span><IconButton icon={Heart} label="В избранное" /></div><button className="venue-card-copy" onClick={onClick}><h3>{name}</h3><p>{meta}</p><b><Star size={14} fill="currentColor" />{rating}</b></button></article>;
}

function CustomerMenu({ cart, onAdd, onCart }: { cart: Record<number, number>; onAdd: (id: number) => void; onCart: () => void }) {
  const [category, setCategory] = useState("Все");
  const categories = ["Все", "Закуски", "Паста", "Основное", "Десерты", "Напитки"];
  const visible = category === "Все" ? menuItems : menuItems.filter((item) => item.category === category);
  return <><section className="restaurant-header"><div className="restaurant-cover" /><div className="restaurant-info"><div><p><span className="open-dot" />Открыто до 22:30</p><h1>North & Vine</h1><span><Star size={15} fill="currentColor" />4.8 · Современная европейская · €€</span></div><div><Button kind="secondary" icon={CalendarDays}>Забронировать</Button><IconButton icon={Share2} label="Поделиться" /><IconButton icon={Heart} label="В избранное" /></div></div></section><div className="menu-sticky"><div className="category-tabs">{categories.map((item) => <button key={item} className={category === item ? "active" : ""} onClick={() => setCategory(item)}>{item}</button>)}</div><IconButton icon={Search} label="Поиск по меню" /></div><section className="customer-menu-section"><PageHeader title={category === "Все" ? "Сегодня в меню" : category} subtitle="Готовим из сезонных продуктов. Сообщите нам об аллергиях." /><div className="food-grid">{visible.map((item) => <article className="food-card" key={item.id}><FoodImage item={item} /><button className="heart-float" title="В избранное"><Heart size={17} /></button>{item.popular && <span className="food-badge">Выбор гостей</span>}<div><small>{item.category}</small><h3>{item.name}</h3><p>{item.description}</p><footer><strong>{money(item.price)}</strong>{cart[item.id] ? <div className="qty-inline"><button onClick={() => onAdd(item.id)}><Plus size={15} /></button><span>{cart[item.id]}</span><Check size={15} /></div> : <IconButton icon={Plus} label="Добавить" onClick={() => onAdd(item.id)} />}</footer></div></article>)}</div></section>{Object.keys(cart).length > 0 && <button className="floating-cart" onClick={onCart}><span><ShoppingBag size={19} /><b>{Object.values(cart).reduce((a,b) => a+b,0)}</b></span><strong>Посмотреть заказ</strong><em>{money(menuItems.reduce((s,i) => s+i.price*(cart[i.id]||0),0))}</em></button>}</>;
}

function Checkout({ cart, total, updateQty, onBack, onDone }: { cart: Record<number, number>; total: number; updateQty: (id: number, delta: number) => void; onBack: () => void; onDone: () => void }) {
  const [tip, setTip] = useState(10);
  const [method, setMethod] = useState("card");
  const tipValue = total * tip / 100;
  const selected = menuItems.filter((item) => cart[item.id]);
  return <><button className="back-link" onClick={onBack}><ChevronLeft size={17} />Вернуться в меню</button><PageHeader title="Ваш заказ" subtitle="North & Vine · Стол 08" /><div className="checkout-layout"><section className="checkout-main"><div className="panel checkout-items"><PanelTitle title={`Позиции · ${Object.values(cart).reduce((a,b)=>a+b,0)}`} />{selected.length ? selected.map((item) => <div className="checkout-item" key={item.id}><FoodImage item={item} /><div><strong>{item.name}</strong><small>Без изменений</small><button>Добавить комментарий</button></div><div className="qty-control"><IconButton icon={cart[item.id] === 1 ? Trash2 : Minus} label="Уменьшить" onClick={() => updateQty(item.id, -1)} /><span>{cart[item.id]}</span><IconButton icon={Plus} label="Увеличить" onClick={() => updateQty(item.id, 1)} /></div><b>{money(item.price * cart[item.id])}</b></div>) : <EmptyIllustration icon={ShoppingBag} title="Корзина пуста" text="Вернитесь в меню и выберите блюда." />}</div><div className="panel"><PanelTitle title="Чаевые команде" subtitle="100% чаевых получают сотрудники" /><div className="tip-options">{[0, 5, 10, 15].map((value) => <button className={tip === value ? "active" : ""} key={value} onClick={() => setTip(value)}>{value === 0 ? "Без чаевых" : `${value}%`}</button>)}<button className={tip === 20 ? "active" : ""} onClick={() => setTip(20)}>Другая сумма</button></div></div><div className="panel"><PanelTitle title="Способ оплаты" /><div className="payment-options"><button className={method === "card" ? "active" : ""} onClick={() => setMethod("card")}><CreditCard size={20} /><span><strong>Карта •••• 4242</strong><small>Основной способ</small></span><i /></button><button className={method === "apple" ? "active" : ""} onClick={() => setMethod("apple")}><WalletCards size={20} /><span><strong>Apple Pay</strong><small>Быстрая оплата</small></span><i /></button></div></div></section><aside className="panel order-summary"><PanelTitle title="Итого" /><dl><div><dt>Блюда</dt><dd>{money(total)}</dd></div><div><dt>Сервисный сбор</dt><dd>€0.00</dd></div><div><dt>Чаевые ({tip}%)</dt><dd>{money(tipValue)}</dd></div></dl><div className="summary-total"><span>К оплате</span><strong>{money(total + tipValue)}</strong></div><Button className="full pay-button" icon={ShieldCheck} disabled={!selected.length} onClick={onDone}>Оплатить {money(total + tipValue)}</Button><p className="secure-note"><ShieldCheck size={14} />Безопасная оплата через Stripe</p></aside></div></>;
}

function ReservationScreen({ onMenu, notify }: { onMenu: () => void; notify: (message: string) => void }) {
  const [step, setStep] = useState(1); const [table, setTable] = useState("08");
  return <><PageHeader title="Забронировать стол" subtitle="North & Vine · Štúrova 12" /><div className="reservation-layout"><section className="panel reservation-main"><div className="stepper"><span className={step >= 1 ? "active" : ""}><b>1</b>Когда</span><i /><span className={step >= 2 ? "active" : ""}><b>2</b>Стол</span><i /><span className={step >= 3 ? "active" : ""}><b>3</b>Детали</span></div>{step === 1 && <div className="reservation-step"><h2>Когда вас ждать?</h2><div className="date-strip">{[["Вс","19"],["Пн","20"],["Вт","21"],["Ср","22"],["Чт","23"]].map((d,i) => <button className={i===0 ? "active" : ""} key={d[1]}><small>{d[0]}</small><strong>{d[1]}</strong></button>)}</div><Field label="Количество гостей"><select defaultValue="4"><option>2</option><option>3</option><option>4</option><option>5</option><option>6</option></select></Field><div className="time-grid">{["18:00","18:30","19:00","19:30","20:00","20:30","21:00","21:30"].map((t,i) => <button className={i===3 ? "active" : ""} key={t}>{t}</button>)}</div></div>}{step === 2 && <div className="reservation-step"><h2>Выберите стол</h2><p>Можно выбрать конкретный свободный стол.</p><div className="mini-floor">{tables.map((t) => <button key={t.id} disabled={t.state === "busy"} className={`${t.id === table ? "active" : ""} ${t.state}`} onClick={() => setTable(t.id)}><Table2 size={18} /><strong>{t.id}</strong><small>{t.seats} места</small></button>)}</div></div>}{step === 3 && <div className="reservation-step"><h2>Последние детали</h2><div className="form-grid"><Field label="Имя"><input defaultValue="Денис" /></Field><Field label="Телефон"><input defaultValue="+421 900 123 456" /></Field><Field label="Комментарий" wide><textarea placeholder="Детский стул, аллергии или повод" /></Field></div><button className="preorder-callout" onClick={onMenu}><span><Utensils size={20} /></span><div><strong>Заказать блюда заранее</strong><p>Добавьте позиции, и мы начнем готовить к вашему приходу.</p></div><ChevronRight size={18} /></button></div>}<div className="reservation-actions">{step > 1 ? <Button kind="secondary" onClick={() => setStep(step-1)} icon={ChevronLeft}>Назад</Button> : <span />}{step < 3 ? <Button onClick={() => setStep(step+1)}>Продолжить <ChevronRight size={17} /></Button> : <Button icon={Check} onClick={() => notify(`Стол ${table} забронирован на 19:30`)}>Подтвердить бронь</Button>}</div></section><aside className="panel reservation-summary"><div className="reservation-photo" /><h3>North & Vine</h3><p><MapPin size={15} />Štúrova 12, Bratislava</p><dl><div><dt>Дата</dt><dd>19 июля</dd></div><div><dt>Время</dt><dd>19:30</dd></div><div><dt>Гости</dt><dd>4</dd></div><div><dt>Стол</dt><dd>{table}</dd></div></dl><small>Бесплатная отмена не позднее чем за 2 часа.</small></aside></div></>;
}

function HistoryScreen({ notify }: { notify: (message: string) => void }) {
  return <><PageHeader title="Мои заказы" subtitle="История визитов, заказов и оплат." /><div className="history-list"><article className="panel active-order"><div className="order-venue"><span className="venue-mini" /><div><small>СЕГОДНЯ · В ЗАЛЕ</small><h3>North & Vine</h3><p>Заказ #1049 · Стол 08</p></div><StatusPill status="Готовится" /></div><div className="progress-track"><i className="done"><Check size={13} /></i><span /><i className="done"><Check size={13} /></i><span /><i className="current"><Coffee size={13} /></i><span /><i><PackageCheck size={13} /></i></div><div className="progress-labels"><span>Принят</span><span>Подтвержден</span><span>Готовится</span><span>Готов</span></div><footer><div><strong>€58.50</strong><span>3 позиции</span></div><Button kind="secondary" icon={Share2} onClick={() => notify("Ссылка на заказ скопирована")}>Поделиться</Button><Button icon={Eye}>Следить за заказом</Button></footer></article>{[["14 июля","North & Vine","€76.50","5 позиций"],["8 июля","Casa Forma","€41.20","3 позиции"],["28 июня","Mizu Table","€64.00","4 позиции"]].map((row,index) => <article className="panel past-order" key={row[0]}><span className={`past-thumb pos-${index}`} /><div><small>{row[0]} · ОПЛАЧЕН</small><h3>{row[1]}</h3><p>{row[3]} · Карта •••• 4242</p></div><strong>{row[2]}</strong><Button kind="quiet" icon={MessageSquareText} onClick={() => notify("Форма отзыва открыта")}>Оставить отзыв</Button><IconButton icon={ChevronRight} label="Подробнее" /></article>)}</div></>;
}

function ProfileScreen({ notify, onLogout }: { notify: (message: string) => void; onLogout: () => void }) {
  return <><PageHeader title="Профиль" subtitle="Ваш аккаунт, предпочтения и способы оплаты." /><div className="profile-layout"><aside className="panel profile-card"><span className="profile-avatar">DI</span><h2>Денис Иткин</h2><p>Участник с июля 2026</p><div><span><strong>12</strong><small>заказов</small></span><span><strong>4</strong><small>отзыва</small></span><span><strong>6</strong><small>мест</small></span></div><Button kind="quiet" icon={LogOut} onClick={onLogout}>Выйти</Button></aside><section className="panel settings-form"><PanelTitle title="Личные данные" action={<Button kind="secondary" icon={Edit3} onClick={() => notify("Профиль сохранен")}>Изменить</Button>} /><div className="form-grid"><Field label="Имя"><input defaultValue="Денис" /></Field><Field label="Фамилия"><input defaultValue="Иткин" /></Field><Field label="E-mail"><input defaultValue="denis@pocket.app" /></Field><Field label="Телефон"><input defaultValue="+421 900 123 456" /></Field></div><hr /><PanelTitle title="Оплата" /><div className="saved-card"><span><CreditCard size={20} /></span><div><strong>Visa •••• 4242</strong><small>Срок действия 08/29</small></div><BadgeCheck size={18} /><IconButton icon={Ellipsis} label="Настройки карты" /></div><Button kind="quiet" icon={Plus}>Добавить способ оплаты</Button><hr /><PanelTitle title="Предпочтения" /><div className="setting-toggles"><ToggleRow title="Безлактозные блюда" text="Показывать подсказки в меню." checked /><ToggleRow title="Новости любимых мест" text="Редкие и полезные письма от заведений." /></div></section></div></>;
}

function ServiceBoard({ notify }: { notify: (message: string) => void }) {
  const columns: { title: string; status: Status; orders: typeof liveOrders }[] = [
    { title: "Новые", status: "Новый", orders: liveOrders.filter((o)=>o.status==="Новый") },
    { title: "Готовятся", status: "Готовится", orders: liveOrders.filter((o)=>o.status==="Готовится") },
    { title: "Готовы", status: "Готов", orders: liveOrders.filter((o)=>o.status==="Готов") },
  ];
  return <><PageHeader title="Сервис" subtitle="Ваша смена · 12:00–22:30" actions={<Button kind="secondary" icon={QrCode}>Сканировать стол</Button>} /><div className="shift-strip"><div><span className="live-indicator" />Смена активна</div><p><strong>София Марек</strong> · Столы 02, 03, 06, 08</p><Button kind="quiet">Завершить смену</Button></div><div className="kanban">{columns.map((column) => <section key={column.title}><header><h2>{column.title}</h2><span>{column.orders.length}</span></header>{column.orders.map((order) => <article className="ticket" key={order.id}><div><strong>{order.source}</strong><span>{order.time}</span></div><p>{order.id} · {order.guest}</p><ul>{order.id === "#1048" ? <><li><b>2×</b> Тальятелле</li><li><b>1×</b> Буррата</li><li><b>3×</b> Красный апельсин</li></> : <><li><b>1×</b> Сибас на гриле</li><li><b>1×</b> Тирамису</li></>}</ul><footer><strong>{money(order.total)}</strong><Button onClick={() => notify(column.status === "Готов" ? "Заказ отмечен как поданный" : "Заказ передан на следующий этап")}>{column.status === "Новый" ? "Принять" : column.status === "Готовится" ? "Проверить" : "Подано"}<ArrowRight size={15} /></Button></footer></article>)}{!column.orders.length && <EmptyIllustration icon={CheckCircle2} title="Все готово" text="В этой колонке нет заказов." />}</section>)}</div></>;
}

function KitchenScreen({ notify }: { notify: (message: string) => void }) {
  const tickets = liveOrders.filter((o)=>o.status !== "Подан");
  return <><PageHeader title="Кухня" subtitle="Очередь блюд по времени приготовления." actions={<div className="kitchen-clock"><Clock3 size={17} />14:32</div>} /><div className="kitchen-grid">{tickets.map((order,index) => <article className={`kitchen-ticket ${index === 0 ? "urgent" : ""}`} key={order.id}><header><div><strong>{order.source}</strong><span>{order.id}</span></div><b>{order.time}</b></header><div className="kitchen-lines">{(index%2 ? [[1,"Сибас на гриле"],[1,"Тирамису"]] : [[2,"Тальятелле"],[1,"Буррата и томаты"],[3,"Красный апельсин"]]).map((line) => <p key={String(line[1])}><b>{line[0]}×</b><span>{line[1]}</span><button><Check size={15} /></button></p>)}</div><Button className="full" kind={index === 0 ? "primary" : "secondary"} onClick={() => notify(`${order.id} готов к выдаче`)} icon={PackageCheck}>Заказ готов</Button></article>)}</div></>;
}

function Modal({ type, onClose, notify }: { type: "item" | "invite" | "order"; onClose: () => void; notify: (message: string) => void }) {
  const copy = type === "item" ? { title: "Новая позиция", action: "Добавить в меню" } : type === "invite" ? { title: "Пригласить сотрудника", action: "Отправить приглашение" } : { title: "Заказ #1048", action: "Закрыть" };
  return <div className="modal-backdrop" onMouseDown={onClose}><section className={`modal ${type === "order" ? "order-modal" : ""}`} onMouseDown={(event) => event.stopPropagation()}><header><div><p className="eyebrow">NORTH & VINE</p><h2>{copy.title}</h2></div><IconButton icon={X} label="Закрыть" onClick={onClose} /></header>{type === "item" && <div className="modal-body"><button className="image-drop"><ImagePlus size={24} /><strong>Добавить фотографию</strong><span>PNG или JPG до 8 МБ</span></button><div className="form-grid"><Field label="Название" wide><input placeholder="Название блюда" /></Field><Field label="Категория"><select><option>Закуски</option><option>Основное</option><option>Десерты</option></select></Field><Field label="Цена"><input placeholder="€ 0.00" /></Field><Field label="Описание" wide><textarea placeholder="Ингредиенты и короткое описание" /></Field></div></div>}{type === "invite" && <div className="modal-body"><div className="form-grid"><Field label="Имя"><input placeholder="Имя сотрудника" /></Field><Field label="E-mail"><input placeholder="name@example.com" /></Field><Field label="Роль" wide><select><option>Официант</option><option>Менеджер</option><option>Кухня</option><option>Только просмотр</option></select></Field></div><div className="permission-note"><ShieldCheck size={20} /><p><strong>Доступ по роли</strong><span>Сотрудник увидит только разрешенные разделы этого заведения.</span></p></div></div>}{type === "order" && <div className="modal-body order-detail"><div className="order-detail-top"><StatusPill status="Новый" /><span><Clock3 size={15} />2 минуты назад</span></div><div className="order-source"><span><Table2 size={20} /></span><div><strong>Стол 08 · 4 гостя</strong><p>Официант: София Марек</p></div></div><div className="order-lines"><p><b>2×</b><span>Тальятелле с трюфелем<small>Одна порция без пармезана</small></span><strong>€37.00</strong></p><p><b>1×</b><span>Буррата и томаты</span><strong>€13.50</strong></p><p><b>3×</b><span>Красный апельсин</span><strong>€21.00</strong></p></div><dl className="order-total"><div><dt>Подытог</dt><dd>€71.50</dd></div><div><dt>Чаевые</dt><dd>€5.00</dd></div><div><dt>Итого</dt><dd>€76.50</dd></div></dl></div>}<footer><Button kind="secondary" onClick={onClose}>Назад</Button><Button onClick={() => notify(type === "item" ? "Позиция добавлена в меню" : type === "invite" ? "Приглашение отправлено" : "Заказ принят")}>{copy.action}</Button></footer></section></div>;
}
