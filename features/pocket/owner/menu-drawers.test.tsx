import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MenuCoverDrawer } from "./menu-drawers";
import { listOwnerVenues, updateOwnerVenue, type OwnerVenue } from "../../../lib/owner-api";
vi.mock("../../../lib/owner-api", () => ({ listOwnerVenues: vi.fn(), updateOwnerVenue: vi.fn() }));
const venue: OwnerVenue = { id: "venue", name: "Cafe", slug: "cafe", address: "Street", city: "Bratislava", country_code: "SK", timezone: "Europe/Bratislava", currency: "EUR", status: "active", created_at: "", settings: { cover_image_url: "/old.jpg", ordering_enabled: true } };
beforeEach(() => {
  vi.clearAllMocks();
  HTMLDialogElement.prototype.showModal = function () { this.setAttribute("open", ""); };
  HTMLDialogElement.prototype.close = function () { this.removeAttribute("open"); };
});
describe("MenuCoverDrawer", () => {
  it("saves a cleared cover while preserving the latest venue settings", async () => {
    vi.mocked(listOwnerVenues).mockResolvedValue([{ ...venue, phone: "+421999", settings: { ...venue.settings, ordering_enabled: false, reservation_enabled: true } }]);
    vi.mocked(updateOwnerVenue).mockResolvedValue(venue);
    const onSave = vi.fn(); render(<MenuCoverDrawer venue={venue} onSave={onSave} onClose={vi.fn()} />);
    expect(screen.getByRole("button", { name: "Сохранить", exact: true })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Удалить", exact: true }));
    fireEvent.click(screen.getByRole("button", { name: "Сохранить", exact: true }));
    await waitFor(() => expect(updateOwnerVenue).toHaveBeenCalledWith("venue", expect.objectContaining({ phone: "+421999", settings: { cover_image_url: "", ordering_enabled: false, reservation_enabled: true } })));
    expect(onSave).toHaveBeenCalledWith(venue);
  });
  it("does not save a cover when editing is cancelled", () => {
    const onClose = vi.fn(); render(<MenuCoverDrawer venue={venue} onSave={vi.fn()} onClose={onClose} />);
    fireEvent.click(screen.getByRole("button", { name: "Удалить", exact: true }));
    fireEvent.click(screen.getByRole("button", { name: "Отмена" }));
    expect(onClose).toHaveBeenCalledOnce(); expect(updateOwnerVenue).not.toHaveBeenCalled();
  });
});
