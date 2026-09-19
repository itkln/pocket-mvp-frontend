import { notFound, redirect } from "next/navigation";
import AuthPage from "@pocket/shared/auth-page";
import SpotsApp from "@pocket/shared/spots-app";
import PasswordRecoveryPage from "@pocket/shared/password-recovery-page";
import { isLocale } from "@pocket/features/pocket/locales";
import { categoryForRoute } from "@pocket/features/pocket/customer/categories";

export default async function LocalizedSpotsPage({ params, searchParams }: { params: Promise<{ locale: string; route?: string[] }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { locale, route = [] } = await params;
  if (categoryForRoute(locale) && route.length === 0) {
    const query = await searchParams;
    const nextQuery = new URLSearchParams();
    Object.entries(query).forEach(([key, value]) => (Array.isArray(value) ? value : [value]).forEach((item) => { if (item !== undefined) nextQuery.append(key, item); }));
    redirect(`/ru/${locale}${nextQuery.size ? `?${nextQuery}` : ""}`);
  }
  if (locale === "uk") {
    const query = await searchParams;
    const nextQuery = new URLSearchParams();
    Object.entries(query).forEach(([key, value]) => (Array.isArray(value) ? value : [value]).forEach((item) => { if (item !== undefined) nextQuery.append(key, item); }));
    redirect(`/ua${route.length ? `/${route.map(encodeURIComponent).join("/")}` : ""}${nextQuery.size ? `?${nextQuery.toString()}` : ""}`);
  }
  if (!isLocale(locale)) notFound();
  if (route[0] === "login") return route.length === 1 ? <AuthPage mode="login" product="spots" /> : notFound();
  if (route[0] === "register") return route.length === 1 ? <AuthPage mode="register" product="spots" /> : notFound();
  if (route[0] === "forgot-password") return route.length === 1 ? <PasswordRecoveryPage mode="request" product="spots" /> : notFound();
  if (route[0] === "reset-password") {
    if (route.length !== 1) notFound();
    const query = await searchParams;
    return <PasswordRecoveryPage mode="reset" product="spots" token={typeof query.token === "string" ? query.token : ""} />;
  }
  if (route.length > 1) notFound();
  return <SpotsApp initialScreen={route[0]} />;
}
