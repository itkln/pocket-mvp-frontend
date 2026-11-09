import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { issueTableQR } from "../../lib/table-orders-api";
import { QrCodesDialog } from "./floor-plan";
vi.mock("../../lib/table-orders-api", () => ({ issueTableQR: vi.fn() }));
vi.mock("qrcode", () => ({ default: { toDataURL: vi.fn(async () => "data:image/png;base64,aGVsbG8="), toString: vi.fn(async () => "<svg></svg>") } }));
beforeEach(() => vi.clearAllMocks());
describe("Owner table QR codes", () => {
  it("loads real table URLs and only rotates the selected table on request", async () => {
    const qr = { venue_id: "venue-a", table_id: "table-a", table_identifier: "07", version: 1, currency: "EUR", ordering_enabled: true, url: "http://localhost:3001/ru/qr/stable-token" };
    vi.mocked(issueTableQR).mockResolvedValue(qr);
    render(<QrCodesDialog venueID="venue-a" venueName="Bistro" tables={[{ id: "07", seats: 4, x: 0, y: 0, state: "free" }]} onClose={vi.fn()} notify={vi.fn()} />);
    expect(await screen.findByRole("link", { name: "Открыть меню стола" })).toHaveAttribute("href", qr.url);
    expect(issueTableQR).toHaveBeenCalledTimes(1);
    expect(issueTableQR).toHaveBeenCalledWith("venue-a", "07");
    vi.mocked(issueTableQR).mockResolvedValue({ ...qr, version: 2, url: "http://localhost:3001/ru/qr/new-token" });
    fireEvent.click(screen.getByRole("button", { name: "Перегенерировать QR-код стола 07" }));
    await waitFor(() => expect(screen.getByRole("link", { name: "Открыть меню стола" })).toHaveAttribute("href", "http://localhost:3001/ru/qr/new-token"));
    expect(issueTableQR).toHaveBeenLastCalledWith("venue-a", "07", true);
  });
});
