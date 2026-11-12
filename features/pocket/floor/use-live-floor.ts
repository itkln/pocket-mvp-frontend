"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getLiveFloor, type LiveFloor } from "../../../lib/floor-api";

const refreshEvery = 20_000;
const tickEvery = 15_000;

// The live floor of a venue, refreshed while the screen is visible. `now` follows the server
// clock, so "seated 12 min ago" does not depend on the device clock. A failed refresh is
// reported once, until the next successful one.
export function useLiveFloor(
  venueID: string | undefined,
  enabled: boolean,
  onError: (error: unknown) => void,
) {
  const [floor, setFloor] = useState<LiveFloor | null>(null);
  const [now, setNow] = useState(0);
  const clockOffset = useRef(0);
  const failed = useRef(false);
  // The latest callback, so a parent re-render never restarts the refresh cycle.
  const report = useRef(onError);
  useEffect(() => {
    report.current = onError;
  }, [onError]);

  const apply = useCallback((next: LiveFloor) => {
    clockOffset.current = Date.parse(next.now) - Date.now();
    failed.current = false;
    setFloor(next);
    setNow(Date.parse(next.now));
  }, []);

  useEffect(() => {
    if (!venueID || !enabled) return;
    let active = true;
    const load = () =>
      getLiveFloor(venueID)
        .then((next) => {
          if (active) apply(next);
        })
        .catch((error) => {
          if (!active || failed.current) return;
          failed.current = true;
          report.current(error);
        });
    const refresh = () => {
      if (document.visibilityState === "visible") void load();
    };
    void load();
    const poll = window.setInterval(refresh, refreshEvery);
    const tick = window.setInterval(() => setNow(Date.now() + clockOffset.current), tickEvery);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      active = false;
      window.clearInterval(poll);
      window.clearInterval(tick);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [apply, enabled, venueID]);

  return { floor, now, apply };
}
