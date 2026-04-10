import test from "node:test";
import assert from "node:assert/strict";

import { buildPrompt } from "../src/prompt.js";

test("buildPrompt includes filters and advanced prompt guidance", () => {
  const prompt = buildPrompt({
    resumePath: "/tmp/resume.pdf",
    jobsFile: "",
    resumeInsights: { excerpt: "Backend engineer", searchSignals: ["golang", "backend"] },
    applicant: {
      name: "Sarthak",
      email: "test@example.com",
      phone: "",
      linkedin: "",
      portfolio: "",
      mailFrom: "",
      smtpHost: "",
      smtpPort: "",
      smtpUser: "",
      smtpPass: ""
    },
    customFilters: ["remote", "bangalore"],
    extraPrompt: "Prefer good engineering culture"
  });

  assert.match(prompt, /Custom filters: remote, bangalore/);
  assert.match(prompt, /Advanced prompt guidance:/);
  assert.match(prompt, /Prefer good engineering culture/);
  assert.match(prompt, /ranking and exclusion layer/);
});
