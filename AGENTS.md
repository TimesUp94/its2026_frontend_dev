# Repository Guidelines

## Project Structure

This repository contains a full-stack mini-commerce app. `backend/src/` holds the Express API, route handlers, auth middleware, SQLite/Drizzle schema and seed data. `frontend/src/` contains the React app, pages, shared components, API/auth helpers, styles and assets; static files live in `frontend/public/`. The project currently has no dedicated test directory or test runner.

## Build, Test, and Development

Use Node.js 24 or newer. Install dependencies separately in `backend/` and `frontend/` with `npm install`.

- Backend: `npm run dev` starts the watch-mode API on port 3001. Run `npm run db:push` to apply the Drizzle schema and `npm run db:seed` to load demo data and the admin account.
- Frontend: `npm run dev` starts Vite on port 5173 (with `/api` proxied to the backend). `npm run build` type-checks and creates the production bundle; `npm run lint` runs Oxlint.
- `npm run db:reset` in `backend/` deletes and rebuilds the local database, including reseeding it. Use only when you intend to discard local data.

There are no automated test scripts configured at present; run the frontend build and lint checks when validating UI changes, and manually exercise affected API flows.

## Coding Style & Naming

Follow the existing TypeScript conventions: two-space indentation, semicolons, single quotes in backend files, and double quotes in frontend files. Use `PascalCase` for React components, `camelCase` for variables/functions, and descriptive lower-case route filenames (for example, `backend/src/routes/products.ts`). Keep API access in `frontend/src/lib/api.ts` and database definitions in `backend/src/db/schema.ts`; avoid duplicating those responsibilities in page components or routes.

## Commits & Pull Requests

Recent commits use short imperative summaries, often prefixed with a concise verb (for example, “Add categories table…”). Keep commits focused and explain the user-visible or data-model change. Pull requests should describe behavior and implementation, list relevant validation commands, and include screenshots for visible UI changes. Call out schema or seed changes explicitly.

## Configuration & Data

Set `JWT_SECRET` through the environment for non-demo use; never commit secrets. Database push and seed scripts can be destructive or replace demo data, so review their effects before running against anything beyond a local development database.
