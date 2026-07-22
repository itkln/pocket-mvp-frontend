import { notFound, redirect } from "next/navigation";
import AuthPage from "../../auth-page";
import PasswordRecoveryPage from "../../password-recovery-page";
import PocketApp from "../../pocket-app";
import { isLocale } from "../../../features/pocket/locales";
import { type Role } from "../../../features/pocket/model";

const isRole = (value: string | undefined): value is Role => value === "owner" || value === "customer" || value === "staff";

export default async function LocalizedPage({ params, searchParams }: { params: Promise<{ locale: string; route?: string[] }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { locale, route = [] } = await params;
  if (locale === "uk") {
    const query = await searchParams;
    const nextQuery = new URLSearchParams();
    Object.entries(query).forEach(([key, value]) => (Array.isArray(value) ? value : [value]).forEach((item) => { if (item !== undefined) nextQuery.append(key, item); }));
    const suffix = nextQuery.size ? `?${nextQuery.toString()}` : "";
    redirect(`/ua${route.length ? `/${route.map(encodeURIComponent).join("/")}` : ""}${suffix}`);
  }
  if (!isLocale(locale)) notFound();
  if (route[0] === "login") return route.length === 1 ? <AuthPage mode="login" /> : notFound();
  if (route[0] === "register") return route.length === 1 ? <AuthPage mode="register" /> : notFound();
  if (route[0] === "forgot-password") return route.length === 1 ? <PasswordRecoveryPage mode="request" /> : notFound();
  if (route[0] === "reset-password") {
    if (route.length !== 1) notFound();
    const query = await searchParams;
    const token = typeof query.token === "string" ? query.token : "";
    return <PasswordRecoveryPage mode="reset" token={token} />;
  }
  if (route.length > 0 && !isRole(route[0])) notFound();
  if (route.length > 2) notFound();
  return <PocketApp initialRole={isRole(route[0]) ? route[0] : undefined} initialScreen={route[1]} />;
}
