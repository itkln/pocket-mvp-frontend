import { notFound } from "next/navigation";
import DishApp from "@pocket/shared/dish-app";
import { isDishLinkID } from "@pocket/lib/dish-links";

export default async function TableLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  if (!isDishLinkID(token)) notFound();
  return <DishApp qrToken={token}>{children}</DishApp>;
}
