# ScoutClaw

`ScoutClaw` is a thin wrapper around your installed `openclaw`.

When you run the project binary, it starts an `openclaw` session and injects a persistent system prompt for your job outreach workflow. The wrapper stays attached to the terminal and the session continues working until you close the CLI.

## How it works

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
npm link
cp .env.example .env
```

Fill in `.env` with:

- `OPEN_CLAW_CMD` if your executable is not literally `openclaw`
- your resume path
- your applicant details
- optional Gateway token or password if your Gateway requires auth
- optional SMTP details if your `openclaw` workflow can send mail

## Usage

Start the wrapper:

```bash
scoutclaw run --resume ./resume.pdf
```

Run with a jobs file:

```bash
scoutclaw run --jobs-file ./jobs.json --resume ./resume.pdf
```

If `open-claw` is installed under a different command or path:

```bash
scoutclaw run --open-claw-cmd /absolute/path/to/openclaw
```

If you need to pass additional arguments through to `openclaw`:

```bash
scoutclaw run --open-claw-arg --model --open-claw-arg some-model
```

Use a named OpenClaw profile:

```bash
scoutclaw run --profile work --resume ./resume.pdf
```

You can also append extra system instructions:

```bash
scoutclaw run --system-file ./campaign-instructions.txt
```

## Jobs file formats

The wrapper does not parse job files itself anymore. It simply tells `openclaw` where the file is. You can use:

- `jobs.txt`
- `jobs.json`
- `jobs.csv`
- any other format your `open-claw` workflow knows how to read

## Notes

- This project is now a client wrapper, not a custom outreach bot.
- The official CLI command is `openclaw`. If your shell still says not found, open a new terminal or run `source ~/.zprofile`.
- The wrapper keeps the session open until you terminate it with `Ctrl+C` or close the terminal.
- In this environment, OpenClaw is installed but not yet onboarded, so the first `scoutclaw run` will likely start the interactive onboarding flow.
# scoutclaw git init git add . git commit -m first commit git branch -M main git remote add origin git@github.com:Sarthak160/scoutclaw.git git push -u origin main
# scoutclaw git init git add . git commit -m first commit git branch -M main git remote add origin git@github.com:Sarthak160/scoutclaw.git git push -u origin main
# scoutclaw
