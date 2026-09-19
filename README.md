# Pocket Frontends

The frontend is split into two independently runnable Next.js applications:

- **Pocket Vendor** (`apps/vendor`) for venue owners and staff.
- **Pocket Spots** (`apps/spots`) for guests, reservations, and reservation preorders.

Authentication, API clients, localization, UI primitives, and domain features are
shared from `shared`, `features`, and `lib`. The applications have separate routes,
bundles, metadata, ports, and Docker images.

## Development

```bash
npm install
npm run dev:vendor
npm run dev:spots
```

- Pocket Vendor: http://localhost:3000
- Pocket Spots: http://localhost:3001

`npm run dev` remains an alias for Pocket Vendor. Build both applications with
`npm run build`, or use `npm run build:vendor` and `npm run build:spots` separately.

The browser uses the same-origin `/api/v1` route. Next.js proxies it to
`INTERNAL_API_URL` (`http://localhost:8080` for local development and the
`backend` service in Docker). Authentication uses a server-issued HttpOnly
cookie and does not store session secrets in browser storage.

Pocket Spots `/discover` uses the public `/api/v1/public/venues` catalog. City,
search, category, filters, and pagination are evaluated by the backend; the UI
provides loading, error/retry, empty, and paginated result states. The route
remains available without a session, while favorites stay hidden for guests.

Run the UI and API-client tests:

```bash
npm test
```

## Production container

Build the images independently:

```bash
docker build --build-arg APP_TARGET=vendor -t pocket-vendor .
docker build --build-arg APP_TARGET=spots -t pocket-spots .
```

The full stack starts both applications through `backend/docker-compose.yml`.

## Product documentation

- [Roles and permissions](./docs/roles/README.md)
- [Venue owner](./docs/roles/venue-owner.md)
- [Venue customer](./docs/roles/venue-customer.md)
- [Venue staff](./docs/roles/venue-staff.md)
- [Application user](./docs/roles/application-user.md)
