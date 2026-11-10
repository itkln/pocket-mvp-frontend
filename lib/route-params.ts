// Helpers for the searchParams prop of Next pages in Dish and Vendor.
export type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export const queryValue = (value: string | string[] | undefined) =>
  typeof value === "string" ? value : undefined;
