import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import AuthPage from "./auth-page";
import { login, register } from "../lib/auth-api";

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

  it("logs in and redirects after success", async () => {
    vi.mocked(login).mockResolvedValue({ id: "1", email: "user@example.com", first_name: "Denis", last_name: "Itkin", role: "customer" });
    render(<AuthPage mode="login" />);
    fireEvent.change(screen.getByLabelText("E-mail"), { target: { value: "user@example.com" } });
    fireEvent.change(screen.getByLabelText("Пароль"), { target: { value: "a secure password" } });
    fireEvent.click(screen.getByRole("button", { name: "Войти" }));
    await waitFor(() => expect(login).toHaveBeenCalledWith("user@example.com", "a secure password"));
    expect(replace).toHaveBeenCalledWith("/");
    expect(refresh).toHaveBeenCalled();
  });
});
