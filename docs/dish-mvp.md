# Pocket Vendor + Pocket Dish

Active MVP as of 2026-10-20:

- Vendor (`apps/vendor`, port 3000): owner/staff authentication, restaurant setup,
  menu, floor plan, table QR, reservations, orders. Under Venue → Page and QR,
  owners can open their guest page, copy its link and download an SVG QR.
- Dish (`apps/dish`, port 3001): an individual restaurant page, menu, booking and
  table QR orders. A guest can register, sign in, edit their profile, reset their
  password, view and cancel their own reservations. Existing identities, cookies
  and reservation ownership are reused. Browsing a restaurant remains public.

## Entry points

- `/{locale}/r/{venueID}` — restaurant cover and menu grid/list, with an online booking button. This is the main restaurant entry.
- `/{locale}/r/{venueID}/menu` — existing dish grid/list; `?category={id}` opens a category and `?search=1` opens menu search.
- `/{locale}/r/{venueID}/reservation` — booking flow: date, guests, contacts and optional preorder.
- `/{locale}/qr/{token}` — existing table QR capability; token is not regenerated.
- `/{locale}/venue/{venueID}` — compatibility redirect to `/r/{venueID}`, preserving
  menu query parameters and discarding the obsolete catalog return path.
- `/` and `/{locale}` return 404; Dish has no general homepage.
- `/{locale}/r/{venueID}/{profile|reservations|settings|notifications}` — guest account opened from a restaurant. Table QR uses the equivalent `/{locale}/qr/{token}/…` account routes.
- Standalone account and catalog URLs return 404. The logo, back buttons and logout return to the current restaurant/table entry.
- Login, registration and password recovery retain a validated restaurant/QR return
  URL. There is no redirect to Vendor from a guest login.

The restaurant ID is stable and does not change when its name changes. A general
QR never selects a table and never publishes a draft restaurant. Publication uses
Vendor's existing venue status: only active restaurants are public.

## Removed marketplace

The former Spots catalog (`apps/spots`, `shared/spots-app.tsx`, discovery, saved
venues and the old customer ordering/account screens) was removed from the source on
2026-11-09. Only Vendor and Dish are developed. Dish returns 404 for former discover,
restaurant catalog, favorites and history routes. The catalog backend remains
available, but Dish never requests it.

To look at the old catalog, use git history (the last commit containing it is the
parent of the removal commit) or the snapshot
`docs/archive/pocket-spots-before-dish-2026-10-19.zip`. Extract it into a separate
directory and compare; do not overwrite current shared files wholesale.

## Runtime

Dish container health checks use `/healthz`; the general `/` route deliberately returns 404.


Use `DISH_APP_BASE_URL` for public links, QR and password reset emails. The older
`SPOTS_APP_BASE_URL` and `EATS_APP_BASE_URL` are accepted as configuration fallbacks.
Identity reset requests accept `dish`; old `spots`/`eats` clients still work. The
existing internal `SpotsAppBaseURL` field remains a compatibility detail.

Docker Compose now starts `vendor`, `dish`, `backend` and `postgres`. Set
`VENDOR_IMAGE`, `DISH_IMAGE`, `BACKEND_IMAGE` for prebuilt images; `DISH_PORT`
defaults to 3001. Retire the previous `spots` container when switching so that the
same public port remains available to printed QR codes. No database migration or
user data deletion is needed for this product split.

## Checks

Route tests cover legacy URL redirects, guest account routes and validated login
return URLs. Shell tests cover restaurant-scoped navigation, private profile and authentication
requirements. Route tests reject the general homepage and validate the reservation
URL; booking tests verify direct entry and the existing preorder flow. Existing QR, bookings, cancellation and auth tests remain relevant.
The owner public-page endpoint is tested for authentication, owner scoping and
non-publication of drafts.

## Guest UI

Dish retains the restaurant cover, category strip, menu cards and booking flow
from the QR/restaurant UI. The main restaurant URL opens the cover and menu. The booking button opens `/reservation`; returning from booking opens the main restaurant URL. The earlier category-card landing component is not mounted.
Desktop reuses the original catalog header with sign-in, language dropdown and avatar/account dropdown, scoped to the restaurant. Mobile keeps the burger and language button using `VenueMenuSettings`, as on table QR. The burger includes Personal details, My reservations and Security. Personal details and Security open `/settings?section=profile` and `/settings?section=security` directly. Guests are sent through sign-in with the selected destination preserved. Language and saved menu view remain shared.


### Account menu styling

The mobile burger and `/profile` / `/settings` landing share `DishAccountMenu`:
compact editable identity, white rounded cards, monochrome outline icons in light
rounded tiles and inset row separators. Dish no longer mounts the former profile
landing or bottom account navigation. Detail forms remain functional and return
to this shared account menu. Sign-out is available in the menu.

The former Menu / Reservation / Language / Menu view block is removed from the
burger. Only table QR menus keep a Menu view row. Restaurant pages retain their
existing bottom view switch; language remains available from the header button.

### Desktop restaurant booking

The main restaurant page shows the existing date, guest count and available-time
booking form immediately in the right column on desktop. Selecting a time opens
the existing contact and optional preorder flow without a route change. Mobile
continues to open the reservation route from the bottom booking button.
A rounded square button beside the desktop category strip switches menu cards
and list view using the shared saved preference, without resetting booking input.
