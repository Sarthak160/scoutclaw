#!/usr/bin/env node

import { Command } from "commander";
import dotenv from "dotenv";
import fs from "node:fs/promises";
import path from "node:path";
import { PDFParse } from "pdf-parse";
import { ensureOpenClawReady, spawnTuiSession, splitCommand } from "./openclaw.js";
import { buildPrompt } from "./prompt.js";

dotenv.config({ quiet: true });

const program = new Command();

program
  .name("scoutclaw")
  .description("Thin wrapper that starts an open-claw session for continuous job outreach work.")
  .version("0.2.0");

program
  .command("run")
  .description("Start an open-claw session with the job outreach workflow prompt")
  .option("--resume <path>", "Path to your resume file", process.env.CLAWD_RESUME_PATH || "resume.pdf")
  .option("--jobs-file <path>", "Optional text/json/csv file listing job URLs or structured leads")
  .option("--workspace <path>", "Working directory for the claw session", process.cwd())
  .option(
    "--open-claw-cmd <cmd>",
    "Command or absolute path used to start open-claw",
    process.env.OPEN_CLAW_CMD || "openclaw"
  )
  .option(
    "--open-claw-arg <value...>",
    "Extra arguments forwarded to open-claw before the prompt"
  )
  .option("--name <value>", "Your full name", process.env.APPLICANT_NAME || "")
  .option("--email <value>", "Your email address", process.env.APPLICANT_EMAIL || "")
  .option("--phone <value>", "Your phone number", process.env.APPLICANT_PHONE || "")
  .option("--linkedin <value>", "Your LinkedIn URL", process.env.APPLICANT_LINKEDIN || "")
  .option("--portfolio <value>", "Your portfolio URL", process.env.APPLICANT_PORTFOLIO || "")
  .option("--mail-from <value>", "Default sender address", process.env.MAIL_FROM || "")
  .option("--smtp-host <value>", "SMTP host", process.env.SMTP_HOST || "")
  .option("--smtp-port <value>", "SMTP port", process.env.SMTP_PORT || "")
  .option("--smtp-user <value>", "SMTP username", process.env.SMTP_USER || "")
  .option("--smtp-pass <value>", "SMTP password or app password", process.env.SMTP_PASS || "")
  .option("--session <key>", "OpenClaw TUI session key", "scoutclaw")
  .option("--profile <name>", "OpenClaw profile name")
  .option("--gateway-token <value>", "Gateway token if required", process.env.OPENCLAW_GATEWAY_TOKEN || "")
  .option("--gateway-password <value>", "Gateway password if required", process.env.OPENCLAW_GATEWAY_PASSWORD || "")
  .option("--system-file <path>", "Optional file to append to the generated system prompt")
  .action(async (options) => {
    try {
      await runOpenClawSession(options);
    } catch (error) {
      console.error(error instanceof Error ? error.message : String(error));
      process.exitCode = 1;
    }
  });

await program.parseAsync(process.argv);

async function runOpenClawSession(options) {
  const workspace = path.resolve(options.workspace);
  const resumePath = path.resolve(options.resume);
  const jobsFile = options.jobsFile ? path.resolve(options.jobsFile) : "";
  const extraPrompt = options.systemFile ? await fs.readFile(path.resolve(options.systemFile), "utf8") : "";
  const profileArgs = options.profile ? ["--profile", options.profile] : [];
  const resumeInsights = await extractResumeInsights(resumePath);

  const prompt = buildPrompt({
    resumePath,
    jobsFile,
    resumeInsights,
    applicant: {
      name: options.name,
      email: options.email,
      phone: options.phone,
      linkedin: options.linkedin,
      portfolio: options.portfolio,
      mailFrom: options.mailFrom,
      smtpHost: options.smtpHost,
      smtpPort: options.smtpPort,
      smtpUser: options.smtpUser,
      smtpPass: options.smtpPass
    },
    extraPrompt
  });

  const parsedCommand = splitCommand(options.openClawCmd);
  const forwardedArgs = Array.isArray(options.openClawArg) ? options.openClawArg : [];

  await ensureOpenClawReady({
    command: parsedCommand.command,
    commandArgs: parsedCommand.args,
    profileArgs,
    workspace
  });

  const child = spawnTuiSession({
    command: parsedCommand.command,
    commandArgs: parsedCommand.args,
    profileArgs,
    session: options.session,
    prompt,
    forwardedArgs,
    gatewayToken: options.gatewayToken,
    gatewayPassword: options.gatewayPassword,
    workspace
  });

  child.on("exit", (code, signal) => {
    if (signal) {
      process.kill(process.pid, signal);
      return;
    }
    process.exit(code ?? 0);
  });

  child.on("error", (error) => {
    console.error(
      `Failed to start open-claw with "${options.openClawCmd}". Set OPEN_CLAW_CMD or pass --open-claw-cmd with the correct executable path.`
    );
    console.error(error.message);
    process.exit(1);
  });
}

async function extractResumeInsights(resumePath) {
  try {
    const data = await fs.readFile(resumePath);
    const parser = new PDFParse({ data });
    const result = await parser.getText();
    await parser.destroy();

    const normalizedText = normalizeWhitespace(result.text);
    return {
      excerpt: normalizedText.slice(0, 4000),
      searchSignals: deriveSearchSignals(normalizedText)
    };
  } catch {
    return {
      excerpt: "",
      searchSignals: []
    };
  }
}

function normalizeWhitespace(text) {
  return String(text).replace(/\s+/g, " ").trim();
}

function deriveSearchSignals(text) {
  const signals = [];
  const lowerText = text.toLowerCase();
  const rules = [
    [/golang| go /i, "golang"],
    [/\bjava\b/i, "java"],
    [/\bpython\b/i, "python"],
    [/\bjavascript\b|\bnode\.?js\b/i, "nodejs"],
    [/\btypescript\b/i, "typescript"],
    [/\breact\b/i, "react"],
    [/\bnext\.?js\b/i, "nextjs"],
    [/\baws\b|amazon web services/i, "aws"],
    [/\bgcp\b|google cloud/i, "gcp"],
    [/\bazure\b/i, "azure"],
    [/\bdocker\b/i, "docker"],
    [/\bkubernetes\b|\bk8s\b/i, "kubernetes"],
    [/\bpostgres(?:ql)?\b/i, "postgresql"],
    [/\bmysql\b/i, "mysql"],
    [/\bmongodb\b/i, "mongodb"],
    [/\bredis\b/i, "redis"],
    [/\bgraphql\b/i, "graphql"],
    [/\bgrpc\b/i, "grpc"],
    [/\bmicroservices?\b/i, "microservices"],
    [/\bdistributed systems?\b/i, "distributed systems"],
    [/\bbackend\b/i, "backend"],
    [/\bfull[\s-]?stack\b/i, "full stack"],
    [/\bsde[\s-]?2\b|\bsoftware engineer ii\b/i, "sde2"],
    [/\bsenior software engineer\b/i, "senior software engineer"]
  ];

  for (const [pattern, label] of rules) {
    if (pattern.test(lowerText)) {
      signals.push(label);
    }
  }

  return signals.slice(0, 12);
}
