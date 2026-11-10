"use client";

import { useEffect, useRef, useState } from "react";
import type { OwnerOrder, OrderStatus } from "../../../lib/owner-api";

export type OrderStatusChange = {
  from: OrderStatus;
  to: OrderStatus;
  version: number;
};

type FeedbackState = {
  source: OwnerOrder[];
  statuses: Map<string, OrderStatus>;
  changes: Record<string, OrderStatusChange>;
  sequence: number;
};

const statusMap = (orders: OwnerOrder[]) =>
  new Map(orders.map((order) => [order.id, order.status]));

// Detect confirmed server state, including polling updates. First loads and
// repeated snapshots of the same status do not announce successful actions.
export function useOrderStatusFeedback(orders: OwnerOrder[]) {
  const [state, setState] = useState<FeedbackState>(() => ({
    source: orders,
    statuses: statusMap(orders),
    changes: {},
    sequence: 0,
  }));
  const timers = useRef(
    new Map<string, { version: number; timer: ReturnType<typeof setTimeout> }>(),
  );

  // Compare with the previous snapshot while rendering, so a change is shown in
  // the same render that receives the new orders.
  if (state.source !== orders) {
    let sequence = state.sequence;
    const updates: Record<string, OrderStatusChange> = {};
    for (const order of orders) {
      const from = state.statuses.get(order.id);
      if (from && from !== order.status) {
        updates[order.id] = { from, to: order.status, version: ++sequence };
      }
    }
    setState({
      source: orders,
      statuses: statusMap(orders),
      changes: Object.keys(updates).length ? { ...state.changes, ...updates } : state.changes,
      sequence,
    });
  }

  // Each announced change disappears after five seconds unless a newer one replaced it.
  useEffect(() => {
    for (const [id, change] of Object.entries(state.changes)) {
      const scheduled = timers.current.get(id);
      if (scheduled?.version === change.version) continue;
      if (scheduled) clearTimeout(scheduled.timer);
      timers.current.set(id, {
        version: change.version,
        timer: setTimeout(() => {
          timers.current.delete(id);
          setState((current) => {
            if (current.changes[id]?.version !== change.version) return current;
            const changes = { ...current.changes };
            delete changes[id];
            return { ...current, changes };
          });
        }, 5000),
      });
    }
  }, [state.changes]);

  useEffect(() => {
    const active = timers.current;
    return () => {
      active.forEach(({ timer }) => clearTimeout(timer));
      active.clear();
    };
  }, []);

  return state.changes;
}
