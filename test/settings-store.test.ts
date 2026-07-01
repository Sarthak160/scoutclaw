import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { defaultSettings, getSettings, getUploadDirectory, saveSettings } from "../src/services/settings-store.js";

test("defaultSettings reads environment defaults", async () => {
  const original = {
    OPEN_CLAW_CMD: process.env.OPEN_CLAW_CMD,
    APPLICANT_EMAIL: process.env.APPLICANT_EMAIL,
    SMTP_PORT: process.env.SMTP_PORT
  };

  process.env.OPEN_CLAW_CMD = "openclaw-custom";
  process.env.APPLICANT_EMAIL = "test@example.com";
  process.env.SMTP_PORT = "2525";

  const settings = defaultSettings();
  assert.equal(settings.openClawCmd, "openclaw-custom");
  assert.equal(settings.applicant.email, "test@example.com");
  assert.equal(settings.applicant.smtpPort, "2525");

  Object.assign(process.env, original);
});

test("saveSettings and getSettings persist merged settings inside configured output dir", async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "scoutclaw-settings-"));
  process.env.SCOUTCLAW_OUTPUT_DIR = tempDir;

  const saved = await saveSettings({
    filters: ["remote", "", "golang"],
    applicant: { name: "Sarthak" }
  });

  assert.deepEqual(saved.filters, ["remote", "golang"]);
  assert.equal(saved.applicant.name, "Sarthak");

  const loaded = await getSettings();
  assert.deepEqual(loaded.filters, ["remote", "golang"]);
  assert.equal(loaded.applicant.name, "Sarthak");
  assert.equal(getUploadDirectory(), path.join(tempDir, "uploads"));

  delete process.env.SCOUTCLAW_OUTPUT_DIR;
});
