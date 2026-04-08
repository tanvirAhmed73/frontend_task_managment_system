This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Docker

This repository is the **frontend** only. `docker compose up` builds and runs the Next.js app on port **3000** (override with `WEB_PORT`).

1. Start your API on the host (default assumed: `http://localhost:4000`).
2. From the repo root:

```bash
docker compose up --build
```

3. Open [http://localhost:3000](http://localhost:3000).

The compose file defaults `NEXT_PUBLIC_API_URL` and `NEXT_PUBLIC_SOCKET_ORIGIN` to `host.docker.internal:4000` so the container can reach a backend running on your machine. To customize, copy `docker.env.example` to `.env` and adjust, then run `docker compose up --build` again so client env vars are rebaked.

If you add the backend to the same Compose project later, point those URLs at the API service name (for example `http://api:4000/api`).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
