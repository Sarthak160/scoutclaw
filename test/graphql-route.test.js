import test from "node:test";
import assert from "node:assert/strict";

import { createGraphQLResponse, pickDefined } from "../app/api/graphql/route.js";

function createDeps() {
  let settings = {
    resumePath: "",
    jobsFile: "",
    workspace: "/tmp",
    openClawCmd: "openclaw",
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

  return {
    getSessionState: () => ({ status: "idle", error: "", logs: "", promptPreview: "", response: "", resumeSignals: [] }),
    startSessionRun: async () => ({ status: "running", error: "", logs: "", promptPreview: "", response: "", resumeSignals: [] }),
    stopSessionRun: async () => ({ status: "stopped", error: "", logs: "", promptPreview: "", response: "", resumeSignals: [] }),
    getSettings: async () => settings,
    saveSettings: async (next) => {
      settings = next;
      return next;
    },
    extractResumeInsights: async () => ({ excerpt: "Resume text", searchSignals: ["golang"] })
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
