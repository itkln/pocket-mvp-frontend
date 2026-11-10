"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { APIError } from "../../../../lib/api-client";
import { legacyTableOrderKeys } from "../../../../lib/table-order-history";
import { getVenueOrderHistory, type TableOrder } from "../../../../lib/table-orders-api";

const byNewest = (a: TableOrder, b: TableOrder) =>
  Date.parse(b.created_at) - Date.parse(a.created_at) || b.id.localeCompare(a.id);

// Orders this guest sent at the venue. Refreshes every 10 s while the history dialog
// is open. When the history scope changes (another guest session or sign-out), the
// list is replaced and `onScopeReset` lets the screen drop anything tied to old orders.
export function useTableOrderHistory(
  venueID: string | undefined,
  open: boolean,
  onScopeReset: () => void,
) {
  const [orders, setOrders] = useState<TableOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [revision, setRevision] = useState(0);
  const [cursor, setCursor] = useState("");
  const scopeKey = useRef("");
  const hasMorePages = useRef(false);
  const moreController = useRef<AbortController | null>(null);
  const resetRef = useRef(onScopeReset);
  useEffect(() => {
    resetRef.current = onScopeReset;
  });

  const rememberOrder = useCallback(
    (result: TableOrder) =>
      setOrders((current) =>
        [...current.filter((entry) => entry.id !== result.id), result].sort(
          (a, b) => Date.parse(b.created_at) - Date.parse(a.created_at),
        ),
      ),
    [],
  );
  const mergeHistory = useCallback(
    (page: TableOrder[]) =>
      setOrders((current) => {
        const byID = new Map(current.map((entry) => [entry.id, entry]));
        page.forEach((entry) => byID.set(entry.id, entry));
        return [...byID.values()].sort(byNewest);
      }),
    [],
  );
  const refresh = useCallback(() => setRevision((value) => value + 1), []);

  useEffect(() => () => moreController.current?.abort(), []);

  useEffect(() => {
    if (!venueID) return;
    const controller = new AbortController();
    let refreshing = false;
    const load = async () => {
      if (refreshing || moreController.current) return;
      refreshing = true;
      setLoading(true);
      try {
        const keys = legacyTableOrderKeys();
        const batches = keys.length
          ? Array.from({ length: Math.ceil(keys.length / 100) }, (_, index) =>
              keys.slice(index * 100, (index + 1) * 100),
            )
          : [[]];
        for (const legacyKeys of batches) {
          const page = await getVenueOrderHistory(venueID, {
            legacyKeys,
            signal: controller.signal,
          });
          if (controller.signal.aborted) return;
          if (scopeKey.current && scopeKey.current !== page.scope_key) {
            setOrders(page.orders);
            resetRef.current();
            hasMorePages.current = false;
          } else mergeHistory(page.orders);
          scopeKey.current = page.scope_key;
          if (!hasMorePages.current) setCursor(page.next_cursor ?? "");
        }
        setError(false);
      } catch (err) {
        if (!controller.signal.aborted) {
          if (err instanceof APIError && err.status === 401) {
            setOrders([]);
            resetRef.current();
            setCursor("");
            hasMorePages.current = false;
          }
          setError(true);
        }
      } finally {
        refreshing = false;
        if (!controller.signal.aborted) setLoading(false);
      }
    };
    void load();
    const interval = open
      ? window.setInterval(() => {
          if (document.visibilityState !== "hidden") void load();
        }, 10000)
      : undefined;
    return () => {
      controller.abort();
      if (interval) clearInterval(interval);
    };
  }, [venueID, revision, open, mergeHistory]);

  const loadMore = async () => {
    if (!venueID || !cursor || loading) return;
    moreController.current?.abort();
    const controller = new AbortController();
    moreController.current = controller;
    setLoading(true);
    try {
      const page = await getVenueOrderHistory(venueID, { cursor, signal: controller.signal });
      if (controller.signal.aborted) return;
      if (page.scope_key !== scopeKey.current) {
        refresh();
        return;
      }
      hasMorePages.current = true;
      mergeHistory(page.orders);
      setCursor(page.next_cursor ?? "");
      setError(false);
    } catch {
      if (!controller.signal.aborted) setError(true);
    } finally {
      if (moreController.current === controller) moreController.current = null;
      if (!controller.signal.aborted) setLoading(false);
    }
  };

  return { orders, loading, error, cursor, revision, refresh, rememberOrder, loadMore };
}
