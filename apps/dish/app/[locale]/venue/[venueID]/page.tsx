import { redirect } from "next/navigation";
import type { DishSearchParams } from "@pocket/lib/dish-links";

// Printed QR codes and old venue links point at /venue/[id]; the restaurant page is /r/[id].
export default async function LegacyVenuePage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; venueID: string }>;
  searchParams: DishSearchParams;
}) {
  const [{ locale, venueID }, query] = await Promise.all([params, searchParams]);
  const next = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) =>
    (Array.isArray(value) ? value : [value]).forEach((item) => {
      if (item !== undefined && key !== "from") next.append(key, item);
    }),
  );
  redirect(`/${locale}/r/${encodeURIComponent(venueID)}${next.size ? `?${next}` : ""}`);
}
