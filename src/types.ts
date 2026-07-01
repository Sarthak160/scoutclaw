export type WorkflowMode = "get_hired" | "hire" | "";

export interface ApplicantSettings {
  name: string;
  email: string;
  phone: string;
  linkedin: string;
  portfolio: string;
  mailFrom: string;
  smtpHost: string;
  smtpPort: string;
  smtpUser: string;
  smtpPass: string;
}

export interface Settings {
  mode: WorkflowMode;
  resumePath: string;
  jobsFile: string;
  jobOpeningUrl: string;
  workspace: string;
  openClawCmd: string;
  openClawArgs: string[];
  session: string;
  profile: string;
  extraPrompt: string;
  applicant: ApplicantSettings;
  filters: string[];
}

/** Partial settings payload accepted by the settings store and mutations. */
export type SettingsUpdate = Partial<Omit<Settings, "applicant">> & {
  applicant?: Partial<ApplicantSettings>;
};

/** Signals and excerpt derived from a resume, role brief, or job posting. */
export interface Insights {
  excerpt: string;
  searchSignals: string[];
}

export type RunStatus = "idle" | "running" | "completed" | "failed" | "stopped";

export interface SessionState {
  status: RunStatus;
  pid: number | null;
  startedAt: string | null;
  finishedAt: string | null;
  exitCode: number | null;
  signal: NodeJS.Signals | null;
  error: string;
  logs: string;
  promptPreview: string;
  response: string;
  resumeSignals: string[];
  sessionKey: string | null;
  campaignId: string | null;
}
