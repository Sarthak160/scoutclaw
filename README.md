# ScoutClaw

ScoutClaw is a Next.js control room for resume-driven OpenClaw outreach runs. It lets you upload a resume, manage applicant and SMTP details, add custom targeting filters, and start or stop background outreach runs from the browser.

## What It Includes

- Resume upload with local PDF parsing for search signals
- GraphQL API for dashboard state, settings, filters, and run controls
- Background OpenClaw runner using `openclaw agent`
- SMTP and applicant profile management from the UI
- Prompt generation shared between the web app and the CLI wrapper

- `ScoutClaw` does not implement its own agent loop.
- It launches `openclaw` as a subprocess.
- It passes your resume path, applicant details, optional jobs file, and SMTP context into the initial prompt.
- If OpenClaw is not configured yet, it runs `openclaw onboard`.
- If the Gateway is stopped, it starts `openclaw gateway`.
- It then opens `openclaw tui` with your outreach prompt as the initial message.
- After that, OpenClaw owns the session and keeps working until you stop it.

## Setup

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

- This project is now a client wrapper, not a custom outreach bot.
- The official CLI command is `openclaw`. If your shell still says not found, open a new terminal or run `source ~/.zprofile`.
- The wrapper keeps the session open until you terminate it with `Ctrl+C` or close the terminal.
- In this environment, OpenClaw is installed but not yet onboarded, so the first `scoutclaw run` will likely start the interactive onboarding flow.
