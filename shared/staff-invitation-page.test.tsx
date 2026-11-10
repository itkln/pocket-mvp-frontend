import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import StaffInvitationPage from "./staff-invitation-page";
import { getCurrentUser, AuthAPIError } from "../lib/auth-api";
import { staffInvitation, vendorInviteReturnTo } from "../lib/staff-invitations";
const replace = vi.fn();
const refresh = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace, refresh }) }));
vi.mock("../lib/auth-api", async (original) => ({
  ...(await original<typeof import("../lib/auth-api")>()),
  getCurrentUser: vi.fn(),
  logout: vi.fn(),
}));
vi.mock("../lib/staff-invitations", async (original) => ({
  ...(await original<typeof import("../lib/staff-invitations")>()),
  staffInvitation: vi.fn(),
}));
const token = "a".repeat(43);
const invitation = {
  venue_id: "venue",
  venue_name: "Test Bistro",
  role: "waiter" as const,
  expires_at: "2026-11-07T12:00:00Z",
};
beforeEach(() => {
  vi.clearAllMocks();
  window.localStorage.clear();
  vi.mocked(getCurrentUser).mockResolvedValue({
    id: "staff",
    email: "staff@example.com",
    first_name: "Test",
    last_name: "Staff",
    role: "customer",
    capabilities: ["customer"],
  });
  vi.mocked(staffInvitation).mockResolvedValue(invitation);
});
it("keeps invitation in login and registration links", async () => {
  vi.mocked(getCurrentUser).mockRejectedValue(new AuthAPIError("unauthorized", "", 401));
  render(<StaffInvitationPage token={token} />);
  const login = await screen.findByRole("link", { name: "Войти" });
  expect(
    new URL(login.getAttribute("href")!, "http://localhost").searchParams.get("returnTo"),
  ).toBe(`/ru/invite?token=${token}`);
  expect(screen.getByRole("link", { name: "Создать аккаунт" })).toBeVisible();
  expect(staffInvitation).not.toHaveBeenCalled();
});
it("inspects before explicit acceptance; accepts once and selects assigned workplace", async () => {
  render(<StaffInvitationPage token={token} />);
  const button = await screen.findByRole("button", { name: "Принять приглашение" });
  expect(staffInvitation).toHaveBeenCalledTimes(1);
  let finish!: (value: typeof invitation) => void;
  vi.mocked(staffInvitation).mockImplementation(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
  );
  fireEvent.click(button);
  fireEvent.click(button);
  expect(button).toBeDisabled();
  expect(staffInvitation).toHaveBeenCalledTimes(2);
  expect(staffInvitation).toHaveBeenLastCalledWith(token, true);
  await act(async () => finish(invitation));
  await waitFor(() => expect(replace).toHaveBeenCalledWith("/ru/staff/service"));
  expect(Object.values(window.localStorage)).toContain("venue");
});
it("does not offer acceptance to a different email", async () => {
  vi.mocked(staffInvitation).mockRejectedValue(new AuthAPIError("forbidden", "", 403));
  render(<StaffInvitationPage token={token} />);
  expect(await screen.findByRole("alert")).toHaveTextContent("Войдите с e-mail");
  expect(screen.queryByRole("button", { name: "Принять приглашение" })).not.toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Войти в другой аккаунт" })).toBeVisible();
});
it("shows expired/revoked errors without a success redirect", async () => {
  vi.mocked(staffInvitation).mockRejectedValue(new AuthAPIError("not_found", "", 404));
  render(<StaffInvitationPage token={token} />);
  expect(await screen.findByRole("alert")).toHaveTextContent("срок ссылки истёк");
  expect(replace).not.toHaveBeenCalled();
});
it("rejects unsafe auth return destinations", () => {
  for (const value of [
    "https://evil.example/ru/invite?token=" + token,
    "//evil.example/x",
    "/ru/owner/overview",
    "/ru/invite?token=invalid",
  ]) {
    expect(vendorInviteReturnTo(value, "ru")).toBe("/ru");
  }
  expect(vendorInviteReturnTo("/ru/invite?token=" + token, "ru")).toBe("/ru/invite?token=" + token);
});
