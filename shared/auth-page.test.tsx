import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import AuthPage from "./auth-page";
import { login, register } from "../lib/auth-api";
import { APIError } from "../lib/api-client";
import { I18nProvider } from "../features/pocket/i18n";

const replace = vi.fn();
const refresh = vi.fn();

vi.mock("next/navigation", () => ({ useRouter: () => ({ replace, refresh }) }));
vi.mock("next/image", () => ({ default: ({ priority, ...props }: React.ImgHTMLAttributes<HTMLImageElement> & { priority?: boolean }) => {
  void priority;
  return <span role="img" aria-label={props.alt ?? ""} />;
} }));
vi.mock("next/link", () => ({ default: ({ children, href, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => <a href={href} {...props}>{children}</a> }));
vi.mock("../lib/auth-api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../lib/auth-api")>();
  return { ...actual, login: vi.fn(), register: vi.fn() };
});

beforeEach(() => {
  vi.clearAllMocks();
  window.localStorage.clear();
});

describe("AuthPage", () => {
  it("does not register when passwords differ", async () => {
    render(<AuthPage mode="register" />);
    fireEvent.change(screen.getByLabelText("Имя"), { target: { value: "Denis" } });
    fireEvent.change(screen.getByLabelText("Фамилия"), { target: { value: "Itkin" } });
    fireEvent.change(screen.getByLabelText("E-mail"), { target: { value: "user@example.com" } });
    fireEvent.change(screen.getByLabelText("Пароль"), { target: { value: "a secure password" } });
    fireEvent.change(screen.getByLabelText("Повторите пароль"), { target: { value: "a different password" } });
    fireEvent.click(screen.getByLabelText(/Я принимаю/));
    fireEvent.click(screen.getByRole("button", { name: "Зарегистрироваться" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Пароли не совпадают");
    expect(register).not.toHaveBeenCalled();
  });

  it("registers one neutral account without an account role", async () => {
    vi.mocked(register).mockResolvedValue({ id: "1", email: "user@example.com", first_name: "Denis", last_name: "Itkin", role: "customer", capabilities: ["customer"] });
    render(<AuthPage mode="register" />);
    expect(screen.queryByText("Выберите роль")).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Имя"), { target: { value: "Denis" } });
    fireEvent.change(screen.getByLabelText("Фамилия"), { target: { value: "Itkin" } });
    fireEvent.change(screen.getByLabelText("E-mail"), { target: { value: "user@example.com" } });
    fireEvent.change(screen.getByLabelText("Пароль"), { target: { value: "a secure password" } });
    fireEvent.change(screen.getByLabelText("Повторите пароль"), { target: { value: "a secure password" } });
    fireEvent.click(screen.getByLabelText(/Я принимаю/));
    fireEvent.click(screen.getByRole("button", { name: "Зарегистрироваться" }));
    await waitFor(() => expect(register).toHaveBeenCalledWith({
      first_name: "Denis",
      last_name: "Itkin",
      email: "user@example.com",
      password: "a secure password",
    }));
    expect(replace).toHaveBeenCalledWith("/ru");
  });

  it("logs in and redirects after success", async () => {
    vi.mocked(login).mockResolvedValue({ id: "1", email: "user@example.com", first_name: "Denis", last_name: "Itkin", role: "customer", capabilities: ["customer"] });
    render(<AuthPage mode="login" />);
    fireEvent.change(screen.getByLabelText("E-mail"), { target: { value: "user@example.com" } });
    fireEvent.change(screen.getByLabelText("Пароль"), { target: { value: "a secure password" } });
    fireEvent.click(screen.getByRole("button", { name: "Войти" }));
    await waitFor(() => expect(login).toHaveBeenCalledWith("user@example.com", "a secure password"));
    expect(replace).toHaveBeenCalledWith("/ru");
    expect(refresh).toHaveBeenCalled();
  });

  it("shows backend errors in the language selected in the URL", async () => {
    vi.mocked(login).mockRejectedValue(new APIError("invalid_credentials", "Неверный e-mail или пароль", 401));
    render(<I18nProvider initialLocale="en"><AuthPage mode="login" /></I18nProvider>);

    fireEvent.change(await screen.findByLabelText("E-mail"), { target: { value: "user@example.com" } });
    fireEvent.change(await screen.findByLabelText("Password"), { target: { value: "wrong password" } });
    fireEvent.click(await screen.findByRole("button", { name: "Sign in" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Incorrect e-mail or password");
    expect(screen.getByRole("alert")).not.toHaveTextContent("Неверный");
  });

  it("links the login form to password recovery in the active locale", () => {
    render(<I18nProvider initialLocale="sk"><AuthPage mode="login" /></I18nProvider>);
    expect(screen.getByRole("link", { name: "Zabudli ste heslo?" })).toHaveAttribute("href", "/sk/forgot-password");
  });
});
