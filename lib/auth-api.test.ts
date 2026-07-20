import { afterEach, describe, expect, it, vi } from "vitest";
import { AuthAPIError, getCurrentUser, login, logout, register } from "./auth-api";

afterEach(() => vi.unstubAllGlobals());

describe("auth API", () => {
  it("sends credentials with registration and returns user", async () => {
    const user = { id: "1", email: "user@example.com", first_name: "Denis", last_name: "Itkin", role: "customer" as const };
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ user }), { status: 201 }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(register({ first_name: "Denis", last_name: "Itkin", email: "user@example.com", password: "long safe password", role: "customer" })).resolves.toEqual(user);
	const [url, options] = fetchMock.mock.calls[0];
	expect(url).toMatch(/\/auth\/register$/);
	expect(options).toEqual(expect.objectContaining({ method: "POST", credentials: "include" }));
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).not.toHaveProperty("confirmPassword");
  });

  it("exposes safe API errors to the form", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ error: { code: "invalid_credentials", message: "Неверный e-mail или пароль" } }), { status: 401 })));
    await expect(login("user@example.com", "wrong")).rejects.toEqual(expect.objectContaining<AuthAPIError>({ code: "invalid_credentials", status: 401 }));
  });

  it("uses cookie credentials for session lookup and logout", async () => {
    const user = { id: "1", email: "user@example.com", first_name: "Denis", last_name: "Itkin", role: "customer" as const };
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ user }), { status: 200 }))
      .mockResolvedValueOnce(new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", fetchMock);

    await getCurrentUser();
    await logout();
    expect(fetchMock.mock.calls[0][1]).toEqual(expect.objectContaining({ method: "GET", credentials: "include" }));
    expect(fetchMock.mock.calls[1][1]).toEqual(expect.objectContaining({ method: "POST", credentials: "include" }));
  });
});
