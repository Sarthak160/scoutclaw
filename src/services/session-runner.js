import { spawn } from "node:child_process";
import path from "node:path";
import { ensureOpenClawReady, splitCommand } from "../openclaw.js";
import { buildPrompt } from "../prompt.js";
import { extractResumeInsights } from "./resume.js";
import { getSettings } from "./settings-store.js";

const MAX_LOG_CHARS = 16000;
const sessionRunnerDeps = {
  spawn,
  ensureOpenClawReady,
  splitCommand,
  buildPrompt,
  extractResumeInsights,
  getSettings
};

function getRuntimeState() {
  if (!globalThis.__scoutclawRuntimeState) {
    globalThis.__scoutclawRuntimeState = {
      process: null,
      state: {
        status: "idle",
        pid: null,
        startedAt: null,
        finishedAt: null,
        exitCode: null,
        signal: null,
        error: "",
        logs: "",
        promptPreview: "",
        response: "",
        resumeSignals: []
      }
    };
  }

  return globalThis.__scoutclawRuntimeState;
}

export async function startSessionRun() {
  const runtime = getRuntimeState();
  if (runtime.process) {
    throw new Error("A ScoutClaw run is already active.");
  }

  const settings = await sessionRunnerDeps.getSettings();
  const resumePath = settings.resumePath ? path.resolve(settings.resumePath) : "";
  const jobsFile = settings.jobsFile ? path.resolve(settings.jobsFile) : "";
  const workspace = path.resolve(settings.workspace || process.cwd());
  const profileArgs = settings.profile ? ["--profile", settings.profile] : [];
  const parsedCommand = sessionRunnerDeps.splitCommand(settings.openClawCmd);
  const resumeInsights = await sessionRunnerDeps.extractResumeInsights(resumePath);

  const prompt = sessionRunnerDeps.buildPrompt({
    resumePath,
    jobsFile,
    resumeInsights,
    applicant: settings.applicant,
    customFilters: settings.filters,
    extraPrompt: settings.extraPrompt || ""
  });

  runtime.state = {
    status: "running",
    pid: null,
    startedAt: new Date().toISOString(),
    finishedAt: null,
    exitCode: null,
    signal: null,
    error: "",
    logs: "",
    promptPreview: prompt.slice(0, 4000),
    response: "",
    resumeSignals: resumeInsights.searchSignals
  };

  await sessionRunnerDeps.ensureOpenClawReady({
    command: parsedCommand.command,
    commandArgs: parsedCommand.args,
    profileArgs,
    workspace
  });

  const child = sessionRunnerDeps.spawn(
    parsedCommand.command,
    [
      ...parsedCommand.args,
      ...profileArgs,
      "agent",
      "--session-id",
      settings.session,
      "--message",
      prompt,
      "--thinking",
      "low",
      "--json"
    ],
    {
      cwd: workspace,
      env: process.env
    }
  );

  runtime.process = child;
  runtime.state.pid = child.pid ?? null;

  child.stdout.on("data", (chunk) => {
    const next = `${runtime.state.logs}${chunk.toString()}`;
    runtime.state.logs = next.slice(-MAX_LOG_CHARS);
    runtime.state.response = extractJsonResponse(runtime.state.logs) || runtime.state.response;
  });

  child.stderr.on("data", (chunk) => {
    const next = `${runtime.state.logs}\n${chunk.toString()}`;
    runtime.state.logs = next.slice(-MAX_LOG_CHARS);
  });

  child.on("error", (error) => {
    runtime.state.status = "failed";
    runtime.state.error = error.message;
    runtime.state.finishedAt = new Date().toISOString();
    runtime.process = null;
  });

  child.on("exit", (code, signal) => {
    runtime.state.exitCode = code;
    runtime.state.signal = signal;
    runtime.state.finishedAt = new Date().toISOString();
    runtime.state.status = runtime.state.status === "stopped" ? "stopped" : code === 0 ? "completed" : "failed";
    runtime.process = null;
  });

  return getSessionState();
}

export function stopSessionRun() {
  const runtime = getRuntimeState();
  if (!runtime.process) {
    return getSessionState();
  }

  runtime.state.status = "stopped";
  runtime.state.finishedAt = new Date().toISOString();
  runtime.process.kill("SIGTERM");
  return getSessionState();
}

export function getSessionState() {
  const runtime = getRuntimeState();
  return {
    ...runtime.state
  };
}

export function __resetSessionRunnerState() {
  delete globalThis.__scoutclawRuntimeState;
  resetSessionRunnerDeps();
}

export function __setSessionRunnerDeps(overrides) {
  Object.assign(sessionRunnerDeps, overrides);
}

export function __testablesExtractJsonResponse(logs) {
  const lines = logs
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  for (let index = lines.length - 1; index >= 0; index -= 1) {
    try {
      const parsed = JSON.parse(lines[index]);
      if (typeof parsed?.reply === "string") {
        return parsed.reply;
      }
      if (typeof parsed?.message === "string") {
        return parsed.message;
      }
    } catch {
      continue;
    }
  }

  return "";
}

function resetSessionRunnerDeps() {
  sessionRunnerDeps.spawn = spawn;
  sessionRunnerDeps.ensureOpenClawReady = ensureOpenClawReady;
  sessionRunnerDeps.splitCommand = splitCommand;
  sessionRunnerDeps.buildPrompt = buildPrompt;
  sessionRunnerDeps.extractResumeInsights = extractResumeInsights;
  sessionRunnerDeps.getSettings = getSettings;
}

function extractJsonResponse(logs) {
  return __testablesExtractJsonResponse(logs);
}
