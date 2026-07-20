# Pocket MVP Frontend

Next.js frontend for Pocket MVP venue ordering, reservations, payments, and operations.

## Development

```bash
npm install
npm run dev
```

## Production container

Build and run the standalone Next.js image:

```bash
docker build -t pocket-mvp-frontend .
docker run --rm -p 3000:3000 pocket-mvp-frontend
```

The full frontend, API, migrations, and PostgreSQL stack is orchestrated by
`docker-compose.yml` in the sibling backend repository.

## Product documentation

- [Roles and permissions](./docs/roles/README.md)
- [Venue owner](./docs/roles/venue-owner.md)
- [Venue customer](./docs/roles/venue-customer.md)
- [Venue staff](./docs/roles/venue-staff.md)
- [Application user](./docs/roles/application-user.md)
