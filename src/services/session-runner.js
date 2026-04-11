import { spawn } from "node:child_process";
import path from "node:path";
import { ensureOpenClawReady, splitCommand } from "../openclaw.js";
import { buildPrompt } from "../prompt.js";
import { extractJobUrlInsights } from "./job-url-insights.js";
import { extractResumeInsights } from "./resume.js";
import { getSettings } from "./settings-store.js";
import { cacheSessionState, getCachedSessionState } from "./redis.js";
import { createCampaignSnapshot, recordRunLog, updateCampaignStatus } from "./workspace-store.js";

const MAX_LOG_CHARS = 16000;
const sessionRunnerDeps = {
  spawn,
  ensureOpenClawReady,
  splitCommand,
  buildPrompt,
  extractJobUrlInsights,
  extractResumeInsights,
  getSettings,
  cacheSessionState,
  getCachedSessionState,
  createCampaignSnapshot,
  recordRunLog,
  updateCampaignStatus
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
        resumeSignals: [],
        sessionKey: null,
        campaignId: null
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
  const resumeInsights =
    settings.mode === "hire" && settings.jobOpeningUrl
      ? await sessionRunnerDeps.extractJobUrlInsights(settings.jobOpeningUrl)
      : await sessionRunnerDeps.extractResumeInsights(resumePath);
  const campaign = await sessionRunnerDeps.createCampaignSnapshot(settings);

  const prompt = sessionRunnerDeps.buildPrompt({
    mode: settings.mode,
    resumePath,
    jobsFile,
    jobOpeningUrl: settings.jobOpeningUrl || "",
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
    resumeSignals: resumeInsights.searchSignals,
    sessionKey: settings.session,
    campaignId: campaign?.id || null
  };
  await persistRuntimeState({ logToDatabase: true });

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
  await persistRuntimeState({ logToDatabase: true });

  child.stdout.on("data", (chunk) => {
    const next = `${runtime.state.logs}${chunk.toString()}`;
    runtime.state.logs = next.slice(-MAX_LOG_CHARS);
    runtime.state.response = extractJsonResponse(runtime.state.logs) || runtime.state.response;
    void persistRuntimeState();
  });

  child.stderr.on("data", (chunk) => {
    const next = `${runtime.state.logs}\n${chunk.toString()}`;
    runtime.state.logs = next.slice(-MAX_LOG_CHARS);
    void persistRuntimeState();
  });

  child.on("error", (error) => {
    runtime.state.status = "failed";
    runtime.state.error = error.message;
    runtime.state.finishedAt = new Date().toISOString();
    runtime.process = null;
    void persistRuntimeState({ logToDatabase: true, updateCampaign: true });
  });

  child.on("exit", (code, signal) => {
    runtime.state.exitCode = code;
    runtime.state.signal = signal;
    runtime.state.finishedAt = new Date().toISOString();
    runtime.state.status = runtime.state.status === "stopped" ? "stopped" : code === 0 ? "completed" : "failed";
    runtime.process = null;
    void persistRuntimeState({ logToDatabase: true, updateCampaign: true });
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
  void persistRuntimeState({ logToDatabase: true, updateCampaign: true });
  return getSessionState();
}

export function getSessionState() {
  const runtime = getRuntimeState();
  return {
    ...runtime.state
  };
}

export async function getSessionStateCached(sessionKey) {
  const runtime = getRuntimeState();
  if (runtime.state.sessionKey === sessionKey || runtime.process) {
    return getSessionState();
  }

  const cached = await sessionRunnerDeps.getCachedSessionState(sessionKey);
  return cached || getSessionState();
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
  sessionRunnerDeps.extractJobUrlInsights = extractJobUrlInsights;
  sessionRunnerDeps.extractResumeInsights = extractResumeInsights;
  sessionRunnerDeps.getSettings = getSettings;
  sessionRunnerDeps.cacheSessionState = cacheSessionState;
  sessionRunnerDeps.getCachedSessionState = getCachedSessionState;
  sessionRunnerDeps.createCampaignSnapshot = createCampaignSnapshot;
  sessionRunnerDeps.recordRunLog = recordRunLog;
  sessionRunnerDeps.updateCampaignStatus = updateCampaignStatus;
}

function extractJsonResponse(logs) {
  return __testablesExtractJsonResponse(logs);
}

async function persistRuntimeState({ logToDatabase = false, updateCampaign = false } = {}) {
  const runtime = getRuntimeState();
  if (!runtime.state.sessionKey) {
    return;
  }

  await sessionRunnerDeps.cacheSessionState(runtime.state.sessionKey, runtime.state);
  if (updateCampaign) {
    await sessionRunnerDeps.updateCampaignStatus({
      campaignId: runtime.state.campaignId,
      status: toCampaignStatus(runtime.state.status),
      finishedAt: runtime.state.finishedAt ? new Date(runtime.state.finishedAt) : null
    });
  }
  if (logToDatabase) {
    await sessionRunnerDeps.recordRunLog({
      campaignId: runtime.state.campaignId,
      sessionKey: runtime.state.sessionKey,
      status: runtime.state.status,
      payload: summarizeRuntimeState(runtime.state)
    });
  }
}

function summarizeRuntimeState(state) {
  return {
    status: state.status,
    pid: state.pid,
    startedAt: state.startedAt,
    finishedAt: state.finishedAt,
    exitCode: state.exitCode,
    signal: state.signal,
    error: state.error,
    response: state.response,
    resumeSignals: state.resumeSignals,
    promptPreview: state.promptPreview
  };
}

function toCampaignStatus(status) {
  if (status === "completed") {
    return "COMPLETED";
  }
  if (status === "failed") {
    return "FAILED";
  }
  if (status === "stopped") {
    return "STOPPED";
  }
  return "RUNNING";
}
