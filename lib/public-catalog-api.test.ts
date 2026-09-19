import { beforeEach, describe, expect, it, vi } from "vitest";
import { catalogCityValue, listPublicVenues } from "./public-catalog-api";

describe("public catalog API", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ venues: [], page: 2, page_size: 12, total: 0, total_pages: 0, has_next: false }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
  });

  it("maps localized cities and sends search, filter and pagination to the server", async () => {
    await listPublicVenues({ city: "Братислава", query: " coffee ", category: "restaurants", filter: "Лучшие", page: 2, pageSize: 12 });

    const [requestURL, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const url = new URL(requestURL, "http://pocket.local");
    expect(url.pathname).toBe("/api/v1/public/venues");
    expect(Object.fromEntries(url.searchParams)).toEqual({ city: "Bratislava", q: "coffee", category: "restaurants", filter: "Лучшие", page: "2", page_size: "12" });
    expect(init.credentials).toBe("include");
  });

  it("keeps canonical city names and omits the all filter", async () => {
    await listPublicVenues({ city: "Bratislava", filter: "Все" });
    const url = new URL(fetchMock.mock.calls[0][0] as string, "http://pocket.local");
    expect(url.searchParams.get("city")).toBe("Bratislava");
    expect(url.searchParams.has("filter")).toBe(false);
    expect(catalogCityValue("Кошице")).toBe("Košice");
  });
});
