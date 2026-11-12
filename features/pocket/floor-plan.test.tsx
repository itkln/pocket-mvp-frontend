import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { FloorPlan } from "./floor-plan";
import { tableCountLabel, type VenueFloor } from "./floor/floor-model";
import { getFloorPlan, saveFloorPlan } from "../../lib/owner-api";
import {
  getLiveFloor,
  releaseTable,
  seatReservation,
  seatWalkIn,
  type LiveFloor,
} from "../../lib/floor-api";

vi.mock("../../lib/owner-api", () => ({
  getFloorPlan: vi.fn(),
  saveFloorPlan: vi.fn(),
}));

vi.mock("../../lib/floor-api", () => ({
  getLiveFloor: vi.fn(),
  seatReservation: vi.fn(),
  seatWalkIn: vi.fn(),
  releaseTable: vi.fn(),
}));

const liveFloor = (changes: Partial<LiveFloor> = {}): LiveFloor => ({
  now: "2026-11-12T18:00:00Z",
  timezone: "Europe/Bratislava",
  currency: "EUR",
  tables: [],
  bookings: [],
  ...changes,
});

beforeEach(() => {
  vi.clearAllMocks();
});

describe("FloorPlan", () => {
  it.each([
    [0, "0 столов"],
    [1, "1 стол"],
    [2, "2 стола"],
    [5, "5 столов"],
    [11, "11 столов"],
    [21, "21 стол"],
  ])("formats the table count %i", (count, label) => {
    expect(tableCountLabel(count)).toBe(label);
  });

  it("loads the saved layout before allowing a table to be added and persists it", async () => {
    let finishLoading: (floors: VenueFloor[]) => void = () => undefined;
    vi.mocked(getFloorPlan).mockReturnValue(
      new Promise((resolve) => {
        finishLoading = resolve;
      }),
    );
    vi.mocked(saveFloorPlan).mockImplementation(async (_venueID, floorPlan) => floorPlan);

    render(<FloorPlan venueID="venue-1" venueName="Pocket" notify={vi.fn()} initialView="edit" />);

    expect(screen.queryByRole("button", { name: "Стол" })).not.toBeInTheDocument();
    finishLoading([{ id: "floor-1", name: "1 этаж", tables: [], fixtures: [] }]);
    fireEvent.click(await screen.findByRole("button", { name: "Стол" }));
    const table = () => document.querySelector(".floor-table");
    expect(table()).toHaveTextContent(/01\s*4 места/);
    expect(screen.getByRole("button", { name: "Отменить" })).toBeEnabled();
    fireEvent.click(screen.getByRole("button", { name: "Больше мест" }));
    fireEvent.click(screen.getByRole("button", { name: "Больше мест" }));
    expect(table()).toHaveTextContent(/01\s*6 мест/);

    // The plan saves by itself shortly after the last change.
    await waitFor(
      () =>
        expect(saveFloorPlan).toHaveBeenCalledWith("venue-1", [
          expect.objectContaining({ tables: [expect.objectContaining({ id: "01", seats: 6 })] }),
        ]),
      { timeout: 3000 },
    );
    await screen.findByText("Изменения сохранены");

    // Undo steps back through the session; redo returns.
    fireEvent.click(screen.getByRole("button", { name: "Отменить" }));
    expect(table()).toHaveTextContent(/01\s*5 мест/);
    fireEvent.click(screen.getByRole("button", { name: "Повторить" }));
    expect(table()).toHaveTextContent(/01\s*6 мест/);
  });

  it("deletes the active floor and keeps the remaining floor selected", async () => {
    vi.mocked(getFloorPlan).mockResolvedValue([
      { id: "floor-1", name: "1 этаж", tables: [], fixtures: [] },
      { id: "floor-2", name: "2 этаж", tables: [], fixtures: [] },
    ]);
    vi.mocked(saveFloorPlan).mockImplementation(async (_venueID, floorPlan) => floorPlan);
    render(<FloorPlan venueID="venue-1" venueName="Pocket" notify={vi.fn()} initialView="edit" />);

    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Удалить 1 этаж" })).toBeEnabled(),
    );
    fireEvent.click(screen.getByRole("button", { name: "Удалить 1 этаж" }));

    await waitFor(() =>
      expect(screen.queryByRole("tab", { name: /1 этаж/ })).not.toBeInTheDocument(),
    );
    expect(screen.getByRole("tab", { name: /2 этаж/ })).toHaveAttribute("aria-selected", "true");
  });

  it("keeps a long floor list available through the mobile selector", async () => {
    vi.mocked(getFloorPlan).mockResolvedValue(
      Array.from({ length: 12 }, (_, index) => ({
        id: `floor-${index + 1}`,
        name: `${index + 1} этаж`,
        tables: [],
        fixtures: [],
      })),
    );
    vi.mocked(saveFloorPlan).mockImplementation(async (_venueID, floorPlan) => floorPlan);

    render(<FloorPlan venueID="venue-1" venueName="Pocket" notify={vi.fn()} initialView="edit" />);

    const lastFloor = await screen.findByRole("tab", { name: /12 этаж/ });
    const floorSelector = screen.getByRole("combobox", { name: "Выбрать этаж" });
    fireEvent.change(floorSelector, { target: { value: "floor-12" } });

    expect(lastFloor).toHaveAttribute("aria-selected", "true");
    expect(floorSelector).toHaveValue("floor-12");
  });

  it("shows the live floor and seats, moves and releases parties", async () => {
    vi.mocked(getFloorPlan).mockResolvedValue([
      {
        id: "floor-1",
        name: "1 этаж",
        tables: [
          { id: "01", seats: 2, x: 5, y: 5, state: "free" },
          { id: "02", seats: 4, x: 30, y: 5, state: "free" },
          { id: "03", seats: 4, x: 60, y: 5, state: "free" },
        ],
        fixtures: [],
      },
    ]);
    const booking = {
      id: "booking-1",
      code: "ABC",
      table_identifier: "02",
      guest_name: "Анна",
      guest_count: 4,
      starts_at: "2026-11-12T18:20:00Z",
      ends_at: "2026-11-12T20:20:00Z",
      has_preorder: true,
    };
    const party = {
      reservation_id: "walk-in-1",
      code: "W1",
      guest_name: "",
      guest_count: 2,
      seated_at: "2026-11-12T17:35:00Z",
      walk_in: true,
    };
    vi.mocked(getLiveFloor).mockResolvedValue(
      liveFloor({
        tables: [
          { identifier: "01", seats: 2, state: "occupied", party },
          { identifier: "02", seats: 4, state: "reserved", next_reservation_id: "booking-1" },
        ],
        bookings: [booking],
      }),
    );
    const notify = vi.fn();
    render(<FloorPlan venueID="venue-1" venueName="Pocket" notify={notify} />);

    // Stats, table states and the first table's card.
    expect(await screen.findByRole("button", { name: "Стол 01, занят" })).toHaveTextContent(
      /01\s*25 мин/,
    );
    expect(screen.getByRole("button", { name: "Стол 02, бронь" })).toHaveTextContent("19:20");
    expect(screen.getByRole("button", { name: "Стол 03, свободен" })).toBeInTheDocument();
    expect(screen.getByText("Гостей в зале: 2")).toBeInTheDocument();
    expect(screen.getByText("Следующая в 19:20 · Анна")).toBeInTheDocument();
    expect(screen.getByText("Через 20 мин")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Стол 01" })).toBeInTheDocument();

    // Releasing the occupied table.
    vi.mocked(releaseTable).mockResolvedValue(liveFloor({ bookings: [booking] }));
    fireEvent.click(screen.getByRole("button", { name: "Освободить стол" }));
    await waitFor(() => expect(releaseTable).toHaveBeenCalledWith("venue-1", "01"));
    expect(await screen.findByRole("button", { name: "Стол 01, свободен" })).toBeInTheDocument();

    // A walk-in at a free table.
    vi.mocked(seatWalkIn).mockResolvedValue(liveFloor({ bookings: [booking] }));
    fireEvent.click(screen.getByRole("button", { name: "Стол 03, свободен" }));
    fireEvent.click(screen.getByRole("button", { name: "Больше гостей" }));
    fireEvent.change(screen.getByLabelText("Имя гостя (необязательно)"), {
      target: { value: "Мия" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Посадить гостей" }));
    await waitFor(() =>
      expect(seatWalkIn).toHaveBeenCalledWith("venue-1", {
        table_identifier: "03",
        guests: 3,
        guest_name: "Мия",
      }),
    );

    // A booking moved to another table: pick it, then click the table.
    vi.mocked(seatReservation).mockResolvedValue(liveFloor());
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Стол 03, свободен" })).toBeEnabled(),
    );
    fireEvent.click(screen.getByRole("button", { name: /Анна/ }));
    expect(screen.getByText("Выберите свободный стол для брони Анна")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Стол 03, свободен" }));
    await waitFor(() => expect(seatReservation).toHaveBeenCalledWith("venue-1", "booking-1", "03"));
    expect(await screen.findAllByText("На сегодня броней больше нет")).toHaveLength(2);
    expect(notify).toHaveBeenCalledWith("Анна: стол 03");
  });
});
