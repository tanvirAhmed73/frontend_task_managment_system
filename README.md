# Task management — frontend

Next.js app for the task management API. Point it at your backend with `NEXT_PUBLIC_API_URL` (see `.env.example`).

## Default seeded users (backend)

When the API is seeded with these values:

| Role  | Email            | Password           |
| ----- | ---------------- | ------------------ |
| Admin | admin@local.dev  | ChangeMeAdmin123!  |
| User  | user@local.dev   | ChangeMeUser123!   |

Equivalent backend env:

```
SEED_ADMIN_EMAIL=admin@local.dev
SEED_ADMIN_PASSWORD=ChangeMeAdmin123!
SEED_USER_EMAIL=user@local.dev
SEED_USER_PASSWORD=ChangeMeUser123!
```

## Local development

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Docker

Requires the API running separately (e.g. on the host at port 4000).

```bash
docker compose up --build
```

Optional: copy `docker.env.example` to `.env` to change `WEB_PORT` or API URLs. Rebuild after changing `NEXT_PUBLIC_*`.
