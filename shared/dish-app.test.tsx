import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import DishApp from "./dish-app";
import { ProfilePage, ReservationsPage, SettingsPage, VenueMenuPage } from "./dish-screens";
import { getCurrentUser } from "../lib/auth-api";
import { I18nProvider } from "../features/pocket/i18n";
const { replace, push, segment } = vi.hoisted(() => ({
  replace: vi.fn(),
  push: vi.fn(),
  segment: { current: null as string | null },
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace, push }),
  usePathname: () => "/ru/r/venue-id/profile",
  useSearchParams: () => new URLSearchParams(),
  useSelectedLayoutSegment: () => segment.current,
}));
vi.mock("../lib/auth-api", () => ({ getCurrentUser: vi.fn(), logout: vi.fn() }));
vi.mock("../features/pocket/customer/venue-home", () => ({ VenueHome: () => null }));
vi.mock("../features/pocket/customer/venue-details", () => ({ VenueDetailsScreen: () => null }));
vi.mock("../features/pocket/customer/table-venue", () => ({ TableVenueScreen: () => null }));
vi.mock("../features/pocket/customer/my-reservations", () => ({
  MyReservationsScreen: () => null,
}));
vi.mock("../features/pocket/customer/profile", () => ({
  GuestProfile: ({ hideSavedPlaces }: { hideSavedPlaces: boolean }) => (
    <div>{hideSavedPlaces ? "profile-without-marketplace" : "marketplace"}</div>
  ),
  GuestSettings: () => null,
  GuestProfileDialog: () => null,
}));
// The restaurant layout with the page its URL segment opens.
const dish = (page?: "profile" | "reservations" | "settings") => {
  segment.current = page ?? null;
  const Page = page
    ? { profile: ProfilePage, reservations: ReservationsPage, settings: SettingsPage }[page]
    : VenueMenuPage;
  return (
    <DishApp venueID="venue-id">
      <Page />
    </DishApp>
  );
};
beforeEach(() => {
  vi.clearAllMocks();
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));
  HTMLDialogElement.prototype.showModal = function () {
    this.setAttribute("open", "");
  };
  HTMLDialogElement.prototype.close = function () {
    this.removeAttribute("open");
  };
});
it("preserves a private account and removes favorites navigation", async () => {
  vi.mocked(getCurrentUser).mockResolvedValue({
    id: "u",
    email: "a@example.test",
    first_name: "Анна",
    last_name: "Гость",
    role: "customer",
    capabilities: ["customer"],
  });
  render(<I18nProvider initialLocale="ru">{dish("profile")}</I18nProvider>);
  await screen.findByRole("button", { name: "Редактировать профиль" });
  expect(screen.getAllByText("Мои брони").length).toBeGreaterThan(0);
});
it("requires authentication to see personal reservations", async () => {
  vi.mocked(getCurrentUser).mockRejectedValue(new Error("unauthorized"));
  render(<I18nProvider initialLocale="ru">{dish("reservations")}</I18nProvider>);
  await waitFor(() =>
    expect(replace).toHaveBeenCalledWith("/ru/login?returnTo=%2Fru%2Fr%2Fvenue-id%2Fprofile"),
  );
});

it("opens the same QR settings panel from the restaurant burger", async () => {
  vi.mocked(getCurrentUser).mockRejectedValue(new Error("unauthorized"));
  render(<I18nProvider initialLocale="ru">{dish()}</I18nProvider>);
  fireEvent.click(screen.getByRole("button", { name: "Настройки меню" }));
  const dialog = within(screen.getByRole("dialog", { name: "Настройки меню" }));
  expect(dialog.getByText("Войдите в аккаунт")).toBeInTheDocument();
  expect(dialog.queryByRole("button", { name: "Вид меню: Карточки" })).not.toBeInTheDocument();
  expect(dialog.queryByRole("button", { name: "Меню" })).not.toBeInTheDocument();
  expect(dialog.queryByRole("button", { name: "Бронирование" })).not.toBeInTheDocument();
  fireEvent.click(dialog.getByRole("button", { name: "Войти" }));
  expect(push).toHaveBeenCalledWith("/ru/login?returnTo=%2Fru%2Fr%2Fvenue-id%2Fprofile");
  await act(async () => {});
});
it("opens language selection from the burger and keeps the current page", async () => {
  vi.mocked(getCurrentUser).mockRejectedValue(new Error("unauthorized"));
  render(<I18nProvider initialLocale="ru">{dish()}</I18nProvider>);
  fireEvent.click(screen.getByRole("button", { name: "Настройки меню" }));
  fireEvent.click(
    within(screen.getByRole("dialog")).getByRole("button", { name: "Язык интерфейса: Русский" }),
  );
  fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "English" }));
  expect(replace).toHaveBeenCalledWith("/en/r/venue-id/profile", { scroll: false });
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  await act(async () => {});
});

it("opens sign in from the header and preserves the current restaurant route", async () => {
  vi.mocked(getCurrentUser).mockRejectedValue(new Error("unauthorized"));
  render(<I18nProvider initialLocale="ru">{dish()}</I18nProvider>);
  fireEvent.click(
    within(screen.getByRole("banner", { name: "Навигация Pocket Dish" })).getByRole("button", {
      name: "Войти",
    }),
  );
  expect(push).toHaveBeenCalledWith("/ru/login?returnTo=%2Fru%2Fr%2Fvenue-id%2Fprofile");
  await act(async () => {});
});

it("keeps account navigation and logo inside the selected restaurant", async () => {
  vi.mocked(getCurrentUser).mockResolvedValue({
    id: "u",
    email: "a@example.test",
    first_name: "Анна",
    last_name: "Гость",
    role: "customer",
    capabilities: ["customer"],
  });
  render(<I18nProvider initialLocale="ru">{dish("profile")}</I18nProvider>);
  await screen.findByRole("button", { name: "Редактировать профиль" });
  fireEvent.click(screen.getByRole("button", { name: "Pocket Dish, главная" }));
  expect(push).toHaveBeenLastCalledWith("/ru/r/venue-id");
  fireEvent.click(screen.getByRole("button", { name: "Меню аккаунта" }));
  const account = within(screen.getByRole("menu", { name: "Аккаунт" }));
  expect(account.queryByRole("menuitem", { name: "Сохранённые места" })).not.toBeInTheDocument();
  fireEvent.click(account.getByRole("menuitem", { name: "Мои брони" }));
  expect(push).toHaveBeenLastCalledWith("/ru/r/venue-id/reservations");
  fireEvent.click(screen.getByRole("button", { name: "Настройки меню" }));
  fireEvent.click(
    within(screen.getByRole("dialog")).getByRole("button", { name: "Личные данные" }),
  );
  expect(push).toHaveBeenLastCalledWith("/ru/r/venue-id/settings?section=profile");
});

it("uses the catalog language dropdown in the desktop header", async () => {
  vi.mocked(getCurrentUser).mockRejectedValue(new Error("unauthorized"));
  render(<I18nProvider initialLocale="ru">{dish()}</I18nProvider>);
  fireEvent.click(
    within(screen.getByRole("banner", { name: "Навигация Pocket Dish" })).getByRole("button", {
      name: "Язык интерфейса",
    }),
  );
  fireEvent.click(
    within(screen.getByRole("menu", { name: "Язык интерфейса" })).getByRole("menuitem", {
      name: "English",
    }),
  );
  expect(replace).toHaveBeenCalledWith("/en/r/venue-id/profile");
  expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  await act(async () => {});
});

for (const [label, target] of [
  ["Личные данные", "settings?section=profile"],
  ["Мои брони", "reservations"],
  ["Безопасность", "settings?section=security"],
]) {
  it(`opens ${label} directly from the burger`, async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({
      id: "u",
      email: "a@example.test",
      first_name: "Анна",
      last_name: "Гость",
      role: "customer",
      capabilities: ["customer"],
    });
    render(<I18nProvider initialLocale="ru">{dish("profile")}</I18nProvider>);
    await screen.findByRole("button", { name: "Редактировать профиль" });
    fireEvent.click(screen.getByRole("button", { name: "Настройки меню" }));
    fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: label }));
    expect(push).toHaveBeenLastCalledWith(`/ru/r/venue-id/${target}`);
  });
}
it("hides the account section until the guest signs in", async () => {
  vi.mocked(getCurrentUser).mockRejectedValue(new Error("unauthorized"));
  render(<I18nProvider initialLocale="ru">{dish()}</I18nProvider>);
  fireEvent.click(screen.getByRole("button", { name: "Настройки меню" }));
  const dialog = within(screen.getByRole("dialog"));
  expect(dialog.queryByRole("region", { name: "Аккаунт" })).not.toBeInTheDocument();
  for (const name of ["Личные данные", "Мои брони", "Безопасность"]) {
    expect(dialog.queryByRole("button", { name })).not.toBeInTheDocument();
  }
  expect(dialog.getByRole("button", { name: "Войти" })).toBeInTheDocument();
  await act(async () => {});
});

it("replaces the old settings landing and bottom navigation with the account cards", async () => {
  vi.mocked(getCurrentUser).mockResolvedValue({
    id: "u",
    email: "a@example.test",
    first_name: "Анна",
    last_name: "Гость",
    role: "customer",
    capabilities: ["customer"],
  });
  const result = render(<I18nProvider initialLocale="ru">{dish("settings")}</I18nProvider>);
  await screen.findByRole("button", { name: "Редактировать профиль" });
  const account = within(screen.getByRole("region", { name: "Профиль" }));
  expect(account.getByRole("button", { name: "Безопасность" })).toBeInTheDocument();
  expect(result.container.querySelector(".dish-settings-identity")).toBeNull();
  expect(screen.queryByRole("navigation", { name: "Навигация" })).not.toBeInTheDocument();
  fireEvent.click(account.getByRole("button", { name: "Безопасность" }));
  expect(push).toHaveBeenLastCalledWith("/ru/r/venue-id/settings?section=security");
});

it("returns to the restaurant after sign out without redirecting back to login", async () => {
  vi.mocked(getCurrentUser).mockResolvedValue({
    id: "u",
    email: "a@example.test",
    first_name: "Анна",
    last_name: "Гость",
    role: "customer",
    capabilities: ["customer"],
  });
  render(<I18nProvider initialLocale="ru">{dish("profile")}</I18nProvider>);
  fireEvent.click(await screen.findByRole("button", { name: "Выйти из аккаунта" }));
  await waitFor(() => expect(push).toHaveBeenCalledWith("/ru/r/venue-id"));
  expect(replace).not.toHaveBeenCalled();
});
