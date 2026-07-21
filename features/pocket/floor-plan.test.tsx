import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { FloorPlan, tableCountLabel, type VenueFloor } from "./floor-plan";
import { getFloorPlan, saveFloorPlan } from "../../lib/owner-api";

vi.mock("../../lib/owner-api", () => ({
  getFloorPlan: vi.fn(),
  saveFloorPlan: vi.fn(),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe("FloorPlan", () => {
  it.each([[0, "0 столов"], [1, "1 стол"], [2, "2 стола"], [5, "5 столов"], [11, "11 столов"], [21, "21 стол"]])("formats the table count %i", (count, label) => {
    expect(tableCountLabel(count)).toBe(label);
  });

  it("loads the saved layout before allowing a table to be added and persists it", async () => {
    let finishLoading: (floors: VenueFloor[]) => void = () => undefined;
    vi.mocked(getFloorPlan).mockReturnValue(new Promise((resolve) => { finishLoading = resolve; }));
    vi.mocked(saveFloorPlan).mockImplementation(async (_venueID, floorPlan) => floorPlan);

    render(<FloorPlan mode="owner" venueID="venue-1" venueName="Pocket" notify={vi.fn()} embedded />);

    expect(screen.getByRole("button", { name: "Добавить", exact: true })).toBeDisabled();
    finishLoading([{ id: "floor-1", name: "1 этаж", tables: [], fixtures: [] }]);
    await waitFor(() => expect(screen.getByRole("button", { name: "Добавить", exact: true })).toBeEnabled());

    fireEvent.click(screen.getByRole("button", { name: "Добавить", exact: true }));
    fireEvent.click(screen.getByRole("button", { name: /Стол\s*4 места/ }));
    expect(screen.getByRole("button", { name: /01\s*4 места/ })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Применить изменения" })).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Количество мест"), { target: { value: "6" } });
    expect(screen.getByRole("button", { name: /01\s*6 мест/ })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Сохранить план", exact: true }));
    await waitFor(() => expect(saveFloorPlan).toHaveBeenCalledWith("venue-1", [expect.objectContaining({ tables: [expect.objectContaining({ id: "01", seats: 6 })] })]));
  });
});
