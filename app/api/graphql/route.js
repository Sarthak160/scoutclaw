import { graphql, buildSchema } from "graphql";
import { getSessionState, startSessionRun, stopSessionRun } from "../../../src/services/session-runner.js";
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

const rootValue = {
  dashboardState: getDashboardState,
  updateSettings: async ({ input }) => {
    const current = await getSettings();
    await saveSettings({
      ...current,
      ...pickDefined(input),
      applicant: {
        ...current.applicant,
        ...pickDefined(input.applicant || {})
      }
    });
    return getDashboardState();
  },
  addFilter: async ({ value }) => {
    const current = await getSettings();
    const nextValue = value.trim();
    if (!nextValue) {
      return getDashboardState();
    }

    const filters = Array.from(new Set([...current.filters, nextValue]));
    await saveSettings({ ...current, filters });
    return getDashboardState();
  },
  removeFilter: async ({ value }) => {
    const current = await getSettings();
    await saveSettings({
      ...current,
      filters: current.filters.filter((entry) => entry !== value)
    });
    return getDashboardState();
  },
  startRun: async () => startSessionRun(),
  stopRun: async () => stopSessionRun()
};

export async function POST(request) {
  const body = await request.json();
  const result = await graphql({
    schema,
    source: body.query,
    rootValue,
    variableValues: body.variables
  });

  return Response.json(result, {
    status: result.errors ? 400 : 200
  });
}

async function getDashboardState() {
  const settings = await getSettings();
  const resumeInsights = await extractResumeInsights(settings.resumePath);
  return {
    settings,
    run: getSessionState(),
    resumeInsights
  };
}

function pickDefined(value) {
  return Object.fromEntries(Object.entries(value).filter(([, entry]) => entry !== undefined));
}
