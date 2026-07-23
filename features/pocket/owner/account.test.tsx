import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { changePassword, updateProfile, type AuthUser } from "../../../lib/auth-api";
import { I18nProvider } from "../i18n";
import { AccountScreen } from "./account";

vi.mock("../../../lib/auth-api", async () => {
  const actual = await vi.importActual<typeof import("../../../lib/auth-api")>("../../../lib/auth-api");
  return { ...actual, changePassword: vi.fn(), updateProfile: vi.fn() };
});
vi.mock("next/navigation", () => ({ usePathname: () => "/ru/owner/account", useRouter: () => ({ replace: vi.fn() }) }));

const user: AuthUser = {
  id: "user-1", email: "owner@example.com", first_name: "Denis", last_name: "Itkin",
  role: "venue_owner", capabilities: ["customer", "owner"],
};

describe("AccountScreen", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
  });

  it("changes the owner password from account settings", async () => {
    vi.mocked(changePassword).mockResolvedValue(undefined);
    const notify = vi.fn();
    render(<I18nProvider><AccountScreen user={user} notify={notify} onLogout={vi.fn()} onUpdate={vi.fn()} /></I18nProvider>);

    fireEvent.click(screen.getByRole("button", { name: "Безопасность" }));
    fireEvent.click(screen.getByRole("button", { name: "Изменить пароль" }));
    fireEvent.change(screen.getByLabelText("Текущий пароль"), { target: { value: "old secure password" } });
    fireEvent.change(screen.getByLabelText("Новый пароль"), { target: { value: "new secure password" } });
    fireEvent.change(screen.getByLabelText("Повторите новый пароль"), { target: { value: "new secure password" } });
    fireEvent.click(screen.getByRole("button", { name: "Сохранить пароль" }));

    await waitFor(() => {
      expect(changePassword).toHaveBeenCalledWith("old secure password", "new secure password");
      expect(notify).toHaveBeenCalledWith("Пароль изменен");
    });
  });

  it("updates the shared profile", async () => {
    const updated = { ...user, first_name: "Denys", phone: "+421 900 123 456" };
    vi.mocked(updateProfile).mockResolvedValue(updated);
    const notify = vi.fn();
    const onUpdate = vi.fn();
    render(<I18nProvider><AccountScreen user={user} notify={notify} onLogout={vi.fn()} onUpdate={onUpdate} /></I18nProvider>);

    fireEvent.change(screen.getByLabelText("Имя"), { target: { value: "Denys" } });
    fireEvent.change(screen.getByLabelText("Телефон"), { target: { value: "+421 900 123 456" } });
    fireEvent.click(screen.getByRole("button", { name: "Сохранить изменения" }));

    await waitFor(() => {
      expect(updateProfile).toHaveBeenCalledWith({ first_name: "Denys", last_name: "Itkin", phone: "+421 900 123 456" });
      expect(onUpdate).toHaveBeenCalledWith(updated);
      expect(notify).toHaveBeenCalledWith("Профиль сохранен");
    });
  });

  it("uses the Ukrainian shared-settings labels", async () => {
    render(<I18nProvider initialLocale="ua"><AccountScreen user={user} notify={vi.fn()} onLogout={vi.fn()} onUpdate={vi.fn()} /></I18nProvider>);
    await waitFor(() => expect(screen.getAllByText("Налаштування").length).toBeGreaterThan(0));
    expect(screen.queryByText("Акаунт Pocket")).not.toBeInTheDocument();
  });
});
