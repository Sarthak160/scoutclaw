import fs from "node:fs/promises";
import path from "node:path";

export async function getSettings() {
  await ensureOutputLayout();
  const { settingsPath } = getStorePaths();

  try {
    const raw = await fs.readFile(settingsPath, "utf8");
    return mergeSettings(JSON.parse(raw));
  } catch {
    const defaults = defaultSettings();
    await saveSettings(defaults);
    return defaults;
  }
}

export async function saveSettings(nextSettings) {
  await ensureOutputLayout();
  const { settingsPath } = getStorePaths();
  const merged = mergeSettings(nextSettings);
  await fs.writeFile(settingsPath, JSON.stringify(merged, null, 2), "utf8");
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
  return getStorePaths().uploadDir;
}

async function ensureOutputLayout() {
  const { outputRoot, uploadDir } = getStorePaths();
  await fs.mkdir(outputRoot, { recursive: true });
  await fs.mkdir(uploadDir, { recursive: true });
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

function getStorePaths() {
  const outputRoot = process.env.SCOUTCLAW_OUTPUT_DIR
    ? path.resolve(process.env.SCOUTCLAW_OUTPUT_DIR)
    : path.join(process.cwd(), "output");

  return {
    outputRoot,
    settingsPath: path.join(outputRoot, "scoutclaw-settings.json"),
    uploadDir: path.join(outputRoot, "uploads")
  };
}
