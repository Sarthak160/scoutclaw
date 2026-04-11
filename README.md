# ScoutClaw

ScoutClaw is a Next.js control room for resume-driven OpenClaw outreach runs. It lets you upload a resume, manage applicant and SMTP details, add custom targeting filters, and start or stop background outreach runs from the browser.

## What It Includes

- Resume upload with local PDF parsing for search signals
- GraphQL API for dashboard state, settings, filters, and run controls
- Background OpenClaw runner using `openclaw agent`
- SMTP and applicant profile management from the UI
- Prompt generation shared between the web app and the CLI wrapper
- PostgreSQL persistence via Prisma
- Redis-backed session caching for agent runs

## Setup

```bash
npm install
npm run prisma:generate
npm run dev
```

Open `http://localhost:3000`.

## Environment

Create a local `.env` file if you want defaults for applicant or SMTP settings:

```bash
OPEN_CLAW_CMD=openclaw
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

## GraphQL

ScoutClaw exposes a local GraphQL endpoint at `/api/graphql`.

Core operations:

- `dashboardState`
- `updateSettings`
- `addFilter`
- `removeFilter`
- `startRun`
- `stopRun`

Resume upload is handled by `POST /api/upload`.

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
- If `DATABASE_URL` is absent, ScoutClaw falls back to local JSON settings storage.
- If `REDIS_URL` is absent, session state stays in memory instead of Redis.
- The original CLI wrapper still exists and can be launched with `npm run cli`.
