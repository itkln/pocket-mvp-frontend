import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import { I18nProvider } from "../i18n";
import { quotePublicOrder, submitPublicOrder } from "../../../lib/public-orders-api";
import { PublicOrderDialog } from "./public-order-dialog";

vi.mock("../../../lib/public-orders-api", () => ({ quotePublicOrder: vi.fn(), submitPublicOrder: vi.fn() }));

beforeEach(() => {
  vi.mocked(quotePublicOrder).mockReset();
  vi.mocked(submitPublicOrder).mockReset();
  vi.mocked(quotePublicOrder).mockResolvedValue({ currency: "EUR", total_minor: 1500, items: [{ menu_item_id: "soup", name: "Суп", quantity: 2, unit_price_minor: 750, total_minor: 1500 }] });
  vi.mocked(submitPublicOrder).mockResolvedValue({ id: "order-1", number: 1049, channel: "online", status: "new", guest_name: "Anna Guest", total_minor: 1500, currency: "EUR", created_at: new Date().toISOString(), items: [] });
});

it("quotes current menu prices before submit and shows the real order number", async () => {
  render(<I18nProvider initialLocale="ru"><PublicOrderDialog venueID="venue-1" venueName="Demo Bistro" locale="ru" user={null} onClose={vi.fn()} initialMenu={[{ id: "food", name: "Еда", items: [{ id: "soup", name: "Суп", price_minor: 750, currency: "EUR" }] }]} /></I18nProvider>);
  fireEvent.click(screen.getByRole("button", { name: "Добавить Суп" }));
  fireEvent.click(screen.getByRole("button", { name: "Добавить Суп" }));
  fireEvent.click(screen.getByRole("button", { name: "Продолжить" }));
  await waitFor(() => expect(quotePublicOrder).toHaveBeenCalledWith("venue-1", expect.objectContaining({ items: [{ menu_item_id: "soup", quantity: 2, expected_price_minor: 750 }] })));
  expect(await screen.findByRole("heading", { name: "Проверьте заказ" })).toBeInTheDocument();
  fireEvent.change(screen.getByRole("textbox", { name: "Имя" }), { target: { value: "Anna Guest" } });
  fireEvent.change(screen.getByRole("textbox", { name: "Почта" }), { target: { value: "anna@example.test" } });
  fireEvent.click(screen.getByRole("button", { name: "Заказать" }));
  await waitFor(() => expect(submitPublicOrder).toHaveBeenCalledWith("venue-1", expect.objectContaining({ guest_name: "Anna Guest", guest_email: "anna@example.test" }), true));
  expect(await screen.findByRole("heading", { name: "Заказ №1049 принят" })).toBeInTheDocument();
});
