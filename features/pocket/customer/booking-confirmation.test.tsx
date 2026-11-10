import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { I18nProvider } from "../i18n";
import { VenueLogo } from "../venue-logo";
import { BookingConfirmation } from "./booking-confirmation";

const reservation = {
  id: "reservation-1",
  code: "ABC123",
  starts_at: "2026-10-24T18:30:00Z",
  guest_count: 2,
  preorder_total_minor: 950,
  preorder_order_number: 12,
  currency: "EUR",
};

describe("BookingConfirmation", () => {
  it("shows venue branding, guest, local visit time and preorder details without losing the return action", () => {
    const onClose = vi.fn();
    render(
      <I18nProvider initialLocale="en">
        <BookingConfirmation
          venueID="venue-1"
          venueName="East 14"
          venueLogoURL="/east-logo.png"
          reservation={reservation}
          timezone="Europe/Bratislava"
          guestName="Denis Itkin"
          guestPhone="+421900123456"
          headingID="confirmation"
          items={[{ id: "toast", name: "French toast", quantity: 1 }]}
          onClose={onClose}
        />
      </I18nProvider>,
    );
    expect(screen.getByRole("img", { name: "Venue icon: East 14" })).toHaveAttribute(
      "src",
      expect.stringContaining("/east-logo.png"),
    );
    expect(screen.getByRole("heading", { name: "Booking confirmed" })).toHaveAttribute(
      "id",
      "confirmation",
    );
    expect(screen.getByText("Denis Itkin")).toBeInTheDocument();
    expect(screen.getByText("Saturday, 24 October 2026")).toBeInTheDocument();
    expect(screen.getByText(/20:30/)).toHaveTextContent(/2/);
    expect(screen.getByText(/ABC123/)).toBeInTheDocument();
    expect(screen.getByText("French toast × 1")).toBeInTheDocument();
    expect(screen.getByText(/9.50/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Back to venue" }));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("uses each venue's initials when no logo is uploaded or an image fails", () => {
    const { rerender } = render(
      <VenueLogo venueID="bistro" name="Pocket Demo Bistro" imageURL="/broken.png" />,
    );
    fireEvent.error(screen.getByRole("img"));
    expect(screen.getByRole("img")).toHaveTextContent("DB");
    rerender(<VenueLogo venueID="coffee" name="Coffee Lab" />);
    expect(screen.getByRole("img")).toHaveTextContent("CL");
    rerender(<VenueLogo venueID="coffee" name="Coffee Lab" imageURL="/new-logo.png" />);
    expect(screen.getByRole("img")).toHaveAttribute(
      "src",
      expect.stringContaining("/new-logo.png"),
    );
  });
});
