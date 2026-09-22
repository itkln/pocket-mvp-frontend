import { afterEach, describe, expect, it, vi } from "vitest";
import { addSavedVenue, listSavedVenueIDs, removeSavedVenue } from "./saved-venues-api";

afterEach(() => vi.unstubAllGlobals());

describe("saved venues API", () => {
  it("uses the session cookie and never sends a client user ID", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ venue_ids: ["venue-uuid"] }), { status: 200 }))
      .mockResolvedValueOnce(new Response(null, { status: 204 }))
      .mockResolvedValueOnce(new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(listSavedVenueIDs()).resolves.toEqual(["venue-uuid"]);
    await addSavedVenue("venue-uuid");
    await removeSavedVenue("venue-uuid");

    expect(fetchMock.mock.calls.map(([url, init]) => [url, init.method, init.credentials])).toEqual([
      ["/api/v1/spots/me/saved-venues", undefined, "include"],
      ["/api/v1/spots/me/saved-venues/venue-uuid", "PUT", "include"],
      ["/api/v1/spots/me/saved-venues/venue-uuid", "DELETE", "include"],
    ]);
  });
});
