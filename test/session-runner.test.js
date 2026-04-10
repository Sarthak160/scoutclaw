import test from "node:test";
import assert from "node:assert/strict";
import { EventEmitter } from "node:events";

import {
  __resetSessionRunnerState,
  __setSessionRunnerDeps,
  __testablesExtractJsonResponse,
  getSessionState,
  startSessionRun,
  stopSessionRun
} from "../src/services/session-runner.js";

function createFakeChild() {
  const child = new EventEmitter();
  child.stdout = new EventEmitter();
  child.stderr = new EventEmitter();
  child.pid = 4321;
  child.killedWith = null;
  child.kill = (signal) => {
    child.killedWith = signal;
  };
  return child;
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
    getSettings: async () => ({
      resumePath: "",
      jobsFile: "",
      workspace: "/tmp",
      openClawCmd: "openclaw",
      session: "scoutclaw-web",
      profile: "",
      extraPrompt: "",
      filters: ["remote"],
      applicant: {}
    }),
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
    getSettings: async () => ({
      resumePath: "",
      jobsFile: "",
      workspace: "/tmp",
      openClawCmd: "openclaw",
      session: "scoutclaw-web",
      profile: "",
      extraPrompt: "",
      filters: [],
      applicant: {}
    }),
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
