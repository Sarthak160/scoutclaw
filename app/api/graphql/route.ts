import { graphql, buildSchema } from "graphql";
import { getSessionStateCached, startSessionRun, stopSessionRun } from "../../../src/services/session-runner.js";
import { getSettings, saveSettings } from "../../../src/services/settings-store.js";
import { extractResumeInsights } from "../../../src/services/resume.js";
import { extractJobUrlInsights } from "../../../src/services/job-url-insights.js";
import type { Insights, SessionState, Settings, SettingsUpdate, WorkflowMode } from "../../../src/types.js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export interface GraphQLDeps {
  getSessionState: (sessionKey: string | null) => Promise<SessionState>;
  startSessionRun: () => Promise<SessionState>;
  stopSessionRun: () => SessionState;
  getSettings: () => Promise<Settings>;
  saveSettings: (next: SettingsUpdate) => Promise<Settings>;
  extractResumeInsights: (resumePath: string) => Promise<Insights>;
  extractJobUrlInsights: (jobOpeningUrl: string) => Promise<Insights>;
}

interface ApplicantSettingsInput {
  name?: string;
  email?: string;
  phone?: string;
  linkedin?: string;
  portfolio?: string;
  mailFrom?: string;
  smtpHost?: string;
  smtpPort?: string;
  smtpUser?: string;
  smtpPass?: string;
}

interface SettingsInput {
  mode?: WorkflowMode;
  resumePath?: string;
  jobsFile?: string;
  jobOpeningUrl?: string;
  workspace?: string;
  openClawCmd?: string;
  session?: string;
  profile?: string;
  extraPrompt?: string;
  applicant?: ApplicantSettingsInput;
}

interface GraphQLRequestBody {
  query: string;
  variables?: Record<string, unknown> | null;
}

interface DashboardState {
  settings: Settings;
  run: SessionState;
  resumeInsights: Insights;
}

const schema = buildSchema(`
  type ApplicantSettings {
    name: String!
    email: String!
    phone: String!
    linkedin: String!
    portfolio: String!
    mailFrom: String!
    smtpHost: String!
    smtpPort: String!
    smtpUser: String!
    smtpPass: String!
  }

  type Settings {
    mode: String!
    resumePath: String!
    jobsFile: String!
    jobOpeningUrl: String!
    workspace: String!
    openClawCmd: String!
    session: String!
    profile: String!
    extraPrompt: String!
    filters: [String!]!
    applicant: ApplicantSettings!
  }

  input ApplicantSettingsInput {
    name: String
    email: String
    phone: String
    linkedin: String
    portfolio: String
    mailFrom: String
    smtpHost: String
    smtpPort: String
    smtpUser: String
    smtpPass: String
  }

  input SettingsInput {
    mode: String
    resumePath: String
    jobsFile: String
    jobOpeningUrl: String
    workspace: String
    openClawCmd: String
    session: String
    profile: String
    extraPrompt: String
    applicant: ApplicantSettingsInput
  }

  type ResumeInsights {
    excerpt: String!
    searchSignals: [String!]!
  }

  type SessionRun {
    status: String!
    pid: Int
    startedAt: String
    finishedAt: String
    exitCode: Int
    signal: String
    error: String!
    logs: String!
    promptPreview: String!
    response: String!
    resumeSignals: [String!]!
    sessionKey: String
    campaignId: String
  }

  type DashboardState {
    settings: Settings!
    run: SessionRun!
    resumeInsights: ResumeInsights!
  }

  type Query {
    dashboardState: DashboardState!
  }

  type Mutation {
    updateSettings(input: SettingsInput!): DashboardState!
    addFilter(value: String!): DashboardState!
    removeFilter(value: String!): DashboardState!
    startRun: SessionRun!
    stopRun: SessionRun!
  }
`);

const defaultDeps: GraphQLDeps = {
  getSessionState: getSessionStateCached,
  startSessionRun,
  stopSessionRun,
  getSettings,
  saveSettings,
  extractResumeInsights,
  extractJobUrlInsights
};

const rootValue = createRootValue(defaultDeps);

export async function POST(request: Request): Promise<Response> {
  const body = (await request.json()) as GraphQLRequestBody;
  return createGraphQLResponse(body);
}

export async function createGraphQLResponse(
  body: GraphQLRequestBody,
  deps: GraphQLDeps = defaultDeps
): Promise<Response> {
  const activeRoot = createRootValue(deps);
  const result = await graphql({
    schema,
    source: body.query,
    rootValue: activeRoot,
    variableValues: body.variables ?? undefined
  });

  return Response.json(result, {
    status: result.errors ? 400 : 200
  });
}

export function createRootValue(deps: GraphQLDeps) {
  return {
    dashboardState: () => getDashboardState(deps),
    updateSettings: async ({ input }: { input: SettingsInput }) => {
      const current = await deps.getSettings();
      await deps.saveSettings({
        ...current,
        ...pickDefined(input),
        applicant: {
          ...current.applicant,
          ...pickDefined(input.applicant || {})
        }
      });
      return getDashboardState(deps);
    },
    addFilter: async ({ value }: { value: string }) => {
      const current = await deps.getSettings();
      const nextValue = value.trim();
      if (!nextValue) {
        return getDashboardState(deps);
      }

      const filters = Array.from(new Set([...current.filters, nextValue]));
      await deps.saveSettings({ ...current, filters });
      return getDashboardState(deps);
    },
    removeFilter: async ({ value }: { value: string }) => {
      const current = await deps.getSettings();
      await deps.saveSettings({
        ...current,
        filters: current.filters.filter((entry) => entry !== value)
      });
      return getDashboardState(deps);
    },
    startRun: async () => deps.startSessionRun(),
    stopRun: async () => deps.stopSessionRun()
  };
}

async function getDashboardState(deps: GraphQLDeps): Promise<DashboardState> {
  const settings = await deps.getSettings();
  const resumeInsights = await getContextInsights(settings, deps);
  return {
    settings,
    run: await deps.getSessionState(settings.session),
    resumeInsights
  };
}

async function getContextInsights(settings: Settings, deps: GraphQLDeps): Promise<Insights> {
  if (settings.mode === "hire" && settings.jobOpeningUrl) {
    return deps.extractJobUrlInsights(settings.jobOpeningUrl);
  }

  return deps.extractResumeInsights(settings.resumePath);
}

export function pickDefined<T extends object>(value: T): Partial<T> {
  return Object.fromEntries(Object.entries(value).filter(([, entry]) => entry !== undefined)) as Partial<T>;
}
