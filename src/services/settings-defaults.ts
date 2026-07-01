import type { Settings, SettingsUpdate } from "../types.js";

export function defaultSettings(): Settings {
  return {
    mode: "",
    resumePath: "",
    jobsFile: "",
    jobOpeningUrl: "",
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

export function mergeSettings(input?: SettingsUpdate | null): Settings {
  const defaults = defaultSettings();
  const source = input ?? {};
  return {
    ...defaults,
    ...source,
    openClawArgs: normalizeArray(source.openClawArgs, defaults.openClawArgs),
    filters: normalizeArray(source.filters, defaults.filters),
    applicant: {
      ...defaults.applicant,
      ...(source.applicant ?? {})
    }
  };
}

export function normalizeArray<T>(value: unknown, fallback: T[]): T[] {
  return Array.isArray(value) ? (value.filter(Boolean) as T[]) : fallback;
}
