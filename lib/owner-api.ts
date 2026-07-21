import { apiRequest } from "./api-client";

export type OwnerVenue = {
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

export type OwnerCategory = { id: string; name: string; sort_order: number; is_active: boolean; item_count: number };
export type CategoryInput = { name: string; sort_order?: number; is_active?: boolean };
export type OwnerMenuItem = { id: string; category_id: string; category: string; name: string; description?: string; price_minor: number; currency: string; is_available: boolean; is_popular: boolean; sort_order: number; image_url?: string };
export type MenuItemInput = { category_id: string; name: string; description?: string; price_minor: number; currency?: string; is_available?: boolean; is_popular?: boolean; sort_order?: number; image_url?: string };
export type OwnerStaffMember = { id: string; display_name: string; email: string; role: "manager" | "waiter" | "kitchen" | "viewer"; status: "invited" | "active" | "inactive"; invited_at: string; accepted_at?: string };
export type StaffInput = { display_name?: string; email?: string; role: OwnerStaffMember["role"]; status?: OwnerStaffMember["status"] };
export type OwnerOrder = { id: string; number: number; channel: string; source: string; guest_name?: string; total_minor: number; currency: string; status: "new" | "accepted" | "preparing" | "ready" | "served" | "completed" | "cancelled"; notes?: string; created_at: string };
export type OwnerReview = { id: string; guest_name: string; rating: number; table?: string; order?: string; body?: string; owner_reply?: string; replied_at?: string; created_at: string };
export type OwnerPayment = { id: string; provider: string; status: string; amount_minor: number; refunded_minor: number; currency: string; paid_at?: string; created_at: string };
export type OwnerSubscription = { id: string; plan: "start" | "business" | "pro"; billing_cycle: "monthly" | "yearly"; status: "trialing" | "active" | "past_due" | "cancelled"; venue_limit?: number; trial_ends_at?: string; current_period_ends_at?: string };

const venuePath = (venueID: string, suffix = "") => `/owner/venues/${venueID}${suffix}`;

export const listOwnerVenues = async () => (await apiRequest<{ venues: OwnerVenue[] }>("/owner/venues")).venues;
export const createOwnerVenue = async (input: VenueInput) => (await apiRequest<{ venue: OwnerVenue }>("/owner/venues", { method: "POST", body: JSON.stringify(input) })).venue;
export const updateOwnerVenue = async (id: string, input: VenueInput) => (await apiRequest<{ venue: OwnerVenue }>(venuePath(id), { method: "PATCH", body: JSON.stringify(input) })).venue;
export const deleteOwnerVenue = async (id: string) => apiRequest<void>(venuePath(id), { method: "DELETE" });
export const getOwnerDashboard = async (id: string) => (await apiRequest<{ dashboard: OwnerDashboard }>(venuePath(id, "/dashboard"))).dashboard;
export const listCategories = async (id: string) => (await apiRequest<{ categories: OwnerCategory[] }>(venuePath(id, "/categories"))).categories;
export const createCategory = async (id: string, input: CategoryInput) => (await apiRequest<{ category: OwnerCategory }>(venuePath(id, "/categories"), { method: "POST", body: JSON.stringify(input) })).category;
export const updateCategory = async (venueID: string, id: string, input: CategoryInput) => (await apiRequest<{ category: OwnerCategory }>(venuePath(venueID, `/categories/${id}`), { method: "PATCH", body: JSON.stringify(input) })).category;
export const deleteCategory = async (venueID: string, id: string) => apiRequest<void>(venuePath(venueID, `/categories/${id}`), { method: "DELETE" });
export const listMenuItems = async (id: string) => (await apiRequest<{ items: OwnerMenuItem[] }>(venuePath(id, "/menu-items"))).items;
export const createMenuItem = async (id: string, input: MenuItemInput) => (await apiRequest<{ item: OwnerMenuItem }>(venuePath(id, "/menu-items"), { method: "POST", body: JSON.stringify(input) })).item;
export const updateMenuItem = async (venueID: string, id: string, input: MenuItemInput) => (await apiRequest<{ item: OwnerMenuItem }>(venuePath(venueID, `/menu-items/${id}`), { method: "PATCH", body: JSON.stringify(input) })).item;
export const deleteMenuItem = async (venueID: string, id: string) => apiRequest<void>(venuePath(venueID, `/menu-items/${id}`), { method: "DELETE" });
export const listStaff = async (id: string) => (await apiRequest<{ staff: OwnerStaffMember[] }>(venuePath(id, "/staff"))).staff;
export const createStaff = async (id: string, input: StaffInput) => (await apiRequest<{ staff_member: OwnerStaffMember }>(venuePath(id, "/staff"), { method: "POST", body: JSON.stringify(input) })).staff_member;
export const updateStaff = async (venueID: string, id: string, input: StaffInput) => (await apiRequest<{ staff_member: OwnerStaffMember }>(venuePath(venueID, `/staff/${id}`), { method: "PATCH", body: JSON.stringify(input) })).staff_member;
export const deleteStaff = async (venueID: string, id: string) => apiRequest<void>(venuePath(venueID, `/staff/${id}`), { method: "DELETE" });
export const listOrders = async (id: string) => (await apiRequest<{ orders: OwnerOrder[] }>(venuePath(id, "/orders"))).orders;
export const updateOrderStatus = async (venueID: string, id: string, status: OwnerOrder["status"]) => (await apiRequest<{ order: OwnerOrder }>(venuePath(venueID, `/orders/${id}`), { method: "PATCH", body: JSON.stringify({ status }) })).order;
export const listReviews = async (id: string) => (await apiRequest<{ reviews: OwnerReview[] }>(venuePath(id, "/reviews"))).reviews;
export const replyReview = async (venueID: string, id: string, ownerReply: string) => (await apiRequest<{ review: OwnerReview }>(venuePath(venueID, `/reviews/${id}`), { method: "PATCH", body: JSON.stringify({ owner_reply: ownerReply }) })).review;
export const listPayments = async (id: string) => (await apiRequest<{ payments: OwnerPayment[] }>(venuePath(id, "/payments"))).payments;
export const getFloorPlan = async <T,>(id: string) => (await apiRequest<{ floor_plan: T }>(venuePath(id, "/floor-plan"))).floor_plan;
export const saveFloorPlan = async <T,>(id: string, floorPlan: T) => (await apiRequest<{ floor_plan: T }>(venuePath(id, "/floor-plan"), { method: "PUT", body: JSON.stringify({ floor_plan: floorPlan }) })).floor_plan;
export const getSubscription = async () => (await apiRequest<{ subscription: OwnerSubscription | null }>("/owner/subscription")).subscription;
export const updateSubscription = async (plan: OwnerSubscription["plan"], billingCycle: OwnerSubscription["billing_cycle"]) => (await apiRequest<{ subscription: OwnerSubscription }>("/owner/subscription", { method: "PUT", body: JSON.stringify({ plan, billing_cycle: billingCycle }) })).subscription;
