import test from "node:test";
import assert from "node:assert/strict";

import { buildPrompt } from "../src/prompt.js";

test("buildPrompt includes filters and advanced prompt guidance", () => {
  const prompt = buildPrompt({
    mode: "get_hired",
    resumePath: "/tmp/resume.pdf",
    jobsFile: "",
    jobOpeningUrl: "",
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

test("buildPrompt switches to hiring workflow", () => {
  const prompt = buildPrompt({
    mode: "hire",
    resumePath: "/tmp/role.pdf",
    jobsFile: "",
    jobOpeningUrl: "https://example.com/jobs/backend-intern",
    resumeInsights: { excerpt: "Backend intern role", searchSignals: ["backend"] },
    applicant: {
      name: "Hiring Manager",
      email: "",
      phone: "",
      linkedin: "",
      portfolio: "",
      mailFrom: "",
      smtpHost: "",
      smtpPort: "",
      smtpUser: "",
      smtpPass: ""
    },
    customFilters: ["students"],
    extraPrompt: "Send assessment link only after fit is clear"
  });

  assert.match(prompt, /Workflow mode: want to hire/);
  assert.match(prompt, /Job opening URL: https:\/\/example.com\/jobs\/backend-intern/);
  assert.match(prompt, /open it first, extract the role requirements/);
  assert.match(prompt, /ideal students or candidates/);
  assert.match(prompt, /assessment\/test links/);
});
