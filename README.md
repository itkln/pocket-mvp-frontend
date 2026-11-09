# Pocket Frontends

The frontend is split into two independently runnable Next.js applications:

- **Pocket Vendor** (`apps/vendor`) for venue owners and staff.
- **Pocket Dish** (`apps/dish`) for individual restaurant pages, QR, guest accounts and reservations.

Authentication, API clients, localization, UI primitives, and domain features are
shared from `shared`, `features`, and `lib`. The applications have separate routes,
bundles, metadata, ports, and Docker images.

## Development

```bash
npm install
npm run dev:vendor
npm run dev:dish
```

- Pocket Vendor: http://localhost:3000
- Pocket Dish: http://localhost:3001

`npm run dev` remains an alias for Pocket Vendor. Build both applications with
`npm run build`, or use `npm run build:vendor` and `npm run build:dish` separately.

The browser uses the same-origin `/api/v1` route. Next.js proxies it to
`INTERNAL_API_URL` (`http://localhost:8080` for local development and the
`backend` service in Docker). Authentication uses a server-issued HttpOnly
cookie and does not store session secrets in browser storage.

Pocket Dish opens a restaurant directly at `/{locale}/r/{venueID}` or a table
at `/{locale}/qr/{token}`. The QR landing offers the shared current bill at
`/{locale}/qr/{token}/bill` and the existing ordering menu at
`/{locale}/qr/{token}/menu`, with return navigation and no sign-in requirement.
The bill reads `POST /public/table-bill`, refreshes every 15 seconds while visible,
and uses server totals. Empty bills disable payment. Online acquiring and the
payment action for populated bills are a separate task.
Existing `/venue/{venueID}` links redirect to the new page. Guest accounts retain registration, profile and personal reservations.
The former Spots catalog is preserved in source and an archive; it is not
included in the deployed Dish navigation. See [MVP scope and restoration](docs/dish-mvp.md).

Run the UI and API-client tests:

```bash
npm test
```

## Production container

Build the images independently:

```bash
docker build --build-arg APP_TARGET=vendor -t pocket-vendor .
docker build --build-arg APP_TARGET=dish -t pocket-dish .
```

The full stack starts both applications through `backend/docker-compose.yml`.

## Product documentation

- [Roles and permissions](./docs/roles/README.md)
- [Venue owner](./docs/roles/venue-owner.md)
- [Venue customer](./docs/roles/venue-customer.md)
- [Venue staff](./docs/roles/venue-staff.md)
- [Application user](./docs/roles/application-user.md)
