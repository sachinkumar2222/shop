# Deploy the frontend to Vercel

This repository contains a Next.js frontend and a stateful Express backend. Deploy the frontend on Vercel; run the API and its WhatsApp/BullMQ worker on a persistent Node.js host, with managed PostgreSQL and Redis. The backend starts a queue worker from `backend/src/server.js`, and product uploads are stored on the backend filesystem, so the backend is not configured as a Vercel-only deployment.

## Vercel project settings

1. Import `sachinkumar2222/shop` from GitHub.
2. Set **Root Directory** to `frontend`.
3. Keep the detected Next.js build settings (`npm install`, `npm run build`).
4. Add the `BACKEND_URL` environment variable in Vercel for Production and Preview. Set it to the HTTPS origin of the deployed API, without a trailing slash, for example `https://your-api.example.com`.
5. Deploy. The Next.js rewrites proxy `/api/v1/*` and `/uploads/*` to `BACKEND_URL`.

## Backend requirements

Before the frontend can log in or load data, deploy the backend and provide these backend environment variables through the backend host's secret settings:

- `DATABASE_URL` and `DIRECT_URL` for managed PostgreSQL
- `REDIS_URL` for managed Redis/Key Value
- `JWT_SECRET` set to a new random secret
- `PII_ENCRYPTION_KEY` set to a 64-character hex key
- `CORS_ORIGIN` set to the Vercel site origin
- `PORT` supplied by the hosting service

Do not paste production secrets into source files or commit them. The `start` script currently runs migrations, seeding, and data encryption at startup; review that startup flow before using it with a live database.

## Current blockers

- The backend, PostgreSQL, and Redis do not have public hosting URLs yet.
- The repository's README previously contained an encryption key and connection details. They were removed from the current version; if any of those values protected live data, rotate them safely. Changing the PII key without re-encrypting existing values would make those values unreadable.
