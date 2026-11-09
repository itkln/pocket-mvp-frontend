"use client";

import { useEffect, useRef, useState } from "react";
import type { OwnerOrder, OrderStatus } from "../../../lib/owner-api";

export type OrderStatusChange = {
  from: OrderStatus;
  to: OrderStatus;
  version: number;
};

// Detect confirmed server state, including polling updates. First loads and
// repeated snapshots of the same status do not announce successful actions.
export function useOrderStatusFeedback(orders: OwnerOrder[]) {
  const previous = useRef(new Map(orders.map((order) => [order.id, order.status])));
  const sequence = useRef(0);
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  const [changes, setChanges] = useState<Record<string, OrderStatusChange>>({});

  useEffect(() => {
    const updates: Record<string, OrderStatusChange> = {};
    for (const order of orders) {
      const from = previous.current.get(order.id);
      if (from && from !== order.status) {
        updates[order.id] = { from, to: order.status, version: ++sequence.current };
      }
    }
    previous.current = new Map(orders.map((order) => [order.id, order.status]));
    if (!Object.keys(updates).length) return;

    setChanges((current) => ({ ...current, ...updates }));
    for (const [id, change] of Object.entries(updates)) {
      clearTimeout(timers.current.get(id));
      timers.current.set(
        id,
        setTimeout(() => {
          timers.current.delete(id);
          setChanges((current) => {
            if (current[id]?.version !== change.version) return current;
            const next = { ...current };
            delete next[id];
            return next;
          });
        }, 5000),
      );
    }
  }, [orders]);

  useEffect(() => {
    const active = timers.current;
    return () => {
      active.forEach(clearTimeout);
      active.clear();
    };
  }, []);

  return changes;
}
