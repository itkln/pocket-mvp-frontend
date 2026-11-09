// Restaurant IDs and table QR tokens that may appear in a Dish URL (/r/[venueID], /qr/[token]).
export const isDishLinkID = (value: string) => /^[a-zA-Z0-9_-]+$/.test(value);

export type DishSearchParams = Promise<Record<string, string | string[] | undefined>>;

export const queryValue = (value: string | string[] | undefined) =>
  typeof value === "string" ? value : undefined;
