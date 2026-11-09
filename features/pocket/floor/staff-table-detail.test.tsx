import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { StaffTableDetail } from "./staff-table-detail";

describe("StaffTableDetail", () => {
  it("shows only what the floor plan knows about a busy table", () => {
    render(
      <StaffTableDetail
        table={{ id: "04", seats: 6, x: 10, y: 20, state: "busy" }}
        floorName="1 этаж"
      />,
    );
    expect(screen.getByRole("heading", { name: "04" })).toBeInTheDocument();
    expect(screen.getByText("Занят")).toBeInTheDocument();
    expect(screen.getByText("6")).toBeInTheDocument();
    // No invented bill, waiter or dishes.
    expect(screen.queryByText(/€/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Официант|Текущий сч/)).not.toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});
