import test from "node:test";
import assert from "node:assert/strict";
import { EventEmitter } from "node:events";

import {
  __resetSessionRunnerState,
  __setSessionRunnerDeps,
  __testablesExtractJsonResponse,
  getSessionState,
  getSessionStateCached,
  startSessionRun,
  stopSessionRun
} from "../src/services/session-runner.js";
import type { SessionState, Settings } from "../src/types.js";

interface FakeChild extends EventEmitter {
  stdout: EventEmitter;
  stderr: EventEmitter;
  pid: number;
  kill: (signal?: NodeJS.Signals | number) => void;
  killedWith: NodeJS.Signals | number | null;
}

function createFakeChild(): FakeChild {
  const child = new EventEmitter() as FakeChild;
  child.stdout = new EventEmitter();
  child.stderr = new EventEmitter();
  child.pid = 4321;
  child.killedWith = null;
  child.kill = (signal) => {
    child.killedWith = signal ?? null;
  };
  return child;
}

function createSettings(overrides: Partial<Settings> = {}): Settings {
  return {
    mode: "",
    resumePath: "",
    jobsFile: "",
    jobOpeningUrl: "",
    workspace: "/tmp",
    openClawCmd: "openclaw",
    openClawArgs: ["--model", "openai-codex/gpt-5.4"],
    session: "scoutclaw-web",
    profile: "",
    extraPrompt: "",
    filters: [],
    applicant: {
      name: "",
      email: "",
      phone: "",
      linkedin: "",
      portfolio: "",
      mailFrom: "",
      smtpHost: "",
      smtpPort: "587",
      smtpUser: "",
      smtpPass: ""
    },
    ...overrides
  };
}

test("session runner extracts JSON reply lines", () => {
  assert.equal(__testablesExtractJsonResponse('noise\n{"reply":"hello"}'), "hello");
  assert.equal(__testablesExtractJsonResponse('noise\n{"message":"world"}'), "world");
  assert.equal(__testablesExtractJsonResponse("noise only"), "");
});

test("session runner starts, captures output, and stops a process", async () => {
  __resetSessionRunnerState();
  const child = createFakeChild();

  __setSessionRunnerDeps({
    getSettings: async () => createSettings({ filters: ["remote"] }),
    splitCommand: () => ({ command: "openclaw", args: ["--model", "openai-codex/gpt-5.4"] }),
    extractResumeInsights: async () => ({ excerpt: "resume", searchSignals: ["golang"] }),
    buildPrompt: () => "prompt text",
    ensureOpenClawReady: async () => {},
    spawn: () => child
  });

  const started = await startSessionRun();
  assert.equal(started.status, "running");
  assert.equal(started.pid, 4321);
  assert.deepEqual(started.resumeSignals, ["golang"]);

  child.stdout.emit("data", Buffer.from('{"reply":"tailored outreach"}'));
  assert.equal(getSessionState().response, "tailored outreach");

  const stopped = stopSessionRun();
  assert.equal(stopped.status, "stopped");
  assert.equal(child.killedWith, "SIGTERM");

  child.emit("exit", 0, null);
  assert.equal(getSessionState().status, "stopped");
});

test("session runner marks failures on child error", async () => {
  __resetSessionRunnerState();
  const child = createFakeChild();

  __setSessionRunnerDeps({
    getSettings: async () => createSettings(),
    splitCommand: () => ({ command: "openclaw", args: [] }),
    extractResumeInsights: async () => ({ excerpt: "", searchSignals: [] }),
    buildPrompt: () => "prompt",
    ensureOpenClawReady: async () => {},
    spawn: () => child
  });

  await startSessionRun();
  child.emit("error", new Error("boom"));
  assert.equal(getSessionState().status, "failed");
  assert.equal(getSessionState().error, "boom");
});

test("session runner can read a cached session snapshot", async () => {
  __resetSessionRunnerState();

  const cached: SessionState = {
    status: "completed",
    pid: null,
    startedAt: null,
    finishedAt: null,
    exitCode: 0,
    signal: null,
    error: "",
    logs: "",
    promptPreview: "",
    response: "cached",
    resumeSignals: [],
    sessionKey: "cached-session",
    campaignId: null
  };

  __setSessionRunnerDeps({
    getCachedSessionState: async (sessionKey) => (sessionKey === "cached-session" ? cached : null)
  });

  const state = await getSessionStateCached("cached-session");
  assert.equal(state.status, "completed");
  assert.equal(state.response, "cached");
});
