import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { I18nProvider } from "../features/pocket/i18n";
import { APIError } from "../lib/api-client";
import { requestPasswordReset, resetPassword } from "../lib/auth-api";
import PasswordRecoveryPage from "./password-recovery-page";

vi.mock("next/image", () => ({ default: ({ alt }: React.ImgHTMLAttributes<HTMLImageElement>) => <span role="img" aria-label={alt ?? ""} /> }));
vi.mock("next/link", () => ({ default: ({ children, href, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => <a href={href} {...props}>{children}</a> }));
vi.mock("../lib/auth-api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../lib/auth-api")>();
  return { ...actual, requestPasswordReset: vi.fn(), resetPassword: vi.fn() };
});

beforeEach(() => {
  vi.clearAllMocks();
  window.localStorage.clear();
});

describe("PasswordRecoveryPage", () => {
  it("requests a reset without revealing whether the account exists", async () => {
    vi.mocked(requestPasswordReset).mockResolvedValue();
    render(<I18nProvider initialLocale="en"><PasswordRecoveryPage mode="request" /></I18nProvider>);

    fireEvent.change(await screen.findByLabelText("E-mail"), { target: { value: "user@example.com" } });
    fireEvent.click(await screen.findByRole("button", { name: "Send reset link" }));

    await waitFor(() => expect(requestPasswordReset).toHaveBeenCalledWith("user@example.com", "en"));
    expect(await screen.findByText("If an account with this e-mail exists, we sent a password reset link.")).toBeInTheDocument();
  });

  it("submits a new password with the URL token", async () => {
    vi.mocked(resetPassword).mockResolvedValue();
    render(<I18nProvider initialLocale="uk"><PasswordRecoveryPage mode="reset" token="single-use-token" /></I18nProvider>);

    fireEvent.change(await screen.findByLabelText("Новий пароль"), { target: { value: "a new secure password" } });
    fireEvent.change(await screen.findByLabelText("Повторіть новий пароль"), { target: { value: "a new secure password" } });
    fireEvent.click(await screen.findByRole("button", { name: "Зберегти пароль" }));

    await waitFor(() => expect(resetPassword).toHaveBeenCalledWith("single-use-token", "a new secure password"));
    expect(await screen.findByText("Пароль змінено")).toBeInTheDocument();
  });

  it("shows an expired-link error in Slovak", async () => {
    vi.mocked(resetPassword).mockRejectedValue(new APIError("invalid_reset_token", "Ссылка недействительна или устарела", 422));
    render(<I18nProvider initialLocale="sk"><PasswordRecoveryPage mode="reset" token="expired-token" /></I18nProvider>);

    fireEvent.change(await screen.findByLabelText("Nové heslo"), { target: { value: "a new secure password" } });
    fireEvent.change(await screen.findByLabelText("Zopakujte nové heslo"), { target: { value: "a new secure password" } });
    fireEvent.click(await screen.findByRole("button", { name: "Uložiť heslo" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Tento odkaz je neplatný alebo jeho platnosť vypršala");
  });
});
