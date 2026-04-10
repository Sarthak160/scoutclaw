# ScoutClaw

ScoutClaw is a Next.js control room for resume-driven OpenClaw outreach runs. It lets you upload a resume, manage applicant and SMTP details, add custom targeting filters, and start or stop background outreach runs from the browser.

## What It Includes

- Resume upload with local PDF parsing for search signals
- GraphQL API for dashboard state, settings, filters, and run controls
- Background OpenClaw runner using `openclaw agent`
- SMTP and applicant profile management from the UI
- Prompt generation shared between the web app and the CLI wrapper

## Getting Started

```bash
npm install
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

## Notes

- The web UI stores uploaded resumes and persisted settings under [`output/`](/home/sarthak.guest/clawd-bot/output).
- Start and stop controls manage a background `openclaw agent` process, not the TUI.
- The original CLI wrapper still exists and can be launched with `npm run cli`.
