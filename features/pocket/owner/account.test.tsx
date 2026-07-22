import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { changePassword, type AuthUser } from "../../../lib/auth-api";
import { I18nProvider } from "../i18n";
import { AccountScreen } from "./account";

vi.mock("../../../lib/auth-api", async () => {
  const actual = await vi.importActual<typeof import("../../../lib/auth-api")>("../../../lib/auth-api");
  return { ...actual, changePassword: vi.fn() };
});

const user: AuthUser = {
  id: "user-1", email: "owner@example.com", first_name: "Denis", last_name: "Itkin",
  role: "venue_owner", capabilities: ["customer", "owner"],
};

describe("AccountScreen", () => {
  it("changes the owner password from account settings", async () => {
    vi.mocked(changePassword).mockResolvedValue(undefined);
    const notify = vi.fn();
    render(<I18nProvider><AccountScreen user={user} role="owner" notify={notify} onLogout={vi.fn()} /></I18nProvider>);

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

  it("uses the Ukrainian owner-settings labels", async () => {
    render(<I18nProvider initialLocale="ua"><AccountScreen user={user} role="owner" notify={vi.fn()} onLogout={vi.fn()} /></I18nProvider>);
    await waitFor(() => expect(screen.getAllByText("Налаштування власника").length).toBeGreaterThan(0));
    expect(screen.queryByText("Акаунт Pocket")).not.toBeInTheDocument();
  });
});
