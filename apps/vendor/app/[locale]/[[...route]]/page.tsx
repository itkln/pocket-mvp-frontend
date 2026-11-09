import { notFound, redirect } from "next/navigation";
import StaffInvitationPage from "@pocket/shared/staff-invitation-page";
import AuthPage from "@pocket/shared/auth-page";
import PasswordRecoveryPage from "@pocket/shared/password-recovery-page";
import VendorApp from "@pocket/shared/vendor-app";
import { isLocale } from "@pocket/features/pocket/locales";

type VendorRole = "owner" | "staff";
const isVendorRole = (value: string | undefined): value is VendorRole =>
  value === "owner" || value === "staff";

export default async function LocalizedVendorPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; route?: string[] }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { locale, route = [] } = await params;
  if (locale === "uk") {
    const query = await searchParams;
    const nextQuery = new URLSearchParams();
    Object.entries(query).forEach(([key, value]) =>
      (Array.isArray(value) ? value : [value]).forEach((item) => {
        if (item !== undefined) nextQuery.append(key, item);
      }),
    );
    redirect(
      `/ua${route.length ? `/${route.map(encodeURIComponent).join("/")}` : ""}${nextQuery.size ? `?${nextQuery.toString()}` : ""}`,
    );
  }
  if (!isLocale(locale)) notFound();
  const query = await searchParams;
  const returnTo = typeof query.returnTo === "string" ? query.returnTo : undefined;
  if (route[0] === "invite")
    return route.length === 1 ? (
      <StaffInvitationPage token={typeof query.token === "string" ? query.token : ""} />
    ) : (
      notFound()
    );
  if (route[0] === "login")
    return route.length === 1 ? (
      <AuthPage mode="login" product="vendor" returnTo={returnTo} />
    ) : (
      notFound()
    );
  if (route[0] === "register")
    return route.length === 1 ? (
      <AuthPage mode="register" product="vendor" returnTo={returnTo} />
    ) : (
      notFound()
    );
  if (route[0] === "forgot-password")
    return route.length === 1 ? (
      <PasswordRecoveryPage mode="request" product="vendor" />
    ) : (
      notFound()
    );
  if (route[0] === "reset-password") {
    if (route.length !== 1) notFound();
    const query = await searchParams;
    return (
      <PasswordRecoveryPage
        mode="reset"
        product="vendor"
        token={typeof query.token === "string" ? query.token : ""}
      />
    );
  }
  if (route.length > 0 && !isVendorRole(route[0])) notFound();
  if (route.length > 2) notFound();
  return (
    <VendorApp initialRole={isVendorRole(route[0]) ? route[0] : "owner"} initialScreen={route[1]} />
  );
}
