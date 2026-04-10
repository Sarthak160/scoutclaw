import fs from "node:fs/promises";
import path from "node:path";

const OUTPUT_ROOT = path.join(process.cwd(), "output");
const SETTINGS_PATH = path.join(OUTPUT_ROOT, "scoutclaw-settings.json");
const UPLOAD_DIR = path.join(OUTPUT_ROOT, "uploads");

export async function getSettings() {
  await ensureOutputLayout();

  try {
    const raw = await fs.readFile(SETTINGS_PATH, "utf8");
    return mergeSettings(JSON.parse(raw));
  } catch {
    const defaults = defaultSettings();
    await saveSettings(defaults);
    return defaults;
  }
}

export async function saveSettings(nextSettings) {
  await ensureOutputLayout();
  const merged = mergeSettings(nextSettings);
  await fs.writeFile(SETTINGS_PATH, JSON.stringify(merged, null, 2), "utf8");
  return merged;
}

export function defaultSettings() {
  return {
    resumePath: "",
    jobsFile: "",
    workspace: process.cwd(),
    openClawCmd: process.env.OPEN_CLAW_CMD || "openclaw",
    openClawArgs: ["--model", "openai-codex/gpt-5.4"],
    session: "scoutclaw-web",
    profile: "",
    extraPrompt: "",
    applicant: {
      name: process.env.APPLICANT_NAME || "",
      email: process.env.APPLICANT_EMAIL || "",
      phone: process.env.APPLICANT_PHONE || "",
      linkedin: process.env.APPLICANT_LINKEDIN || "",
      portfolio: process.env.APPLICANT_PORTFOLIO || "",
      mailFrom: process.env.MAIL_FROM || "",
      smtpHost: process.env.SMTP_HOST || "",
      smtpPort: process.env.SMTP_PORT || "587",
      smtpUser: process.env.SMTP_USER || "",
      smtpPass: process.env.SMTP_PASS || ""
    },
    filters: []
  };
}

export function getUploadDirectory() {
  return UPLOAD_DIR;
}

async function ensureOutputLayout() {
  await fs.mkdir(OUTPUT_ROOT, { recursive: true });
  await fs.mkdir(UPLOAD_DIR, { recursive: true });
}

function mergeSettings(input) {
  const defaults = defaultSettings();
  return {
    ...defaults,
    ...input,
    openClawArgs: normalizeArray(input?.openClawArgs, defaults.openClawArgs),
    filters: normalizeArray(input?.filters, defaults.filters),
    applicant: {
      ...defaults.applicant,
      ...(input?.applicant || {})
    }
  };
}

function normalizeArray(value, fallback) {
  return Array.isArray(value) ? value.filter(Boolean) : fallback;
}
