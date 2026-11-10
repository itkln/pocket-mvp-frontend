"use client";

import { useCallback, useEffect, useState } from "react";
import { APIError } from "../../../../lib/api-client";
import {
  getPublicVenue,
  getPublicVenueMenu,
  getPublicVenueReviews,
  type PublicMenuCategory,
  type PublicReview,
  type PublicVenue,
} from "../../../../lib/public-catalog-api";

export type VenueState = { venue?: PublicVenue; error?: "missing" | "failed" };
export type MenuState = { categories: PublicMenuCategory[]; loading: boolean; error: boolean };
export type ReviewsState = { items: PublicReview[]; loading: boolean; error: boolean };

const isAbort = (error: unknown) => error instanceof DOMException && error.name === "AbortError";

// Venue card and menu of a public venue. The menu reloads when the tab regains
// focus, and whenever `menuRevision` changes, so prices and stop-list stay fresh.
export function usePublicVenue(venueID: string, menuRevision: number) {
  const [venueState, setVenueState] = useState<VenueState>({});
  const [menuState, setMenuState] = useState<MenuState>({
    categories: [],
    loading: true,
    error: false,
  });
  const [reload, setReload] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    getPublicVenue(venueID, controller.signal)
      .then((venue) => setVenueState({ venue }))
      .catch((error: unknown) => {
        if (isAbort(error)) return;
        setVenueState({
          error: error instanceof APIError && error.status === 404 ? "missing" : "failed",
        });
      });
    return () => controller.abort();
  }, [venueID, reload]);

  useEffect(() => {
    let controller: AbortController | undefined;
    const loadMenu = () => {
      controller?.abort();
      const request = new AbortController();
      controller = request;
      getPublicVenueMenu(venueID, request.signal)
        .then((categories) => {
          if (!request.signal.aborted) setMenuState({ categories, loading: false, error: false });
        })
        .catch((error: unknown) => {
          if (request.signal.aborted || isAbort(error)) return;
          setMenuState({ categories: [], loading: false, error: true });
        });
    };
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") loadMenu();
    };
    loadMenu();
    window.addEventListener("focus", loadMenu);
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      controller?.abort();
      window.removeEventListener("focus", loadMenu);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [venueID, reload, menuRevision]);

  const retry = useCallback(() => {
    setVenueState({});
    setReload((value) => value + 1);
  }, []);
  // The booking flow may receive a newer menu (for example after a price change).
  const replaceMenu = useCallback(
    (categories: PublicMenuCategory[]) =>
      setMenuState({ categories, loading: false, error: false }),
    [],
  );

  return { venueState, menuState, retry, replaceMenu };
}

// Reviews load only while the reviews dialog is open.
export function useVenueReviews(venueID: string, open: boolean) {
  const [reviewsState, setReviewsState] = useState<ReviewsState>({
    items: [],
    loading: true,
    error: false,
  });
  const [reload, setReload] = useState(0);

  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    getPublicVenueReviews(venueID, controller.signal)
      .then((items) => setReviewsState({ items, loading: false, error: false }))
      .catch((error: unknown) => {
        if (isAbort(error)) return;
        setReviewsState({ items: [], loading: false, error: true });
      });
    return () => controller.abort();
  }, [venueID, open, reload]);

  // Show the loading state before the dialog opens or a retry starts.
  const resetReviews = useCallback(
    () => setReviewsState({ items: [], loading: true, error: false }),
    [],
  );
  const retryReviews = useCallback(() => {
    resetReviews();
    setReload((value) => value + 1);
  }, [resetReviews]);

  return { reviewsState, resetReviews, retryReviews };
}
