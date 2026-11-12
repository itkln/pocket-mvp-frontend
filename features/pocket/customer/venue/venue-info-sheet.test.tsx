import { render, screen, within } from "@testing-library/react";
import { createRef } from "react";
import { describe, expect, it, vi } from "vitest";
import { defaultOpeningHours } from "../../../../lib/opening-hours";
import type { PublicVenue } from "../../../../lib/public-catalog-api";
import { VenueInfoSheet } from "./venue-info-sheet";

const venue: PublicVenue = {
  id: "venue-1",
  slug: "bistro",
  name: "Bistro",
  category_slug: "restaurants",
  address: "Main 1",
  city: "Bratislava",
  country_code: "SK",
  phone: "+421 900 123 456",
  email: "hello@bistro.test",
  opening_hours: { ...defaultOpeningHours(), sat: { open: "12:00", close: "24:00" }, sun: null },
  rating: 0,
  review_count: 0,
  tags: [],
  filters: [],
  preorder_enabled: false,
  created_at: "2026-01-01T00:00:00Z",
};

describe("VenueInfoSheet", () => {
  it("shows the contacts and weekly hours published in Vendor", () => {
    render(
      <VenueInfoSheet
        venue={venue}
        illustration="restaurants"
        anchorRef={createRef<HTMLDivElement>()}
        onClose={vi.fn()}
      />,
    );
    const info = screen.getByRole("dialog", { name: "Информация о заведении" });
    expect(within(info).getByRole("link", { name: "+421 900 123 456" })).toHaveAttribute(
      "href",
      "tel:+421900123456",
    );
    expect(within(info).getByRole("link", { name: "hello@bistro.test" })).toHaveAttribute(
      "href",
      "mailto:hello@bistro.test",
    );
    expect(info).toHaveTextContent("Понедельник09:00–22:00");
    expect(info).toHaveTextContent("Суббота12:00–24:00");
    expect(info).toHaveTextContent("ВоскресеньеВыходной");
  });

  it("leaves out what the venue did not fill in", () => {
    render(
      <VenueInfoSheet
        venue={{ ...venue, phone: undefined, email: undefined, opening_hours: undefined }}
        illustration="restaurants"
        anchorRef={createRef<HTMLDivElement>()}
        onClose={vi.fn()}
      />,
    );
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
    expect(screen.queryByText("Часы работы")).not.toBeInTheDocument();
  });
});
