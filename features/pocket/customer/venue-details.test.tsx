import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getPublicVenue, getPublicVenueMenu, getSavedPublicReservation, getVenueAvailability, type PublicMenuCategory, type PublicVenue } from "../../../lib/public-catalog-api";
import { I18nProvider } from "../i18n";
import { VenueDetailsScreen } from "./venue-details";

vi.mock("next/navigation", () => ({useRouter:()=>({push:vi.fn(),replace:vi.fn()}),usePathname:()=>"/ru/r/venue-a"}));
vi.mock("../../../lib/public-catalog-api", async (original) => ({ ...await original<object>(), getPublicVenue: vi.fn(), getPublicVenueMenu: vi.fn(), getSavedPublicReservation: vi.fn(), getVenueAvailability: vi.fn() }));
const date = (() => { const value = new Date(); value.setUTCDate(value.getUTCDate() + 2); return value.toISOString().slice(0, 10); })();
const menu: PublicMenuCategory[] = [
  { id: "food", name: "Еда", preorder_enabled: true, items: [{ id: "pasta", name: "Паста", price_minor: 1200, currency: "EUR" }] },
  { id: "drinks", name: "Напитки", preorder_enabled: false, items: [{ id: "tea", name: "Чай", price_minor: 300, currency: "EUR" }] },
];
beforeEach(() => {
  vi.stubGlobal("matchMedia", vi.fn(() => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() })));
  HTMLDialogElement.prototype.showModal = function () { this.setAttribute("open", ""); };
  HTMLDialogElement.prototype.close = function () { this.removeAttribute("open"); };
  vi.mocked(getPublicVenue).mockResolvedValue({ id: "venue-a", name: "Demo Bistro", category_slug: "restaurants", address: "Main 1", city: "Bratislava", tags: [], filters: [], preorder_enabled: true } as unknown as PublicVenue);
  vi.mocked(getPublicVenueMenu).mockResolvedValue(menu);
  vi.mocked(getSavedPublicReservation).mockResolvedValue(null);
  vi.mocked(getVenueAvailability).mockImplementation(async (venueID, selectedDate, guests) => ({
    venue_id: venueID, date: selectedDate || date, timezone: "Europe/Bratislava", guests, duration_minutes: 120,
    slots: [{ time: "18:00", starts_at: `${date}T16:00:00Z`, ends_at: `${date}T18:00:00Z`, tables: [] }],
  }));
});
afterEach(() => vi.unstubAllGlobals());

describe("VenueDetailsScreen preorder categories", () => {
  it("switches mobile menu layout beside the booking button without a burger", async () => {
    localStorage.clear();
    vi.stubGlobal("matchMedia", vi.fn(() => ({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() })));
    render(<I18nProvider initialLocale="ru"><VenueDetailsScreen venueID="venue-a" onBack={vi.fn()} saved={false} /></I18nProvider>);
    const categories = await screen.findByRole("navigation", { name: "Категории меню" });
    expect(screen.queryByRole("button", { name: "Настройки меню" })).not.toBeInTheDocument();
    expect(within(categories).queryByRole("button", { name: "Показать списком" })).not.toBeInTheDocument();
    const toggle = screen.getByRole("button", { name: "Показать списком" });
    expect(toggle.previousElementSibling).toBe(screen.getByRole("button", { name: "Забронировать онлайн" }));
    expect(screen.queryByRole("button", { name: "Открыть информацию о заведении" })).not.toBeInTheDocument();
    fireEvent.click(toggle);
    expect(screen.getByRole("button", { name: "Подробнее о блюде: Паста" }).closest(".venue-public-menu-grid")).toHaveClass("venue-public-menu-list");
    expect(localStorage.getItem("pocket:menu-view")).toBe("list");
    fireEvent.click(screen.getByRole("button", { name: "Показать сеткой" }));
    expect(screen.getByRole("button", { name: "Подробнее о блюде: Паста" }).closest(".venue-public-menu-grid")).not.toHaveClass("venue-public-menu-list");
  });

  it("keeps ordinary menu and dish information intact, filters preorder and permits removing newly disabled dishes", async () => {
    render(<I18nProvider initialLocale="ru"><VenueDetailsScreen venueID="venue-a" onBack={vi.fn()} saved={false} /></I18nProvider>);
    expect(await screen.findByRole("button", { name: "Напитки" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Подробнее о блюде: Чай" }));
    expect(screen.getByRole("dialog", { name: "Чай" })).toBeInTheDocument();
    fireEvent.click(within(screen.getByRole("dialog", { name: "Чай" })).getByRole("button", { name: "Закрыть" }));
    fireEvent.click(await screen.findByRole("button", { name: "18:00" }));
    fireEvent.click(screen.getByRole("button", { name: "Забронировать", exact: true }));
    fireEvent.change(screen.getByLabelText("Имя"), { target: { value: "Anna Guest" } });
    fireEvent.change(screen.getByLabelText("Телефон"), { target: { value: "+421900123456" } });
    fireEvent.click(screen.getByRole("button", { name: "Продолжить" }));
    const preorder = screen.getByRole("dialog", { name: "Меню для предзаказа" });
    expect(within(preorder).getByRole("button", { name: "Еда" })).toHaveAttribute("aria-current", "location");
    expect(within(preorder).queryByRole("button", { name: "Напитки" })).not.toBeInTheDocument();
    expect(within(preorder).queryByRole("button", { name: "Подробнее о блюде: Чай" })).not.toBeInTheDocument();
    fireEvent.click(within(preorder).getByRole("button", { name: "Добавить Паста" }));
    vi.mocked(getPublicVenueMenu).mockResolvedValue([{ ...menu[0], preorder_enabled: false }, menu[1]]);
    fireEvent(window, new Event("focus"));
    await waitFor(() => expect(within(preorder).getByText("Блюдо недоступно · 1")).toBeInTheDocument());
    expect(within(preorder).getByRole("button", { name: /^Продолжить к оплате/ })).toBeDisabled();
    fireEvent.click(within(preorder).getByRole("button", { name: "Убрать", exact: true }));
    expect(within(preorder).getByRole("button", { name: "Забронировать без предзаказа" })).toBeEnabled();
    fireEvent.click(within(preorder).getByRole("button", { name: "Назад к бронированию" }));
    expect(screen.getByLabelText("Имя")).toHaveValue("Anna Guest");
    expect(screen.getByRole("button", { name: "Напитки" })).toBeInTheDocument();
  });
});

it("uses the reservation route entry on mobile without starting checkout", async () => {
 vi.stubGlobal("matchMedia",vi.fn(()=>({matches:true,addEventListener:vi.fn(),removeEventListener:vi.fn()})));
 const onReserve=vi.fn();
 render(<I18nProvider initialLocale="ru"><VenueDetailsScreen standalone venueID="venue-a" onBack={vi.fn()} onReserve={onReserve} saved={false}/></I18nProvider>);
 await screen.findByRole("heading",{name:"Demo Bistro"});
 expect(screen.queryByRole("heading",{name:"Бронирование",exact:true})).not.toBeInTheDocument();
 fireEvent.click(screen.getByRole("button",{name:"Забронировать онлайн",exact:true}));
 expect(onReserve).toHaveBeenCalledOnce();
 expect(screen.queryByRole("button",{name:"18:00"})).not.toBeInTheDocument();
});
it("closes the mobile reservation flow with the close button", async () => {
 vi.stubGlobal("matchMedia",vi.fn(()=>({matches:true,addEventListener:vi.fn(),removeEventListener:vi.fn()})));
 const onBack=vi.fn();
 render(<I18nProvider initialLocale="ru"><VenueDetailsScreen standalone reservationPage venueID="venue-a" onBack={onBack} saved={false}/></I18nProvider>);
 const dialog=await screen.findByRole("dialog",{name:"Бронирование"});
 expect(await within(dialog).findByRole("button",{name:"18:00"})).toBeInTheDocument();
 fireEvent.click(within(dialog.querySelector(".venue-booking-heading")! as HTMLElement).getByRole("button",{name:"Закрыть",exact:true}));
 expect(screen.queryByRole("dialog",{name:"Настройки меню"})).not.toBeInTheDocument();
 expect(onBack).toHaveBeenCalledOnce();
});

it("shows desktop booking immediately and changes menu view without losing the selected time", async () => {
 localStorage.clear();
 const onReserve=vi.fn();
 render(<I18nProvider initialLocale="ru"><VenueDetailsScreen standalone menuPage venueID="venue-a" onBack={vi.fn()} onReserve={onReserve} saved={false}/></I18nProvider>);
 fireEvent.click(await screen.findByRole("button",{name:"18:00"}));
 const categories=screen.getByRole("navigation",{name:"Категории меню"});
 const controls=within(categories.parentElement!);
 fireEvent.click(controls.getByRole("button",{name:"Показать списком"}));
 expect(screen.getByRole("button",{name:"Подробнее о блюде: Паста"}).closest(".venue-public-menu-grid")).toHaveClass("venue-public-menu-list");
 expect(localStorage.getItem("pocket:menu-view")).toBe("list");
 expect(screen.getByRole("button",{name:"18:00"})).toHaveAttribute("aria-pressed","true");
 fireEvent.click(controls.getByRole("button",{name:"Показать сеткой"}));
 expect(screen.getByRole("button",{name:"Подробнее о блюде: Паста"}).closest(".venue-public-menu-grid")).not.toHaveClass("venue-public-menu-list");
 fireEvent.click(screen.getByRole("button",{name:"Забронировать",exact:true}));
 expect(screen.getByRole("dialog",{name:"Бронирование"})).toBeInTheDocument();
 expect(onReserve).not.toHaveBeenCalled();
});
