import { apiRequest } from "./api-client";

export type StaffInvitation = {
  venue_id: string;
  venue_name: string;
  role: "manager" | "waiter";
  expires_at: string;
};
export async function staffInvitation(token: string, accept = false) {
  return (
    await apiRequest<{ invitation: StaffInvitation }>(
      `/staff/invitations/${accept ? "accept" : "inspect"}`,
      { method: "POST", body: JSON.stringify({ token }) },
    )
  ).invitation;
}
// Only invitation routes are allowed as a Vendor auth return destination.
export function vendorInviteReturnTo(value: string | undefined, locale: string): string {
  if (!value) return `/${locale}`;
  try {
    const url = new URL(value, "https://pocket.invalid");
    if (url.origin !== "https://pocket.invalid" || url.pathname !== `/${locale}/invite`)
      return `/${locale}`;
    const token = url.searchParams.get("token") ?? "";
    return /^[A-Za-z0-9_-]{32,256}$/.test(token)
      ? `/${locale}/invite?token=${encodeURIComponent(token)}`
      : `/${locale}`;
  } catch {
    return `/${locale}`;
  }
}
