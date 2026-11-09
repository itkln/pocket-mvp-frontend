import { describe, expect, it } from "vitest";
import { spotsAuthPath, spotsReturnTo } from "./spots-auth-navigation";

describe("Spots authentication return paths", () => {
  it("preserves the selected venue and the complete search source", () => {
    const source = "/sk/restaurants?q=bistro&filter=Open&city=Bratislava";
    const target = `/sk/venue/venue-1?${new URLSearchParams({ from: source })}#menu`;
    expect(spotsReturnTo(target, "sk")).toBe(target);
    const login = new URL(spotsAuthPath("sk", "login", target), "https://pocket.local");
    expect(login.pathname).toBe("/sk/login");
    expect(login.searchParams.get("returnTo")).toBe(target);
  });

  it.each([
    "https://example.com/ru/discover",
    "//example.com/ru/discover",
    "javascript:alert(1)",
    "/ru\\example.com",
    "/ru\n/discover",
    "/en/discover",
    "/ru/login",
    "/ru/register",
    "/ru/forgot-password",
    "/ru/api/auth/me",
    "/ru/venue",
    "/ru/venue/id/extra",
    "/ru/unknown",
    "/ru/../api/auth/me",
    "/ru/venue/%2f%2fexample.com",
  ])("rejects unsafe or unsupported destination %s", (target) => {
    expect(spotsReturnTo(target, "ru")).toBe("/ru");
  });
});
