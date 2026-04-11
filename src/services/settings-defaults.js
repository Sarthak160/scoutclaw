export function defaultSettings() {
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

export function mergeSettings(input) {
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

export function normalizeArray(value, fallback) {
  return Array.isArray(value) ? value.filter(Boolean) : fallback;
}
