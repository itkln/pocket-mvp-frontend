import { useSyncExternalStore } from "react";

// Interface animations can be switched off in the account settings. The choice belongs to the
// device (like the collapsed sidebar), so it lives in localStorage. While it is off the root
// element carries data-motion="off" and vendor-motion.css stops every animation and transition;
// CountUp checks motionEnabled() before counting.
const storageKey = "pocket:interface-motion";
const changeEvent = "pocket:interface-motion-change";

const readStored = () => {
  try {
    return window.localStorage.getItem(storageKey) !== "off";
  } catch {
    return true;
  }
};

export function applyMotionPreference(enabled = readStored()) {
  if (enabled) delete document.documentElement.dataset.motion;
  else document.documentElement.dataset.motion = "off";
}

export function setMotionPreference(enabled: boolean) {
  try {
    if (enabled) window.localStorage.removeItem(storageKey);
    else window.localStorage.setItem(storageKey, "off");
  } catch {
    // Without storage the choice still holds until the page is reloaded.
  }
  applyMotionPreference(enabled);
  window.dispatchEvent(new Event(changeEvent));
}

// Animations run only when the user allows them here and the system does not ask for less motion.
export function motionEnabled() {
  return (
    document.documentElement.dataset.motion !== "off" &&
    window.matchMedia("(prefers-reduced-motion: no-preference)").matches
  );
}

const subscribe = (onChange: () => void) => {
  const onStorage = (event: StorageEvent) => {
    if (event.key !== storageKey) return;
    applyMotionPreference();
    onChange();
  };
  window.addEventListener(changeEvent, onChange);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(changeEvent, onChange);
    window.removeEventListener("storage", onStorage);
  };
};

export function useMotionPreference() {
  return useSyncExternalStore(subscribe, readStored, () => true);
}
