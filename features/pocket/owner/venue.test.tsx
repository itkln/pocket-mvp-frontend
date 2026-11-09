import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
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

afterEach(() => vi.unstubAllGlobals());

describe("VenueScreen", () => {
  it("uploads a contained logo, persists it separately from the cover and can remove it", async () => {
    const logoURL = "data:image/webp;base64,dGVzdA==";
    vi.stubGlobal("Image", class {
      naturalWidth = 800;
      naturalHeight = 400;
      onload?: () => void;
      set src(_value: string) { queueMicrotask(() => this.onload?.()); }
    });
    vi.stubGlobal("URL", class extends URL { static createObjectURL = vi.fn(() => "blob:logo"); static revokeObjectURL = vi.fn(); });
    const drawImage = vi.fn();
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({ drawImage } as unknown as CanvasRenderingContext2D);
    vi.spyOn(HTMLCanvasElement.prototype, "toDataURL").mockReturnValue(logoURL);
    vi.mocked(updateOwnerVenue).mockImplementation(async (_id, input) => ({ ...venue, ...input, settings: input.settings ?? {} } as OwnerVenue));
    vi.mocked(updateOwnerVenue).mockClear();
    const notify = vi.fn();
    render(<VenueScreen venue={{ ...venue, settings: { ...venue.settings, cover_image_url: "/cover.jpg" } }} notify={notify} />);
    fireEvent.change(screen.getByLabelText("Загрузить иконку заведения"), { target: { files: [new File(["logo"], "logo.png", { type: "image/png" })] } });
    await waitFor(() => expect(notify).toHaveBeenCalledWith("Иконка готова. Нажмите «Сохранить»"));
    expect(drawImage).toHaveBeenCalledWith(expect.anything(), 0, 128, 512, 256);
    fireEvent.click(screen.getAllByRole("button", { name: "Сохранить" })[0]);
    await waitFor(() => expect(updateOwnerVenue).toHaveBeenCalledWith("venue-1", expect.objectContaining({ settings: expect.objectContaining({ logo_image_url: logoURL, cover_image_url: "/cover.jpg" }) })));
    fireEvent.click(screen.getByRole("button", { name: "Удалить иконку" }));
    await screen.findByRole("button", { name: "Загрузить иконку" });
    fireEvent.click(screen.getAllByRole("button", { name: "Сохранить" })[0]);
    await waitFor(() => expect(updateOwnerVenue).toHaveBeenLastCalledWith("venue-1", expect.objectContaining({ settings: expect.objectContaining({ logo_image_url: "", cover_image_url: "/cover.jpg" }) })));
  });
  it("saves currency without resending layout or account language settings", async () => {
    vi.mocked(updateOwnerVenue).mockImplementation(async (_id, input) => ({ ...venue, ...input, settings: input.settings ?? {} } as OwnerVenue));

    const { container } = render(<VenueScreen venue={venue} notify={vi.fn()} />);

    fireEvent.change(screen.getByLabelText("Валюта меню и заказов"), { target: { value: "UAH" } });
    fireEvent.click(screen.getAllByRole("button", { name: "Сохранить" })[0]);

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

    fireEvent.click(screen.getByRole("button", { name: "Удалить заведение" }));

    await waitFor(() => expect(onDelete).toHaveBeenCalledOnce());
  });
});
