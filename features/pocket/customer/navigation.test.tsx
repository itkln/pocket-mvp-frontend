import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { SpotsHeader } from "./navigation";
import { I18nProvider } from "../i18n";

const replace = vi.fn();
vi.mock("next/navigation", () => ({
  usePathname: () => "/ru/discover",
  useRouter: () => ({ replace }),
}));

beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function () {
    this.setAttribute("open", "");
  };
  HTMLDialogElement.prototype.close = function () {
    this.removeAttribute("open");
  };
});
beforeEach(() => {
  window.matchMedia = vi
    .fn()
    .mockReturnValue({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() });
});

describe("customer header", () => {
  it("searches and selects a city, with no cart button in the header", () => {
    const onCityChange = vi.fn();
    render(
      <SpotsHeader
        user={{
          id: "test",
          email: "test@example.com",
          first_name: "Test",
          last_name: "User",
          role: "customer",
          capabilities: ["customer"],
        }}
        screen="discover"
        city="Братислава"
        onCityChange={onCityChange}
        searchQuery=""
        onSearch={vi.fn()}
        onNavigate={vi.fn()}
        onLogin={vi.fn()}
        onLogout={vi.fn()}
      />,
    );
    expect(screen.queryByRole("button", { name: /Корзина/ })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Pocket Spots, главная" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Выбрать город: Братислава" }));
    fireEvent.change(screen.getByRole("textbox", { name: "Найти город" }), {
      target: { value: "кош" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Кошице" }));
    expect(onCityChange).toHaveBeenCalledWith("Кошице");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("opens account destinations, closes on Escape and outside click, and signs out", () => {
    const onNavigate = vi.fn();
    const onLogout = vi.fn();
    render(
      <SpotsHeader
        user={{
          id: "test",
          email: "test@example.com",
          first_name: "Test",
          last_name: "User",
          role: "customer",
          capabilities: ["customer"],
        }}
        screen="discover"
        city="Братислава"
        onCityChange={vi.fn()}
        searchQuery=""
        onSearch={vi.fn()}
        onNavigate={onNavigate}
        onLogin={vi.fn()}
        onLogout={onLogout}
      />,
    );
    const trigger = screen.getByRole("button", { name: "Меню аккаунта" });
    for (const [label, route] of [
      ["Личные данные", "profile"],
      ["Мои брони", "reservations"],
      ["Сохранённые места", "saved"],
      ["Уведомления", "notifications"],
      ["Безопасность", "settings"],
    ]) {
      fireEvent.click(trigger);
      fireEvent.click(screen.getByRole("menuitem", { name: label }));
      expect(onNavigate).toHaveBeenLastCalledWith(route);
      expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    }
    fireEvent.click(trigger);
    fireEvent.keyDown(document, { key: "Escape" });
    expect(trigger).toHaveFocus();
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    fireEvent.click(trigger);
    fireEvent.pointerDown(document.body);
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    fireEvent.click(trigger);
    fireEvent.click(screen.getByRole("menuitem", { name: "Выйти" }));
    expect(onLogout).toHaveBeenCalledOnce();
  });

  it("switches the language and preserves the current route", () => {
    render(
      <I18nProvider initialLocale="ru">
        <SpotsHeader
          user={{
            id: "test",
            email: "test@example.com",
            first_name: "Test",
            last_name: "User",
            role: "customer",
            capabilities: ["customer"],
          }}
          screen="discover"
          city="Братислава"
          onCityChange={vi.fn()}
          searchQuery=""
          onSearch={vi.fn()}
          onNavigate={vi.fn()}
          onLogin={vi.fn()}
          onLogout={vi.fn()}
        />
      </I18nProvider>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Язык интерфейса" }));
    fireEvent.click(screen.getByRole("menuitem", { name: "English" }));
    expect(replace).toHaveBeenCalledWith("/en/discover");
    expect(screen.getByRole("textbox", { name: "Find a place or service" })).toBeInTheDocument();
    expect(localStorage.getItem("pocket:locale")).toBe("en");
    expect(screen.queryByRole("menu", { name: "Interface language" })).not.toBeInTheDocument();
  });

  it("keeps the previous language modal for authenticated mobile users", () => {
    window.matchMedia = vi
      .fn()
      .mockReturnValue({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() });
    render(
      <I18nProvider initialLocale="ru">
        <SpotsHeader
          user={{
            id: "test",
            email: "test@example.com",
            first_name: "Test",
            last_name: "User",
            role: "customer",
            capabilities: ["customer"],
          }}
          screen="discover"
          city="Братислава"
          onCityChange={vi.fn()}
          searchQuery=""
          onSearch={vi.fn()}
          onNavigate={vi.fn()}
          onLogin={vi.fn()}
          onLogout={vi.fn()}
        />
      </I18nProvider>,
    );
    expect(screen.queryByRole("button", { name: "Открыть меню" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Язык интерфейса" }));
    const dialog = screen.getByRole("dialog", { name: "Язык интерфейса" });
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole("button", { name: "English" }));
    expect(replace).toHaveBeenCalledWith("/en/discover");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("adds a header shadow only after scrolling", () => {
    render(
      <SpotsHeader
        user={{
          id: "test",
          email: "test@example.com",
          first_name: "Test",
          last_name: "User",
          role: "customer",
          capabilities: ["customer"],
        }}
        screen="discover"
        city="Братислава"
        onCityChange={vi.fn()}
        searchQuery=""
        onSearch={vi.fn()}
        onNavigate={vi.fn()}
        onLogin={vi.fn()}
        onLogout={vi.fn()}
      />,
    );
    const header = screen.getByRole("banner");
    expect(header).not.toHaveClass("scrolled");
    Object.defineProperty(window, "scrollY", { configurable: true, value: 20 });
    fireEvent.scroll(window);
    expect(header).toHaveClass("scrolled");
    Object.defineProperty(window, "scrollY", { configurable: true, value: 0 });
    fireEvent.scroll(window);
  });
});
