import test from "node:test";
import assert from "node:assert/strict";

import { createGraphQLResponse, pickDefined, type GraphQLDeps } from "../app/api/graphql/route.js";
import type { SessionState, Settings } from "../src/types.js";

function createDeps(): GraphQLDeps {
  let settings: Settings = {
    mode: "get_hired",
    resumePath: "",
    jobsFile: "",
    jobOpeningUrl: "",
    workspace: "/tmp",
    openClawCmd: "openclaw",
    openClawArgs: [],
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
    }
  };

  const baseRun: SessionState = {
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
  };

  return {
    getSessionState: async () => ({ ...baseRun }),
    startSessionRun: async () => ({ ...baseRun, status: "running" }),
    stopSessionRun: () => ({ ...baseRun, status: "stopped" }),
    getSettings: async () => settings,
    saveSettings: async (next) => {
      settings = {
        ...settings,
        ...next,
        applicant: { ...settings.applicant, ...(next.applicant ?? {}) }
      };
      return settings;
    },
    extractResumeInsights: async () => ({ excerpt: "Resume text", searchSignals: ["golang"] }),
    extractJobUrlInsights: async () => ({ excerpt: "Job URL text", searchSignals: ["kubernetes"] })
  };
}

test("pickDefined removes only undefined values", () => {
  assert.deepEqual(pickDefined({ a: 1, b: undefined, c: "" }), { a: 1, c: "" });
});

test("graphql addFilter mutation updates dashboard state", async () => {
  const response = await createGraphQLResponse(
    {
      query: `
        mutation AddFilter($value: String!) {
          addFilter(value: $value) {
            settings { filters }
            resumeInsights { searchSignals }
          }
        }
      `,
      variables: { value: "remote" }
    },
    createDeps()
  );

  const payload = await response.json();
  assert.equal(response.status, 200);
  assert.deepEqual(payload.data.addFilter.settings.filters, ["remote"]);
  assert.deepEqual(payload.data.addFilter.resumeInsights.searchSignals, ["golang"]);
});

test("graphql updateSettings mutation merges applicant fields", async () => {
  const response = await createGraphQLResponse(
    {
      query: `
        mutation UpdateSettings($input: SettingsInput!) {
          updateSettings(input: $input) {
            settings { applicant { email } extraPrompt }
          }
        }
      `,
      variables: { input: { extraPrompt: "Prefer Bangalore", applicant: { email: "test@example.com" } } }
    },
    createDeps()
  );

  const payload = await response.json();
  assert.equal(payload.data.updateSettings.settings.extraPrompt, "Prefer Bangalore");
  assert.equal(payload.data.updateSettings.settings.applicant.email, "test@example.com");
});

test("graphql uses job URL metadata in hiring mode", async () => {
  const response = await createGraphQLResponse(
    {
      query: `
        mutation UpdateSettings($input: SettingsInput!) {
          updateSettings(input: $input) {
            resumeInsights { excerpt searchSignals }
          }
        }
      `,
      variables: { input: { mode: "hire", jobOpeningUrl: "https://example.com/jobs/backend" } }
    },
    createDeps()
  );

  const payload = await response.json();
  assert.equal(response.status, 200);
  assert.equal(payload.data.updateSettings.resumeInsights.excerpt, "Job URL text");
  assert.deepEqual(payload.data.updateSettings.resumeInsights.searchSignals, ["kubernetes"]);
});
