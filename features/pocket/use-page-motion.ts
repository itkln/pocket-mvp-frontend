import { useLayoutEffect, useRef } from "react";

// The blocks of a Vendor page, in the order they arrive. Blocks sit at different depths
// (a stat grid, a layout with a side panel, a block inside a block), so CSS alone cannot count
// them; this hook numbers them in document order and vendor-motion.css turns the number into
// a delay. Blocks that render later (data arriving) keep counting for a short while; after that
// they arrive without a delay.
export const pageMotionBlocks = [
  ".vendor-stat-card",
  ".vendor-block",
  ".panel:not(.team-panel)",
  ".settings-nav",
  ".list-toolbar",
  ".team-list",
  ".orders-toolbar",
  ".orders-queue",
  ".orders-detail-column",
  ".vendor-menu-stats > button",
  ".vendor-stop-summary",
  ".vendor-category-panel",
  ".vendor-menu-group",
  ".floor-levels",
  ".subscription-plan",
].join(",");

const countingWindow = 1200;
const maxIndex = 9;

export function usePageMotion(page: string) {
  const area = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const root = area.current;
    if (!root) return;
    const started = performance.now();
    const seen = new WeakSet<Element>();
    let next = 0;
    const number = () => {
      root.querySelectorAll<HTMLElement>(pageMotionBlocks).forEach((block) => {
        if (seen.has(block)) return;
        seen.add(block);
        if (block.closest(".vendor-menu-drawer, .modal")) return;
        block.style.setProperty("--motion-i", String(Math.min(next++, maxIndex)));
      });
    };
    number();
    if (typeof MutationObserver === "undefined") return;
    // Mutation callbacks run before the next paint, so a new block gets its delay in time.
    const observer = new MutationObserver(() => {
      if (performance.now() - started > countingWindow) observer.disconnect();
      else number();
    });
    observer.observe(root, { childList: true, subtree: true });
    const stop = window.setTimeout(() => observer.disconnect(), countingWindow);
    return () => {
      observer.disconnect();
      window.clearTimeout(stop);
    };
  }, [page]);
  return area;
}
