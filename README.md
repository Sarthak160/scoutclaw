# ScoutClaw

ScoutClaw is a two-sided Next.js control room for OpenClaw-powered outreach campaigns. It supports `Get hired` workflows for job/recruiter outreach and `Want to hire` workflows for candidate/student outreach from a role brief or job opening URL.

The project is written entirely in **TypeScript** — the Next.js app (App Router pages, UI components, and route handlers), the shared services layer, and the CLI wrapper all share strongly-typed models.

## What It Includes

- Fully typed TypeScript codebase across the web app, services, and CLI
- Resume or role-brief upload with local PDF parsing for search signals
- Two campaign modes: applicant outreach and hiring outreach
- GraphQL API for dashboard state, settings, filters, and run controls
- Background OpenClaw runner using `openclaw agent`
- SMTP, applicant profile, custom filters, and advanced prompt management from the UI
- Prompt generation shared between the web app and the CLI wrapper
- PostgreSQL persistence via Prisma for users, workspaces, subscriptions, campaigns, leads, messages, run logs, and uploads
- Redis-backed session caching for active agent runs
- Stripe checkout endpoint for pricing plans

## Setup

```bash
npm install
npm run prisma:generate
npm run dev
```

Open `http://localhost:3000`.

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the Next.js dev server |
| `npm run build` | Type-check and build the Next.js production bundle |
| `npm run start` | Serve the production build |
| `npm run typecheck` / `npm run lint` | Run `tsc --noEmit` over the whole project |
| `npm test` | Run the `node:test` suite through `tsx` |
| `npm run cli` | Run the CLI wrapper from source via `tsx` |
| `npm run build:cli` | Compile the CLI + services to `dist/` (NodeNext ESM) |
| `npm run prisma:generate` | Generate the Prisma client |
| `npm run prisma:push` | Push the Prisma schema to the database |

The published `scoutclaw` binary points at `dist/cli.js`, so run `npm run build:cli` before invoking it as an installed executable. During development use `npm run cli` (which runs `src/cli.ts` directly through `tsx`).

Relative imports keep the `.js` extension even though the sources are `.ts`/`.tsx`; this is the standard TypeScript-ESM convention and is required so the CLI can be compiled with NodeNext module resolution. `next.config.ts` teaches webpack to resolve those `.js` requests to the corresponding TypeScript files.

## Environment

Create a local `.env` file if you want defaults for applicant, SMTP, payments, database, or cache settings:

```bash
OPEN_CLAW_CMD=openclaw
SCOUTCLAW_OUTPUT_DIR=./output
APPLICANT_NAME=
APPLICANT_EMAIL=
APPLICANT_PHONE=
APPLICANT_LINKEDIN=
APPLICANT_PORTFOLIO=
MAIL_FROM=
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/scoutclaw?schema=public
REDIS_URL=redis://127.0.0.1:6379
OPENAI_API_KEY=
STRIPE_SECRET_KEY=
```

For local development without Docker, make sure PostgreSQL and Redis are reachable at `DATABASE_URL` and `REDIS_URL`. If either service is unavailable, ScoutClaw degrades gracefully: settings fall back to local JSON storage and session caching falls back to in-memory state.

## GraphQL

ScoutClaw exposes a local GraphQL endpoint at `/api/graphql`.

Core operations:

- `dashboardState`
- `updateSettings`
- `addFilter`
- `removeFilter`
- `startRun`
- `stopRun`

Resume and role-brief upload is handled by `POST /api/upload`.

## Docker Compose

ScoutClaw includes a single `docker-compose.yml` that runs:

- ScoutClaw frontend + backend
- OpenClaw gateway inside the app container
- PostgreSQL
- Redis

To start everything:

```bash
cp .env.example .env
docker compose up --build
```

Then open `http://localhost:3002`.

If you want a different host port, set it in `.env`:

```bash
SCOUTCLAW_WEB_PORT=3002
OPENCLAW_GATEWAY_HOST_PORT=18790
```

Important notes:

- Set `OPENAI_API_KEY` in `.env` for model access inside Docker, or configure OpenClaw OAuth/auth inside the mounted `openclaw-data` volume.
- Set `STRIPE_SECRET_KEY` if you want checkout to work.
- Prisma schema is pushed automatically on container start when `DATABASE_URL` is present.
- OpenClaw state persists in the Docker `openclaw-data` volume.

## Docker Compose

ScoutClaw includes a single `docker-compose.yml` that runs:

- ScoutClaw frontend + backend
- OpenClaw gateway inside the app container
- PostgreSQL
- Redis

To start everything:

```bash
cp .env.example .env
docker compose up --build
```

Then open `http://localhost:3002`.

If you want a different host port, set it in `.env`:

```bash
SCOUTCLAW_WEB_PORT=3002
OPENCLAW_GATEWAY_HOST_PORT=18790
```

Important notes:

- Set `OPENAI_API_KEY` in `.env` for model access inside Docker.
- Set `STRIPE_SECRET_KEY` if you want checkout to work.
- Prisma schema is pushed automatically on container start when `DATABASE_URL` is present.
- OpenClaw state persists in the Docker `openclaw-data` volume.

## Notes

- The web UI still uses `openclaw` as a subprocess for agent runs.
- If `DATABASE_URL` is absent or temporarily unreachable, ScoutClaw falls back to local JSON settings storage.
- If `REDIS_URL` is absent or temporarily unreachable, session state stays in memory instead of Redis.
- The original CLI wrapper still exists and can be launched with `npm run cli` (or compiled with `npm run build:cli`).
