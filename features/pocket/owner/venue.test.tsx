import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { updateOwnerVenue, type OwnerVenue } from "../../../lib/owner-api";
import { VenueScreen } from "./venue";

vi.mock("../../../lib/owner-api", async () => {
  const actual = await vi.importActual<typeof import("../../../lib/owner-api")>("../../../lib/owner-api");
  return { ...actual, updateOwnerVenue: vi.fn() };
});

const venue: OwnerVenue = {
  id: "venue-1",
  name: "Pocket",
  slug: "pocket",
  address: "Main 1",
  city: "Bratislava",
  country_code: "SK",
  timezone: "Europe/Bratislava",
  currency: "EUR",
  status: "active",
  settings: { floor_plan: [{ id: "floor-1" }], interface_language: "en", menu_language: "ru" },
  created_at: "2026-01-01T00:00:00Z",
};

describe("VenueScreen", () => {
  it("saves currency without resending layout or account language settings", async () => {
    vi.mocked(updateOwnerVenue).mockImplementation(async (_id, input) => ({ ...venue, ...input, settings: input.settings ?? {} } as OwnerVenue));

    const { container } = render(<VenueScreen venue={venue} notify={vi.fn()} />);

    fireEvent.change(screen.getByLabelText("Валюта меню и заказов"), { target: { value: "UAH" } });
    fireEvent.click(screen.getAllByRole("button", { name: "Сохранить", exact: true })[0]);

    await waitFor(() => expect(updateOwnerVenue).toHaveBeenCalledWith("venue-1", expect.objectContaining({
      currency: "UAH",
    })));
    expect(vi.mocked(updateOwnerVenue).mock.calls[0][1].settings).not.toHaveProperty("floor_plan");
    expect(vi.mocked(updateOwnerVenue).mock.calls[0][1].settings).not.toHaveProperty("interface_language");
    const coverInput = container.querySelector<HTMLInputElement>('input[type="file"]');
    expect(coverInput).not.toBeNull();
    const inputClick = vi.spyOn(coverInput!, "click");
    fireEvent.click(screen.getByRole("button", { name: "Изменить обложку" }));
    expect(inputClick).toHaveBeenCalledOnce();
  });

  it("deletes the venue through the confirmed owner action", async () => {
    const onDelete = vi.fn().mockResolvedValue(undefined);

    render(<VenueScreen venue={venue} notify={vi.fn()} onDelete={onDelete} />);

    fireEvent.click(screen.getByRole("button", { name: "Удалить заведение", exact: true }));

    await waitFor(() => expect(onDelete).toHaveBeenCalledOnce());
  });
});
