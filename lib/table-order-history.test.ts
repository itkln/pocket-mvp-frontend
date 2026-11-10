import { beforeEach, describe, expect, it } from "vitest";
import { legacyTableOrderKeys, planRepeatedOrder, repeatedQuantities } from "./table-order-history";
import type { TableOrder } from "./table-orders-api";

const receipt: TableOrder = {
  id: "order",
  number: 1,
  status: "completed",
  table_identifier: "1",
  currency: "EUR",
  total_minor: 1200,
  notes: "",
  created_at: "2026-10-01T12:00:00Z",
  items: [{ menu_item_id: "pasta", name: "Old pasta", quantity: 2, unit_price_minor: 600 }],
};
const categories = [
  {
    id: "food",
    name: "Food",
    items: [{ id: "pasta", name: "New pasta", price_minor: 800, currency: "EUR" }],
  },
];
beforeEach(() => sessionStorage.clear());
describe("venue order history", () => {
  it("imports unique old capabilities from all QR carts, tolerating damaged data", () => {
    sessionStorage.setItem(
      "pocket:table-cart:revoked",
      JSON.stringify({
        lastKey: "receipt-key-123456",
        orderKeys: ["receipt-key-123456", "second-key-1234567", "short", 4],
        submission: { idempotency_key: "pending-key-123456" },
      }),
    );
    sessionStorage.setItem("pocket:table-cart:broken", "{");
    sessionStorage.setItem("other", JSON.stringify({ lastKey: "private-key-123456" }));
    expect(legacyTableOrderKeys()).toEqual([
      "receipt-key-123456",
      "second-key-1234567",
      "pending-key-123456",
    ]);
  });
  it("matches stable item IDs and uses fresh names, prices and currencies without changing the receipt", () => {
    const original = structuredClone(receipt);
    const plan = planRepeatedOrder(receipt, categories, "EUR");
    expect(plan.lines[0]).toMatchObject({
      name: "New pasta",
      price: 800,
      previousPrice: 600,
      changed: true,
      quantity: 2,
    });
    expect(receipt).toEqual(original);
    const changedCurrency = planRepeatedOrder(
      receipt,
      [{ ...categories[0], items: [{ ...categories[0].items[0], currency: "USD" }] }],
      "USD",
    );
    expect(changedCurrency.lines[0].changed).toBe(true);
    expect(planRepeatedOrder(receipt, categories, "USD").unavailable).toEqual([
      { name: "Old pasta", reason: "unavailable" },
    ]);
    expect(
      planRepeatedOrder(
        { ...receipt, items: [{ ...receipt.items[0], menu_item_id: undefined }] },
        categories,
        "EUR",
      ).lines,
    ).toHaveLength(0);
  });
  it("skips old modifiers and missing dishes and bounds merged quantities", () => {
    const plan = planRepeatedOrder(
      {
        ...receipt,
        items: [
          { ...receipt.items[0], quantity: 20 },
          { ...receipt.items[0], quantity: 20 },
          { ...receipt.items[0], modifiers: [{ name: "Sauce" }] },
          { ...receipt.items[0], menu_item_id: "removed", name: "Soup" },
        ],
      },
      categories,
      "EUR",
    );
    expect(plan.quantityLimited).toBe(true);
    expect(plan.lines[0].quantity).toBe(30);
    expect(plan.unavailable.map((line) => line.reason)).toEqual(["options", "unavailable"]);
    expect(repeatedQuantities(plan, { pasta: 10, soup: 1 }, true)).toEqual({ pasta: 30, soup: 1 });
    expect(repeatedQuantities(plan, { soup: 1 }, false)).toEqual({ pasta: 30 });
  });
});
