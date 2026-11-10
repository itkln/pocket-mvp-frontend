import { notFound } from "next/navigation";
import DishApp from "@pocket/shared/dish-app";
import { isDishLinkID } from "@pocket/lib/dish-links";

export default async function RestaurantLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ venueID: string }>;
}) {
  const { venueID } = await params;
  if (!isDishLinkID(venueID)) notFound();
  return <DishApp venueID={venueID}>{children}</DishApp>;
}
