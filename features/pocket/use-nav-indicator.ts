import { useCallback, useEffect, useLayoutEffect, useRef } from "react";

// One highlight for the active sidebar item. On navigation it stretches towards the new item
// and then lets go of the old one: the leading edge moves first, the trailing edge follows
// (the timing lives in vendor-motion.css, keyed by data-dir). `layout` names everything that
// decides where the active item sits: the screen and the list of items.
export function useNavIndicator(layout: string) {
  const root = useRef<HTMLElement>(null);
  const mark = useRef<HTMLSpanElement>(null);
  const lastTop = useRef<number | null>(null);

  const place = useCallback((animate: boolean) => {
    const area = root.current;
    const indicator = mark.current;
    if (!area || !indicator) return;
    const active = area.querySelector<HTMLElement>(".side-nav button.active");
    const box = area.getBoundingClientRect();
    const rect = active?.getBoundingClientRect();
    const list = active?.closest(".side-nav")?.getBoundingClientRect();
    // No active item, a hidden sidebar or an item scrolled out of its list: the item keeps
    // its own background (data-indicator switches it off in CSS only while the mark is shown).
    if (
      !rect ||
      !list ||
      !rect.height ||
      rect.top < list.top - 1 ||
      rect.bottom > list.bottom + 1
    ) {
      indicator.dataset.dir = "none";
      indicator.style.opacity = "0";
      delete area.dataset.indicator;
      lastTop.current = null;
      return;
    }
    const top = rect.top - box.top - area.clientTop + area.scrollTop;
    const previous = lastTop.current;
    indicator.dataset.dir =
      !animate || previous === null || Math.abs(top - previous) < 1
        ? "none"
        : top > previous
          ? "down"
          : "up";
    indicator.style.top = `${top}px`;
    indicator.style.bottom = `${area.clientHeight - top - rect.height}px`;
    indicator.style.left = `${rect.left - box.left - area.clientLeft}px`;
    indicator.style.width = `${rect.width}px`;
    indicator.style.opacity = "1";
    area.dataset.indicator = "on";
    lastTop.current = top;
  }, []);

  // The active item changed: travel to it.
  useLayoutEffect(() => {
    place(true);
  }, [place, layout]);

  // The sidebar resized or its list scrolled: follow the item without a transition.
  useEffect(() => {
    const area = root.current;
    if (!area) return;
    const follow = () => place(false);
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(follow);
    observer?.observe(area);
    area.addEventListener("scroll", follow, { capture: true, passive: true });
    return () => {
      observer?.disconnect();
      area.removeEventListener("scroll", follow, { capture: true });
    };
  }, [place]);

  return [root, mark] as const;
}
