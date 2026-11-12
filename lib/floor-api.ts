import { apiRequest } from "./api-client";

// The venue's live floor: who sits where and which bookings are expected today.
export type LiveParty = {
  reservation_id: string;
  code: string;
  guest_name: string;
  guest_count: number;
  seated_at: string;
  walk_in: boolean;
};
export type LiveBill = { id: string; opened_at: string; total_minor: number };
export type LiveTableState = "free" | "occupied" | "reserved";
export type LiveTable = {
  identifier: string;
  seats: number;
  state: LiveTableState;
  party?: LiveParty;
  bill?: LiveBill;
  next_reservation_id?: string;
};
export type LiveBooking = {
  id: string;
  code: string;
  table_identifier: string;
  guest_name: string;
  guest_phone?: string;
  guest_count: number;
  starts_at: string;
  ends_at: string;
  notes?: string;
  has_preorder: boolean;
};
export type LiveFloor = {
  now: string;
  timezone: string;
  currency: string;
  tables: LiveTable[];
  bookings: LiveBooking[];
};

const floorPath = (venueID: string, suffix = "") => `/venues/${venueID}/floor${suffix}`;
const post = async (path: string, body: unknown) =>
  (await apiRequest<{ floor: LiveFloor }>(path, { method: "POST", body: JSON.stringify(body) }))
    .floor;

export const getLiveFloor = async (venueID: string) =>
  (await apiRequest<{ floor: LiveFloor }>(floorPath(venueID))).floor;

// Seats a booked party; without a table it takes the one it booked.
export const seatReservation = (venueID: string, reservationID: string, tableIdentifier = "") =>
  post(floorPath(venueID, `/reservations/${reservationID}/seat`), {
    table_identifier: tableIdentifier,
  });

// Seats a party that came without a booking.
export const seatWalkIn = (
  venueID: string,
  input: { table_identifier: string; guests: number; guest_name?: string },
) => post(floorPath(venueID, "/walk-ins"), input);

// Frees a table after its party left.
export const releaseTable = (venueID: string, tableIdentifier: string) =>
  post(floorPath(venueID, "/release"), { table_identifier: tableIdentifier });
