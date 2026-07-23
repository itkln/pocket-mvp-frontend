import { afterEach, describe, expect, it, vi } from "vitest";
import { changePassword, getCurrentUser, login, logout, register, requestPasswordReset, resetPassword, updateProfile } from "./auth-api";

afterEach(() => vi.unstubAllGlobals());

describe("auth API", () => {
  it("sends credentials with registration and returns user", async () => {
    const user = { id: "1", email: "user@example.com", first_name: "Denis", last_name: "Itkin", role: "customer" as const, capabilities: ["customer" as const] };
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ user }), { status: 201 }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(register({ first_name: "Denis", last_name: "Itkin", email: "user@example.com", password: "long safe password" })).resolves.toEqual(user);
	const [url, options] = fetchMock.mock.calls[0];
	expect(url).toMatch(/\/auth\/register$/);
	expect(options).toEqual(expect.objectContaining({ method: "POST", credentials: "include" }));
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).not.toHaveProperty("confirmPassword");
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).not.toHaveProperty("role");
  });

  it("exposes safe API errors to the form", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ error: { code: "invalid_credentials", message: "Неверный e-mail или пароль" } }), { status: 401 })));
    await expect(login("user@example.com", "wrong")).rejects.toMatchObject({ code: "invalid_credentials", status: 401 });
  });

  it("uses cookie credentials for session lookup and logout", async () => {
    const user = { id: "1", email: "user@example.com", first_name: "Denis", last_name: "Itkin", role: "customer" as const, capabilities: ["customer" as const] };
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ user }), { status: 200 }))
      .mockResolvedValueOnce(new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", fetchMock);

    await getCurrentUser();
    await logout();
    expect(fetchMock.mock.calls[0][1]).toEqual(expect.objectContaining({ method: "GET", credentials: "include" }));
    expect(fetchMock.mock.calls[1][1]).toEqual(expect.objectContaining({ method: "POST", credentials: "include" }));
  });

  it("updates the authenticated profile", async () => {
    const user = { id: "1", email: "user@example.com", first_name: "Denys", last_name: "Itkin", phone: "+421 900 123 456", role: "customer" as const, capabilities: ["customer" as const] };
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ user }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(updateProfile({ first_name: "Denys", last_name: "Itkin", phone: "+421 900 123 456" })).resolves.toEqual(user);
    expect(fetchMock.mock.calls[0][0]).toMatch(/\/auth\/me$/);
    expect(fetchMock.mock.calls[0][1]).toEqual(expect.objectContaining({ method: "PATCH", credentials: "include" }));
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ first_name: "Denys", last_name: "Itkin", phone: "+421 900 123 456" });
  });

  it("requests and confirms a password reset", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ status: "accepted" }), { status: 202 }))
      .mockResolvedValueOnce(new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", fetchMock);

    await requestPasswordReset("user@example.com", "sk");
    await resetPassword("single-use-token", "a new secure password");

    expect(fetchMock.mock.calls[0][0]).toMatch(/\/auth\/password-reset\/request$/);
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ email: "user@example.com", locale: "sk" });
    expect(fetchMock.mock.calls[1][0]).toMatch(/\/auth\/password-reset\/confirm$/);
    expect(JSON.parse(fetchMock.mock.calls[1][1].body)).toEqual({ token: "single-use-token", password: "a new secure password" });
  });

  it("changes the password through the authenticated endpoint", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", fetchMock);

    await changePassword("old secure password", "new secure password");

    expect(fetchMock.mock.calls[0][0]).toMatch(/\/auth\/password\/change$/);
    expect(fetchMock.mock.calls[0][1]).toEqual(expect.objectContaining({ method: "POST", credentials: "include" }));
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ current_password: "old secure password", new_password: "new secure password" });
  });
});
