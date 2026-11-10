import type { CustomerReservation } from "./reservations-api";
import type { MenuNutrition } from "./menu-nutrition";
import { apiRequest } from "./api-client";

// Venue staff roles. There is no kitchen or viewer role: waiters pass orders to the kitchen.
export type StaffRole = "manager" | "waiter";
export type OwnerVenue = {
  access_role?: "owner" | StaffRole;
  id: string;
  name: string;
  slug: string;
  description?: string;
  cuisine_type?: string;
  phone?: string;
  email?: string;
  address: string;
  city: string;
  postal_code?: string;
  country_code: string;
  timezone: string;
  currency: string;
  status: "draft" | "active" | "paused" | "closed";
  settings: Record<string, unknown>;
  created_at: string;
};

export type VenueInput = {
  name: string;
  description?: string;
  cuisine_type?: string;
  phone?: string;
  email?: string;
  address: string;
  city: string;
  postal_code?: string;
  country_code?: string;
  timezone?: string;
  currency?: string;
  status?: OwnerVenue["status"];
  settings?: Record<string, unknown>;
};

export type OwnerDashboard = {
  revenue_minor: number;
  orders_today: number;
  average_order_minor: number;
  active_tables: number;
  total_tables: number;
  new_orders: number;
  average_rating: number;
};

export type OwnerCategory = {
  id: string;
  name: string;
  sort_order: number;
  is_active: boolean;
  preorder_enabled: boolean;
  item_count: number;
};
export type CategoryInput = {
  name: string;
  sort_order?: number;
  is_active?: boolean;
  preorder_enabled?: boolean;
};
export type OwnerMenuItem = MenuNutrition & {
  id: string;
  category_id: string;
  category: string;
  name: string;
  description?: string;
  price_minor: number;
  currency: string;
  is_available: boolean;
  is_popular: boolean;
  sort_order: number;
  image_url?: string;
};
export type MenuItemInput = MenuNutrition & {
  category_id: string;
  name: string;
  description?: string;
  price_minor: number;
  currency?: string;
  is_available?: boolean;
  is_popular?: boolean;
  sort_order?: number;
  image_url?: string;
};
export type OwnerStaffMember = {
  id: string;
  display_name: string;
  email: string;
  role: StaffRole;
  status: "invited" | "active" | "inactive";
  invited_at: string;
  accepted_at?: string;
  invite_delivery?: "sent" | "failed";
};
export type StaffInput = {
  display_name?: string;
  email?: string;
  role: OwnerStaffMember["role"];
  status?: OwnerStaffMember["status"];
};
// The waiter takes every order new -> preparing (passed to the kitchen) -> served -> completed.
export type OrderStatus = "new" | "preparing" | "served" | "completed" | "cancelled";
// Statuses removed on 2026-11-10 that still appear in the history of older orders.
export type LegacyOrderStatus = "accepted" | "ready";
export type OrderCancellation = { reason: string; comment?: string };
export type OrderStatusEvent = {
  id: string;
  actor_name: string;
  previous_status: OrderStatus | LegacyOrderStatus;
  new_status: OrderStatus | LegacyOrderStatus;
  reason?: string;
  comment?: string;
  created_at: string;
};
export type OwnerOrder = {
  status_events?: OrderStatusEvent[];
  cancellation_blocked?: string;
  allowed_actions?: OrderStatus[];
  updated_at?: string;
  placed_at?: string | null;
  completed_at?: string | null;
  table_id?: string;
  table_label?: string;
  reservation_id?: string;
  bill_id?: string;
  id: string;
  number: number;
  channel: string;
  source: string;
  guest_name?: string;
  tip_minor?: number;
  total_minor: number;
  currency: string;
  status: OrderStatus;
  notes?: string;
  created_at: string;
  reservation_status?: "pending" | CustomerReservation["status"];
  reservation_code?: string;
  reservation_starts_at?: string;
  guest_phone?: string;
  guest_count?: number;
  items?: {
    id?: string;
    name: string;
    quantity: number;
    unit_price_minor: number;
    total_minor?: number;
    notes?: string;
    status?: string;
  }[];
};
export type OwnerReview = {
  id: string;
  guest_name: string;
  rating: number;
  table?: string;
  order?: string;
  body?: string;
  owner_reply?: string;
  replied_at?: string;
  created_at: string;
};
export type OwnerPayment = {
  id: string;
  provider: string;
  status: string;
  amount_minor: number;
  refunded_minor: number;
  currency: string;
  paid_at?: string;
  created_at: string;
};
export type OwnerSubscription = {
  id: string;
  plan: "start" | "business" | "pro";
  billing_cycle: "monthly" | "yearly";
  status: "trialing" | "active" | "past_due" | "cancelled";
  venue_limit?: number;
  trial_ends_at?: string;
  current_period_ends_at?: string;
};

// One venue workspace for owner and staff: the venue role, not the URL, decides what is allowed.
const venuePath = (venueID: string, suffix = "") => `/venues/${venueID}${suffix}`;

export const listStaffVenues = async () =>
  (await apiRequest<{ venues: OwnerVenue[] }>("/staff/venues")).venues;
export const listOwnerVenues = async () =>
  (await apiRequest<{ venues: OwnerVenue[] }>("/owner/venues")).venues;
export const createOwnerVenue = async (input: VenueInput) =>
  (
    await apiRequest<{ venue: OwnerVenue }>("/owner/venues", {
      method: "POST",
      body: JSON.stringify(input),
    })
  ).venue;
export const updateOwnerVenue = async (id: string, input: VenueInput) =>
  (
    await apiRequest<{ venue: OwnerVenue }>(venuePath(id), {
      method: "PATCH",
      body: JSON.stringify(input),
    })
  ).venue;
export const deleteOwnerVenue = async (id: string) =>
  apiRequest<void>(venuePath(id), { method: "DELETE" });
export const getOwnerDashboard = async (id: string) =>
  (await apiRequest<{ dashboard: OwnerDashboard }>(venuePath(id, "/dashboard"))).dashboard;
export const listCategories = async (id: string) =>
  (await apiRequest<{ categories: OwnerCategory[] }>(venuePath(id, "/categories"))).categories;
export const createCategory = async (id: string, input: CategoryInput) =>
  (
    await apiRequest<{ category: OwnerCategory }>(venuePath(id, "/categories"), {
      method: "POST",
      body: JSON.stringify(input),
    })
  ).category;
export const updateCategory = async (venueID: string, id: string, input: CategoryInput) =>
  (
    await apiRequest<{ category: OwnerCategory }>(venuePath(venueID, `/categories/${id}`), {
      method: "PATCH",
      body: JSON.stringify(input),
    })
  ).category;
export const deleteCategory = async (venueID: string, id: string) =>
  apiRequest<void>(venuePath(venueID, `/categories/${id}`), { method: "DELETE" });
export const reorderCategories = async (venueID: string, ids: string[]) =>
  apiRequest<void>(venuePath(venueID, "/categories/order"), {
    method: "PUT",
    body: JSON.stringify({ ids }),
  });
export const listMenuItems = async (id: string) =>
  (await apiRequest<{ items: OwnerMenuItem[] }>(venuePath(id, "/menu-items"))).items;
export const createMenuItem = async (id: string, input: MenuItemInput) =>
  (
    await apiRequest<{ item: OwnerMenuItem }>(venuePath(id, "/menu-items"), {
      method: "POST",
      body: JSON.stringify(input),
    })
  ).item;
export const updateMenuItem = async (venueID: string, id: string, input: MenuItemInput) =>
  (
    await apiRequest<{ item: OwnerMenuItem }>(venuePath(venueID, `/menu-items/${id}`), {
      method: "PATCH",
      body: JSON.stringify(input),
    })
  ).item;
export const deleteMenuItem = async (venueID: string, id: string) =>
  apiRequest<void>(venuePath(venueID, `/menu-items/${id}`), { method: "DELETE" });
export const reorderMenuItems = async (venueID: string, categoryID: string, ids: string[]) =>
  apiRequest<void>(venuePath(venueID, "/menu-items/order"), {
    method: "PUT",
    body: JSON.stringify({ category_id: categoryID, ids }),
  });
export const listStaff = async (id: string) =>
  (await apiRequest<{ staff: OwnerStaffMember[] }>(venuePath(id, "/team"))).staff;
export const createStaff = async (id: string, input: StaffInput) =>
  (
    await apiRequest<{ staff_member: OwnerStaffMember }>(venuePath(id, "/team"), {
      method: "POST",
      body: JSON.stringify(input),
    })
  ).staff_member;
export const updateStaff = async (venueID: string, id: string, input: StaffInput) =>
  (
    await apiRequest<{ staff_member: OwnerStaffMember }>(venuePath(venueID, `/team/${id}`), {
      method: "PATCH",
      body: JSON.stringify(input),
    })
  ).staff_member;
export const deleteStaff = async (venueID: string, id: string) =>
  apiRequest<void>(venuePath(venueID, `/team/${id}`), { method: "DELETE" });
export type OrderPage = { orders: OwnerOrder[]; has_more: boolean; next_cursor?: string };
export type OrderQuery = {
  number?: string;
  table?: string;
  date_from?: string;
  date_to?: string;
  scope?: "active" | "history";
  status?: OrderStatus[];
  channel?: "dine_in" | "preorder" | "online";
  table_id?: string;
  limit?: number;
  cursor?: string;
};
export const listOrderPage = (venueID: string, query: OrderQuery = {}, signal?: AbortSignal) => {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query))
    if (value !== undefined)
      params.set(key, Array.isArray(value) ? value.join(",") : String(value));
  return apiRequest<OrderPage>(venuePath(venueID, `/orders?${params}`), { signal });
};
export const getOrder = async (venueID: string, orderID: string) =>
  (await apiRequest<{ order: OwnerOrder }>(venuePath(venueID, `/orders/${orderID}`))).order;

// Refresh the complete active queue; history grows only when the operator asks for more.
export async function loadOrderQueue(venueID: string, historyPages = 1, signal?: AbortSignal) {
  const timeout = AbortSignal.timeout(12000);
  const requestSignal = signal ? AbortSignal.any([signal, timeout]) : timeout;
  const read = async (scope: "active" | "history", maxPages: number) => {
    const orders = new Map<string, OwnerOrder>();
    let cursor: string | undefined;
    for (let i = 0; i < maxPages; i++) {
      const page = await listOrderPage(venueID, { scope, limit: 100, cursor }, requestSignal);
      for (const order of page.orders) orders.set(order.id, order);
      cursor = page.has_more ? page.next_cursor : undefined;
      if (!cursor) break;
    }
    return { orders: [...orders.values()], hasMore: Boolean(cursor) };
  };
  const [active, history] = await Promise.all([
    read("active", Infinity),
    read("history", historyPages),
  ]);
  // History wins if an order became final between the two reads.
  const orders = new Map(active.orders.map((order) => [order.id, order]));
  for (const order of history.orders) orders.set(order.id, order);
  return { orders: [...orders.values()], hasMoreHistory: history.hasMore };
}
export const listOrders = async (id: string) => (await loadOrderQueue(id)).orders;
export const updateOrderStatus = async (
  venueID: string,
  id: string,
  status: OwnerOrder["status"],
  expectedStatus: OwnerOrder["status"],
  cancellation?: OrderCancellation,
) =>
  (
    await apiRequest<{ order: OwnerOrder }>(venuePath(venueID, `/orders/${id}`), {
      method: "PATCH",
      body: JSON.stringify({ status, expected_status: expectedStatus, ...cancellation }),
    })
  ).order;
export const listReviews = async (id: string) =>
  (await apiRequest<{ reviews: OwnerReview[] }>(venuePath(id, "/reviews"))).reviews;
export const replyReview = async (venueID: string, id: string, ownerReply: string) =>
  (
    await apiRequest<{ review: OwnerReview }>(venuePath(venueID, `/reviews/${id}`), {
      method: "PATCH",
      body: JSON.stringify({ owner_reply: ownerReply }),
    })
  ).review;
export const listPayments = async (id: string) =>
  (await apiRequest<{ payments: OwnerPayment[] }>(venuePath(id, "/payments"))).payments;
export const getFloorPlan = async <T>(id: string) =>
  (await apiRequest<{ floor_plan: T }>(venuePath(id, "/floor-plan"))).floor_plan;
export const saveFloorPlan = async <T>(id: string, floorPlan: T) =>
  (
    await apiRequest<{ floor_plan: T }>(venuePath(id, "/floor-plan"), {
      method: "PUT",
      body: JSON.stringify({ floor_plan: floorPlan }),
    })
  ).floor_plan;
export const getSubscription = async () =>
  (await apiRequest<{ subscription: OwnerSubscription | null }>("/owner/subscription"))
    .subscription;
export const updateSubscription = async (
  plan: OwnerSubscription["plan"],
  billingCycle: OwnerSubscription["billing_cycle"],
) =>
  (
    await apiRequest<{ subscription: OwnerSubscription }>("/owner/subscription", {
      method: "PUT",
      body: JSON.stringify({ plan, billing_cycle: billingCycle }),
    })
  ).subscription;

export const resendStaffInvitation = (venueID: string, staffID: string) =>
  apiRequest<void>(venuePath(venueID, `/team/${staffID}/invite`), { method: "POST" });

export type OrderAlertSettings = {
  warning_minutes: number;
  critical_minutes: number;
  warning_color: string;
  critical_color: string;
  preorder_lead_minutes: number;
  can_edit: boolean;
};
export const getOrderAlertSettings = (venueID: string) =>
  apiRequest<OrderAlertSettings>(venuePath(venueID, "/order-alert-settings"));
export const saveOrderAlertSettings = (venueID: string, settings: OrderAlertSettings) =>
  apiRequest<OrderAlertSettings>(venuePath(venueID, "/order-alert-settings"), {
    method: "PUT",
    body: JSON.stringify(settings),
  });
