import { notFound } from "next/navigation";
import AuthPage from "../../auth-page";
import PocketApp from "../../pocket-app";
import { isLocale } from "../../../features/pocket/locales";
import { type Role } from "../../../features/pocket/model";

const isRole = (value: string | undefined): value is Role => value === "owner" || value === "customer" || value === "staff";

export default async function LocalizedPage({ params }: { params: Promise<{ locale: string; route?: string[] }> }) {
  const { locale, route = [] } = await params;
  if (!isLocale(locale)) notFound();
  if (route[0] === "login") return route.length === 1 ? <AuthPage mode="login" /> : notFound();
  if (route[0] === "register") return route.length === 1 ? <AuthPage mode="register" /> : notFound();
  if (route.length > 0 && !isRole(route[0])) notFound();
  if (route.length > 2) notFound();
  return <PocketApp initialRole={isRole(route[0]) ? route[0] : undefined} initialScreen={route[1]} />;
}
