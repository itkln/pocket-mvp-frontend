"use client";

import { useEffect, useState, type RefObject } from "react";

/** Reveal on upward intent, with a small dead zone for touch jitter and iOS bounce. */
export function useScrollHeader(container?: RefObject<HTMLElement | null>, resetKey?: string) {
  const [hidden, setHidden] = useState(false);
  useEffect(() => {
    const element = container?.current;
    const target = element ?? window;
    const position = () =>
      Math.max(
        0,
        Math.min(
          element ? element.scrollTop : window.scrollY,
          element
            ? element.scrollHeight - element.clientHeight
            : document.documentElement.scrollHeight - window.innerHeight,
        ),
      );
    let anchor = position();
    const update = () => {
      const current = position();
      if (current <= 8) {
        setHidden(false);
        anchor = current;
      } else if (Math.abs(current - anchor) >= 8) {
        setHidden(current > anchor);
        anchor = current;
      }
    };
    target.addEventListener("scroll", update, { passive: true });
    return () => target.removeEventListener("scroll", update);
  }, [container, resetKey]);
  return hidden;
}
