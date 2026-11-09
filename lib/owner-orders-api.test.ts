import { beforeEach, expect, it, vi } from "vitest";
import { apiRequest } from "./api-client";
import { getOrder, listOrderPage, loadOrderQueue, type OwnerOrder } from "./owner-api";
vi.mock("./api-client", () => ({ apiRequest: vi.fn() }));
const request = vi.mocked(apiRequest);
const order = (id: string, status: OwnerOrder["status"] = "new"): OwnerOrder => ({ id, number: 1, channel: "dine_in", source: "Стол 1", status, currency: "EUR", total_minor: 100, created_at: "2026-11-01T00:00:00Z" });
beforeEach(() => vi.resetAllMocks());
it("reads every active page and only the requested history pages", async () => {
  request.mockImplementation(async path => {
    const params = new URL(String(path), "http://local").searchParams;
    const scope = params.get("scope")!;
    const offset = Number(params.get("cursor") || 0);
    const count = scope === "active" ? 231 : 251;
    const end = Math.min(offset + 100, count);
    return { orders: Array.from({length: end - offset}, (_, i) => order(`${scope}-${i + offset}`, scope === "history" ? "completed" : "new")), has_more: end < count, next_cursor: end < count ? String(end) : undefined };
  });
  const first = await loadOrderQueue("venue");
  expect(first.orders.filter(o => o.status === "new")).toHaveLength(231);
  expect(first.orders.filter(o => o.status === "completed")).toHaveLength(100);
  expect(first.hasMoreHistory).toBe(true);
  expect(request).toHaveBeenCalledTimes(4);
  const more = await loadOrderQueue("venue", 3);
  expect(more.orders).toHaveLength(482);
  expect(more.hasMoreHistory).toBe(false);
});
it("deduplicates orders moved from active to history during refresh", async () => {
  request.mockImplementation(async path => ({ orders: [order("same", String(path).includes("scope=history") ? "completed" : "new")], has_more: false }));
  const snapshot = await loadOrderQueue("venue");
  expect(snapshot.orders).toEqual([order("same", "completed")]);
});
it("encodes filters and detail paths", async () => {
  request.mockResolvedValue({ order: order("id"), orders: [], has_more: false });
  await listOrderPage("venue", { scope: "active", status: ["new", "accepted"], channel: "dine_in", table_id: "table", limit: 30, cursor: "opaque" });
  const url = new URL(String(request.mock.calls[0][0]), "http://local");
  expect(url.searchParams.get("status")).toBe("new,accepted");
  expect(url.searchParams.get("table_id")).toBe("table");
  expect(url.searchParams.get("cursor")).toBe("opaque");
  expect(await getOrder("venue", "id")).toEqual(order("id"));
  expect(request.mock.calls[1][0]).toMatch(/venues\/venue\/orders\/id$/);
});

it("uses staff endpoints for queue, history, workplaces and expected-status writes", async () => {
  const {listStaffVenues,updateOrderStatus}=await import("./owner-api");
  request.mockResolvedValue({venues:[],orders:[],has_more:false,order:order("id","accepted")});
  await listStaffVenues();
  await loadOrderQueue("venue",1,"staff");
  await updateOrderStatus("venue","id","accepted","new","staff");
  expect(request.mock.calls.map(call=>call[0])).toEqual([
    "/staff/venues","/staff/venues/venue/orders?scope=active&limit=100",
    "/staff/venues/venue/orders?scope=history&limit=100","/staff/venues/venue/orders/id",
  ]);
  expect(JSON.parse(request.mock.calls[3][1]!.body as string)).toEqual({status:"accepted",expected_status:"new"});
});

it("sends the cancellation reason and comment and reads staff detail", async () => {
 const {updateOrderStatus}=await import("./owner-api");
 request.mockResolvedValue({order:order("id","cancelled")});
 await updateOrderStatus("venue","id","cancelled","new","staff",{reason:"other",comment:"Guest left"});
 expect(JSON.parse(request.mock.calls[0][1]!.body as string)).toEqual({status:"cancelled",expected_status:"new",reason:"other",comment:"Guest left"});
 await getOrder("venue","id","staff");
 expect(request.mock.calls[1][0]).toBe("/staff/venues/venue/orders/id");
});
