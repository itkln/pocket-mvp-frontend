import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  clearSavedPublicReservation,
  createPublicReservation,
  getSavedPublicReservation,
  getPublicVenue,
  getPublicVenueMenu,
  getPublicVenueReviews,
} from "./public-catalog-api";

describe("public catalog API", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    window.sessionStorage.clear();
    fetchMock.mockReset();
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          venues: [],
          page: 2,
          page_size: 12,
          total: 0,
          total_pages: 0,
          has_next: false,
        }),
        { status: 200 },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);
  });

  it("loads a selected venue by ID", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ venue: { id: "venue-id", name: "Renamed venue" } }), {
        status: 200,
      }),
    );
    await expect(getPublicVenue("venue-id")).resolves.toMatchObject({
      id: "venue-id",
      name: "Renamed venue",
    });
    expect(fetchMock.mock.calls[0][0]).toBe("/api/v1/public/venues/venue-id");
  });

  it("loads the published menu without owner credentials", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ categories: [{ id: "lunch", name: "Lunch", items: [] }] }), {
        status: 200,
      }),
    );
    await expect(getPublicVenueMenu("venue-id")).resolves.toMatchObject([{ id: "lunch" }]);
    expect(fetchMock.mock.calls[0][0]).toBe("/api/v1/public/venues/venue-id/menu");
    expect(fetchMock.mock.calls[0][1]).toMatchObject({ cache: "no-store" });
  });

  it("loads published reviews without owner credentials", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ reviews: [{ id: "review-1", rating: 5 }] }), { status: 200 }),
    );
    await expect(getPublicVenueReviews("venue-id")).resolves.toMatchObject([
      { id: "review-1", rating: 5 },
    ]);
    expect(fetchMock.mock.calls[0][0]).toBe("/api/v1/public/venues/venue-id/reviews");
  });

  it("holds, confirms and reloads a reservation with the same operation key", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({ hold: { id: "booking-1", expires_at: "2026-10-01T15:00:00Z" } }),
        { status: 201 },
      ),
    );
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ reservation: { id: "booking-1", code: "ABC123" } }), {
        status: 201,
      }),
    );
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ reservation: { id: "booking-1", code: "ABC123" } }), {
        status: 200,
      }),
    );
    const input = {
      starts_at: "2026-10-01T16:00:00Z",
      guests: 2,
      guest_name: "Anna",
      guest_phone: "+421900123456",
      guest_email: "",
      notes: "Window",
      items: [{ menu_item_id: "dish-1", quantity: 2, expected_price_minor: 1200 }],
      idempotency_key: "booking-key-123456",
    };
    await expect(createPublicReservation("venue-id", input)).resolves.toMatchObject({
      id: "booking-1",
    });
    const [path, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(path).toBe("/api/v1/public/venues/venue-id/reservations/holds");
    expect(init).toMatchObject({ method: "POST", credentials: "include", cache: "no-store" });
    expect(JSON.parse(init.body as string)).toEqual(input);
    expect(fetchMock.mock.calls[1][0]).toBe(
      "/api/v1/public/venues/venue-id/reservations/booking-1/confirm",
    );
    expect(JSON.parse(fetchMock.mock.calls[1][1].body as string)).toEqual(input);
    await expect(getSavedPublicReservation("venue-id")).resolves.toMatchObject({
      id: "booking-1",
      code: "ABC123",
    });
    expect(fetchMock.mock.calls[2][1].headers.get("X-Reservation-Key")).toBe(input.idempotency_key);
    clearSavedPublicReservation("venue-id");
    await expect(getSavedPublicReservation("venue-id")).resolves.toBeNull();
  });
});
