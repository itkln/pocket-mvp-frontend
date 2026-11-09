import { notFound, redirect } from "next/navigation";
import AuthPage from "@pocket/shared/auth-page";
import DishApp from "@pocket/shared/dish-app";
import PasswordRecoveryPage from "@pocket/shared/password-recovery-page";
import { isLocale } from "@pocket/features/pocket/locales";

export default async function DishPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; route?: string[] }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { locale, route = [] } = await params;
  const query = await searchParams;
  if (locale === "uk") {
    const next = new URLSearchParams();
    Object.entries(query).forEach(([key, value]) =>
      (Array.isArray(value) ? value : [value]).forEach((item) => {
        if (item !== undefined) next.append(key, item);
      }),
    );
    redirect(
      `/ua${route.length ? `/${route.map(encodeURIComponent).join("/")}` : ""}${next.size ? `?${next}` : ""}`,
    );
  }
  if (!isLocale(locale)) notFound();
  const returnTo = typeof query.returnTo === "string" ? query.returnTo : undefined;
  if (["login", "register", "forgot-password", "reset-password"].includes(route[0])) {
    if (route.length !== 1) notFound();
    if (route[0] === "login" || route[0] === "register")
      return <AuthPage mode={route[0]} product="dish" returnTo={returnTo} />;
    return (
      <PasswordRecoveryPage
        mode={route[0] === "forgot-password" ? "request" : "reset"}
        product="dish"
        token={typeof query.token === "string" ? query.token : ""}
        returnTo={returnTo}
      />
    );
  }
  // Existing printed QR and venue links remain valid on the same origin.
  if (route[0] === "venue" && route.length === 2) {
    const next = new URLSearchParams();
    Object.entries(query).forEach(([key, value]) =>
      (Array.isArray(value) ? value : [value]).forEach((item) => {
        if (item !== undefined && key !== "from") next.append(key, item);
      }),
    );
    redirect(`/${locale}/r/${encodeURIComponent(route[1])}${next.size ? `?${next}` : ""}`);
  }
  const accountScreens = ["profile", "reservations", "settings", "notifications"];
  if ((route[0] === "r" || route[0] === "qr") && route[1] && /^[a-zA-Z0-9_-]+$/.test(route[1])) {
    const isTable = route[0] === "qr";
    const child = route[2];
    if (
      route.length > 3 ||
      (child &&
        !accountScreens.includes(child) &&
        !(isTable ? ["menu", "bill"] : ["reservation", "menu"]).includes(child))
    )
      notFound();
    const screen = isTable
      ? child === "menu"
        ? "table"
        : child === "bill"
          ? "table-bill"
          : (child ?? "table-home")
      : (child ?? "menu");
    return (
      <DishApp
        key={route.join("/")}
        initialScreen={screen}
        venueID={isTable ? undefined : route[1]}
        qrToken={isTable ? route[1] : undefined}
      />
    );
  }
  // Dish has no general homepage, profile or restaurant catalog.
  notFound();
}
