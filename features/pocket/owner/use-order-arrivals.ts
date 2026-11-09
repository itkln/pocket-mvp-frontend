import { useCallback, useEffect, useRef, useState } from "react";
import type { OwnerOrder } from "../../../lib/owner-api";

export function useOrderArrivals(scope?: string, onArrivals?: (orders: OwnerOrder[]) => void) {
  const seen = useRef<Set<string> | null>(null);
  const audio = useRef<AudioContext | null>(null);
  const storageKey = scope && `vendor.opened-orders:${scope}`;
  const [opened, setOpened] = useState<Set<string>>(() => {
    try {
      return new Set(storageKey ? JSON.parse(localStorage.getItem(storageKey) ?? "[]") : []);
    } catch { return new Set(); }
  });
  useEffect(() => {
    if (!storageKey) return;
    try { localStorage.setItem(storageKey, JSON.stringify([...opened])); } catch { /* Storage may be disabled. */ }
  }, [opened, storageKey]);
  useEffect(() => {
    if (typeof AudioContext === "undefined") return;
    const context = new AudioContext();
    audio.current = context;
    const unlock = () => {
      if (context.state === "suspended") void context.resume().catch(() => {});
    };
    document.addEventListener("click", unlock, true);
    document.addEventListener("keydown", unlock, true);
    return () => {
      document.removeEventListener("click", unlock, true);
      document.removeEventListener("keydown", unlock, true);
      audio.current = null;
      void context.close().catch(() => {});
    };
  }, []);

  const reconcile = useCallback((orders: OwnerOrder[]) => {
    const known = seen.current;
    const fresh = known ? orders.filter(order => order.status === "new" && !known.has(order.id)) : [];
    const ids = known ?? new Set<string>();
    for (const order of orders) {
      ids.add(order.id);
    }
    seen.current = ids;
    if (fresh.length) onArrivals?.(fresh);
    const context = audio.current;
    if (!fresh.length || context?.state !== "running") return;
    for (const [i, frequency] of [740, 988].entries()) {
      const start = context.currentTime + i * 0.21;
      const tone = context.createOscillator();
      const gain = context.createGain();
      tone.frequency.value = frequency;
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(0.22, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.18);
      tone.connect(gain).connect(context.destination);
      tone.start(start);
      tone.stop(start + 0.2);
    }
  }, [onArrivals]);
  const markOpened = useCallback((id: string) => {
    setOpened(current => current.has(id) ? current : new Set(current).add(id));
  }, []);
  return { opened, reconcile, markOpened };
}
