import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { listCustomerPreorders } from "../../../lib/preorders-api";
import { I18nProvider } from "../i18n";
import { HistoryScreen } from "./account";

vi.mock("../../../lib/preorders-api", () => ({ listCustomerPreorders: vi.fn() }));

describe("preorder history", () => {
  it("shows a preorder with its real number and linked reservation", async () => {
    vi.mocked(listCustomerPreorders).mockResolvedValue([{
      id: "order-1", number: 42, venue_name: "Demo Bistro", reservation_code: "BOOK123",
      reservation_starts_at: "2026-10-05T18:00:00Z", guest_name: "Anna", total_minor: 2400,
      currency: "EUR", status: "new", created_at: "2026-10-04T12:00:00Z",
      items: [{ name: "Паста", quantity: 2, unit_price_minor: 1200 }],
    }]);
    render(<I18nProvider initialLocale="ru"><HistoryScreen /></I18nProvider>);
    expect(await screen.findByText("Предзаказ №42")).toBeInTheDocument();
    expect(screen.getByText(/Бронь №BOOK123/)).toBeInTheDocument();
    expect(screen.getByText("Паста × 2")).toBeInTheDocument();
    expect(screen.queryByText("Заказать блюда")).not.toBeInTheDocument();
  });
});
