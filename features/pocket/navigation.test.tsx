import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { I18nProvider } from "./i18n";
import { Topbar } from "./navigation";

const replace = vi.fn();
vi.mock("next/navigation", () => ({ usePathname: () => "/ru/owner/overview", useRouter: () => ({ replace }) }));

describe("Topbar language menu", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
  });

  it("switches the whole interface and keeps the selected short code visible", async () => {
    render(<I18nProvider><Topbar
      role="owner"
      screen="overview"
      navigation={[{ id: "overview", label: "Обзор" }]}
      venueName="Pocket"
      cartCount={0}
      notifications={[]}
      onMenu={vi.fn()}
      onCart={vi.fn()}
      onNavigate={vi.fn()}
      onNotificationsRead={vi.fn()}
      onNotificationsClear={vi.fn()}
    /></I18nProvider>);

    fireEvent.click(screen.getByRole("button", { name: "Язык интерфейса: RU" }));
    fireEvent.click(screen.getByRole("menuitemradio", { name: "EN English" }));

    await waitFor(() => expect(screen.getByRole("button", { name: "Interface language: EN" })).toBeInTheDocument());
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    expect(screen.getByText("Overview")).toBeInTheDocument();
    expect(window.localStorage.getItem("pocket:locale")).toBe("en");
    expect(replace).toHaveBeenCalledWith("/en/owner/overview");
  });

  it("opens quick navigation and the notification history", () => {
    const onNavigate = vi.fn();
    const onNotificationsRead = vi.fn();
    render(<I18nProvider><Topbar
      role="owner"
      screen="overview"
      navigation={[{ id: "overview", label: "Обзор" }, { id: "menu", label: "Меню" }]}
      venueName="Pocket"
      cartCount={0}
      notifications={[{ id: 1, message: "Изменения сохранены", createdAt: 1, read: false }]}
      onMenu={vi.fn()}
      onCart={vi.fn()}
      onNavigate={onNavigate}
      onNotificationsRead={onNotificationsRead}
      onNotificationsClear={vi.fn()}
    /></I18nProvider>);

    fireEvent.click(screen.getByRole("button", { name: "Поиск" }));
    fireEvent.change(screen.getByPlaceholderText("Найти раздел"), { target: { value: "мен" } });
    fireEvent.click(screen.getByRole("button", { name: "Меню" }));
    expect(onNavigate).toHaveBeenCalledWith("menu");

    fireEvent.click(screen.getByRole("button", { name: "Уведомления" }));
    expect(onNotificationsRead).toHaveBeenCalled();
    expect(screen.getByText("Изменения сохранены")).toBeInTheDocument();
  });
});
