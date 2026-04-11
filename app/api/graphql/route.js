import { graphql, buildSchema } from "graphql";
import { getSessionStateCached, startSessionRun, stopSessionRun } from "../../../src/services/session-runner.js";
import { getSettings, saveSettings } from "../../../src/services/settings-store.js";
import { extractResumeInsights } from "../../../src/services/resume.js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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
    resumePath: String!
    jobsFile: String!
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
    resumePath: String
    jobsFile: String
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

const defaultDeps = {
  getSessionState: getSessionStateCached,
  startSessionRun,
  stopSessionRun,
  getSettings,
  saveSettings,
  extractResumeInsights
};

const rootValue = createRootValue(defaultDeps);

export async function POST(request) {
  const body = await request.json();
  return createGraphQLResponse(body);
}

export async function createGraphQLResponse(body, deps = defaultDeps) {
  const activeRoot = createRootValue(deps);
  const result = await graphql({
    schema,
    source: body.query,
    rootValue: activeRoot,
    variableValues: body.variables
  });

  return Response.json(result, {
    status: result.errors ? 400 : 200
  });
}

export function createRootValue(deps) {
  return {
  dashboardState: () => getDashboardState(deps),
  updateSettings: async ({ input }) => {
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
  addFilter: async ({ value }) => {
    const current = await deps.getSettings();
    const nextValue = value.trim();
    if (!nextValue) {
      return getDashboardState(deps);
    }

    const filters = Array.from(new Set([...current.filters, nextValue]));
    await deps.saveSettings({ ...current, filters });
    return getDashboardState(deps);
  },
  removeFilter: async ({ value }) => {
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

async function getDashboardState(deps) {
  const settings = await deps.getSettings();
  const resumeInsights = await deps.extractResumeInsights(settings.resumePath);
  return {
    settings,
    run: await deps.getSessionState(settings.session),
    resumeInsights
  };
}

export function pickDefined(value) {
  return Object.fromEntries(Object.entries(value).filter(([, entry]) => entry !== undefined));
}
