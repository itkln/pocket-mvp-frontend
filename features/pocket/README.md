# Pocket frontend structure

The application is organized around product features rather than technical page types.

- `model.ts` contains shared domain types, navigation definitions, and demo data.
- `ui.tsx` contains small reusable UI primitives with no product workflow state.
- `navigation.tsx` owns desktop and mobile navigation.
- `floor-plan.tsx` owns the floor editor domain and its persistence.
- `dialogs.tsx` contains cross-feature creation dialogs.
- `owner/` contains owner workflows split by business capability.
- `customer/` contains discovery, ordering, reservation, and account workflows.
- `staff/` contains service and kitchen workflows.
- `app/pocket-app.tsx` only coordinates authentication, global navigation, cart state, and modal state.

Add a new screen inside the matching role or domain folder and export its public entry point
from that folder's `index.ts`. Shared UI belongs in `ui.tsx` only when it is used by more
than one workflow and does not own product-specific state.
