"use client";

import { startTransition, useEffect, useRef, useState } from "react";
import MarketingHero from "./marketing-hero.js";
import SiteNav from "./site-nav.js";

const DASHBOARD_QUERY = `
  query DashboardState {
    dashboardState {
      settings {
        resumePath
        jobsFile
        workspace
        openClawCmd
        session
        profile
        extraPrompt
        filters
        applicant {
          name
          email
          phone
          linkedin
          portfolio
          mailFrom
          smtpHost
          smtpPort
          smtpUser
          smtpPass
        }
      }
      run {
        status
        pid
        startedAt
        finishedAt
        exitCode
        signal
        error
        logs
        promptPreview
        response
        resumeSignals
      }
      resumeInsights {
        excerpt
        searchSignals
      }
    }
  }
`;

const UPDATE_SETTINGS_MUTATION = `
  mutation UpdateSettings($input: SettingsInput!) {
    updateSettings(input: $input) {
      settings {
        resumePath
        jobsFile
        workspace
        openClawCmd
        session
        profile
        extraPrompt
        filters
        applicant {
          name
          email
          phone
          linkedin
          portfolio
          mailFrom
          smtpHost
          smtpPort
          smtpUser
          smtpPass
        }
      }
      run {
        status
        pid
        startedAt
        finishedAt
        exitCode
        signal
        error
        logs
        promptPreview
        response
        resumeSignals
      }
      resumeInsights {
        excerpt
        searchSignals
      }
    }
  }
`;

const ADD_FILTER_MUTATION = `
  mutation AddFilter($value: String!) {
    addFilter(value: $value) {
      settings {
        resumePath
        jobsFile
        workspace
        openClawCmd
        session
        profile
        extraPrompt
        filters
        applicant {
          name
          email
          phone
          linkedin
          portfolio
          mailFrom
          smtpHost
          smtpPort
          smtpUser
          smtpPass
        }
      }
      run {
        status
        pid
        startedAt
        finishedAt
        exitCode
        signal
        error
        logs
        promptPreview
        response
        resumeSignals
      }
      resumeInsights {
        excerpt
        searchSignals
      }
    }
  }
`;

const REMOVE_FILTER_MUTATION = `
  mutation RemoveFilter($value: String!) {
    removeFilter(value: $value) {
      settings {
        resumePath
        jobsFile
        workspace
        openClawCmd
        session
        profile
        extraPrompt
        filters
        applicant {
          name
          email
          phone
          linkedin
          portfolio
          mailFrom
          smtpHost
          smtpPort
          smtpUser
          smtpPass
        }
      }
      run {
        status
        pid
        startedAt
        finishedAt
        exitCode
        signal
        error
        logs
        promptPreview
        response
        resumeSignals
      }
      resumeInsights {
        excerpt
        searchSignals
      }
    }
  }
`;

const START_RUN_MUTATION = `
  mutation StartRun {
    startRun {
      status
      pid
      startedAt
      finishedAt
      exitCode
      signal
      error
      logs
      promptPreview
      response
      resumeSignals
    }
  }
`;

const STOP_RUN_MUTATION = `
  mutation StopRun {
    stopRun {
      status
      pid
      startedAt
      finishedAt
      exitCode
      signal
      error
      logs
      promptPreview
      response
      resumeSignals
    }
  }
`;

const EMPTY_STATE = {
  settings: {
    resumePath: "",
    jobsFile: "",
    workspace: "",
    openClawCmd: "openclaw",
    session: "scoutclaw-web",
    profile: "",
    extraPrompt: "",
    filters: [],
    applicant: {
      name: "",
      email: "",
      phone: "",
      linkedin: "",
      portfolio: "",
      mailFrom: "",
      smtpHost: "",
      smtpPort: "587",
      smtpUser: "",
      smtpPass: ""
    }
  },
  run: {
    status: "idle",
    pid: null,
    startedAt: null,
    finishedAt: null,
    exitCode: null,
    signal: null,
    error: "",
    logs: "",
    promptPreview: "",
    response: "",
    resumeSignals: []
  },
  resumeInsights: {
    excerpt: "",
    searchSignals: []
  }
};

const ADVANCED_PROMPT_EXAMPLES = [
  "Ask with AI: prefer Bangalore or remote-friendly teams",
  "Ask with AI: avoid toxic companies and prioritize strong review signals",
  "Ask with AI: focus on Golang backend roles with good engineering culture",
  "Ask with AI: prefer startups with high ownership and clear recruiter contact"
];
export default function Dashboard() {
  const [dashboard, setDashboard] = useState(EMPTY_STATE);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [runPending, setRunPending] = useState(false);
  const [filterDraft, setFilterDraft] = useState("");
  const [resumeFile, setResumeFile] = useState(null);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const refreshRef = useRef(async () => {});
  const [advancedPromptIndex, setAdvancedPromptIndex] = useState(0);

  async function refreshDashboard() {
    try {
      const result = await graphQL(DASHBOARD_QUERY);
      setDashboard(result.dashboardState);
      setError("");
    } catch (nextError) {
      setError(nextError.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refreshRef.current = refreshDashboard;
  });

  useEffect(() => {
    void refreshRef.current();
  }, []);

  useEffect(() => {
    if (dashboard.run.status !== "running") {
      return;
    }

    const interval = window.setInterval(() => {
      void refreshRef.current();
    }, 4000);

    return () => window.clearInterval(interval);
  }, [dashboard.run.status]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setAdvancedPromptIndex((current) => (current + 1) % ADVANCED_PROMPT_EXAMPLES.length);
    }, 2600);

    return () => window.clearInterval(interval);
  }, []);

  async function saveSettings() {
    setSaving(true);
    setNotice("");
    setError("");

    try {
      const result = await graphQL(UPDATE_SETTINGS_MUTATION, {
        input: {
          resumePath: dashboard.settings.resumePath,
          jobsFile: dashboard.settings.jobsFile,
          workspace: dashboard.settings.workspace,
          openClawCmd: dashboard.settings.openClawCmd,
          session: dashboard.settings.session,
          profile: dashboard.settings.profile,
          extraPrompt: dashboard.settings.extraPrompt,
          applicant: dashboard.settings.applicant
        }
      });
      setDashboard(result.updateSettings);
      setNotice("Settings saved.");
    } catch (nextError) {
      setError(nextError.message);
    } finally {
      setSaving(false);
    }
  }

  async function uploadResume() {
    if (!resumeFile) {
      setError("Choose a resume PDF first.");
      return;
    }

    setUploading(true);
    setNotice("");
    setError("");

    try {
      const formData = new FormData();
      formData.append("resume", resumeFile);
      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Resume upload failed.");
      }

      setNotice("Resume uploaded.");
      setResumeFile(null);
      await refreshDashboard();
    } catch (nextError) {
      setError(nextError.message);
    } finally {
      setUploading(false);
    }
  }

  async function addFilter() {
    const nextValue = filterDraft.trim();
    if (!nextValue) {
      return;
    }

    try {
      const result = await graphQL(ADD_FILTER_MUTATION, { value: nextValue });
      setDashboard(result.addFilter);
      setFilterDraft("");
    } catch (nextError) {
      setError(nextError.message);
    }
  }

  async function removeFilter(value) {
    try {
      const result = await graphQL(REMOVE_FILTER_MUTATION, { value });
      setDashboard(result.removeFilter);
    } catch (nextError) {
      setError(nextError.message);
    }
  }

  async function startRun() {
    setRunPending(true);
    setNotice("");
    setError("");

    try {
      await graphQL(START_RUN_MUTATION);
      setNotice("ScoutClaw run started.");
      await refreshDashboard();
    } catch (nextError) {
      setError(nextError.message);
    } finally {
      setRunPending(false);
    }
  }

  async function stopRun() {
    setRunPending(true);
    setNotice("");
    setError("");

    try {
      await graphQL(STOP_RUN_MUTATION);
      setNotice("ScoutClaw run stopped.");
      await refreshDashboard();
    } catch (nextError) {
      setError(nextError.message);
    } finally {
      setRunPending(false);
    }
  }

  if (loading) {
    return <main className="shell loading-shell">Loading ScoutClaw…</main>;
  }

  return (
    <main className="shell">
      <SiteNav />
      <MarketingHero status={dashboard.run.status} session={dashboard.settings.session || "scoutclaw-web"} pid={dashboard.run.pid} />

      {(notice || error) && (
        <section className={`banner ${error ? "banner-error" : "banner-success"}`}>
          {error || notice}
        </section>
      )}

      <section className="grid">
        <article className="panel panel-large">
          <div className="panel-header">
            <div>
              <p className="panel-kicker">Resume</p>
              <h2>Upload and derive search signals</h2>
            </div>
            <button className="ghost-button" onClick={() => refreshDashboard()}>
              Refresh
            </button>
          </div>

          <div className="upload-row">
            <label className="file-picker">
              <span>{resumeFile ? resumeFile.name : "Choose resume PDF"}</span>
              <input
                type="file"
                accept="application/pdf"
                onChange={(event) => setResumeFile(event.target.files?.[0] || null)}
              />
            </label>
            <button className="primary-button" onClick={uploadResume} disabled={uploading}>
              {uploading ? "Uploading…" : "Upload resume"}
            </button>
          </div>

          <div className="resume-meta">
            <div>
              <span className="meta-label">Stored path</span>
              <code>{dashboard.settings.resumePath || "No resume uploaded yet."}</code>
            </div>
            <div>
              <span className="meta-label">Detected signals</span>
              <div className="chip-row">
                {dashboard.resumeInsights.searchSignals.length > 0 ? (
                  dashboard.resumeInsights.searchSignals.map((signal) => <span className="chip" key={signal}>{signal}</span>)
                ) : (
                  <span className="chip muted-chip">Upload a resume to see search signals</span>
                )}
              </div>
            </div>
          </div>

          <div className="excerpt-card">
            <span className="meta-label">Resume excerpt</span>
            <p>{dashboard.resumeInsights.excerpt || "No resume text available yet."}</p>
          </div>
        </article>

        <article className="panel">
          <div className="panel-header">
            <div>
              <p className="panel-kicker">Run Control</p>
              <h2>Start and stop</h2>
            </div>
          </div>

          <div className="button-row">
            <button
              className="primary-button"
              onClick={() => startTransition(() => {
                void startRun();
              })}
              disabled={runPending || dashboard.run.status === "running"}
            >
              {dashboard.run.status === "running" ? "Running…" : "Start run"}
            </button>
            <button
              className="danger-button"
              onClick={() => startTransition(() => {
                void stopRun();
              })}
              disabled={runPending || dashboard.run.status !== "running"}
            >
              Stop run
            </button>
          </div>

          <dl className="metric-list">
            <Metric label="Status" value={dashboard.run.status} />
            <Metric label="Started" value={formatDate(dashboard.run.startedAt)} />
            <Metric label="Finished" value={formatDate(dashboard.run.finishedAt)} />
            <Metric label="Exit" value={dashboard.run.exitCode ?? "—"} />
          </dl>
        </article>

        <article className="panel panel-large">
          <div className="panel-header">
            <div>
              <p className="panel-kicker">Applicant Profile</p>
              <h2>Identity and delivery details</h2>
            </div>
            <button className="primary-button" onClick={saveSettings} disabled={saving}>
              {saving ? "Saving…" : "Save details"}
            </button>
          </div>

          <div className="form-grid">
            <Field label="Name" value={dashboard.settings.applicant.name} onChange={(value) => updateApplicant(setDashboard, "name", value)} />
            <Field label="Email" value={dashboard.settings.applicant.email} onChange={(value) => updateApplicant(setDashboard, "email", value)} />
            <Field label="Phone" value={dashboard.settings.applicant.phone} onChange={(value) => updateApplicant(setDashboard, "phone", value)} />
            <Field label="LinkedIn" value={dashboard.settings.applicant.linkedin} onChange={(value) => updateApplicant(setDashboard, "linkedin", value)} />
            <Field label="Portfolio / GitHub" value={dashboard.settings.applicant.portfolio} onChange={(value) => updateApplicant(setDashboard, "portfolio", value)} />
            <Field label="From address" value={dashboard.settings.applicant.mailFrom} onChange={(value) => updateApplicant(setDashboard, "mailFrom", value)} />
            <Field label="SMTP host" value={dashboard.settings.applicant.smtpHost} onChange={(value) => updateApplicant(setDashboard, "smtpHost", value)} />
            <Field label="SMTP port" value={dashboard.settings.applicant.smtpPort} onChange={(value) => updateApplicant(setDashboard, "smtpPort", value)} />
            <Field label="SMTP username" value={dashboard.settings.applicant.smtpUser} onChange={(value) => updateApplicant(setDashboard, "smtpUser", value)} />
            <Field label="SMTP password / app password" type="password" value={dashboard.settings.applicant.smtpPass} onChange={(value) => updateApplicant(setDashboard, "smtpPass", value)} />
            <Field label="Workspace" value={dashboard.settings.workspace} onChange={(value) => updateSettingsField(setDashboard, "workspace", value)} />
            <Field label="OpenClaw command" value={dashboard.settings.openClawCmd} onChange={(value) => updateSettingsField(setDashboard, "openClawCmd", value)} />
            <Field label="Session key" value={dashboard.settings.session} onChange={(value) => updateSettingsField(setDashboard, "session", value)} />
            <Field label="Profile" value={dashboard.settings.profile} onChange={(value) => updateSettingsField(setDashboard, "profile", value)} />
            <Field label="Jobs file" value={dashboard.settings.jobsFile} onChange={(value) => updateSettingsField(setDashboard, "jobsFile", value)} />
          </div>

        </article>

        <article className="panel">
          <div className="panel-header">
            <div>
              <p className="panel-kicker">Targeting</p>
              <h2>Custom filters</h2>
            </div>
          </div>

          <div className="filter-entry">
            <input
              className="text-input"
              value={filterDraft}
              onChange={(event) => setFilterDraft(event.target.value)}
              placeholder="remote, golang, san francisco, recruiter outreach"
            />
            <button className="primary-button" onClick={addFilter}>
              Add
            </button>
          </div>

          <div className="chip-row">
            {dashboard.settings.filters.length > 0 ? (
              dashboard.settings.filters.map((filter) => (
                <button className="chip chip-button" key={filter} onClick={() => removeFilter(filter)}>
                  <span>{filter}</span>
                  <span className="chip-remove" aria-hidden="true">×</span>
                </button>
              ))
            ) : (
              <span className="chip muted-chip">No custom filters yet</span>
            )}
          </div>

          <div className="advanced-prompt-card">
            <div className="advanced-prompt-head">
              <div>
                <p className="panel-kicker">AI Guidance</p>
                <h3>Advanced Prompt</h3>
              </div>
              <span className="advanced-prompt-badge">AI tuned</span>
            </div>

            <p className="advanced-prompt-copy">
              Add soft preferences, exclusion rules, company quality signals, location bias, or culture filters. ScoutClaw will pass this guidance into OpenClaw so it can search and rank leads accordingly.
            </p>

            <label className="advanced-prompt-input-wrap">
              <span className="sr-only">Advanced prompt</span>
              <textarea
                className="advanced-prompt-input"
                rows="5"
                value={dashboard.settings.extraPrompt}
                onChange={(event) => updateSettingsField(setDashboard, "extraPrompt", event.target.value)}
              />
              {!dashboard.settings.extraPrompt && (
                <div className="advanced-prompt-placeholder" aria-hidden="true">
                  <span className="advanced-prompt-stars">✦ ✧</span>
                  <span key={advancedPromptIndex} className="advanced-prompt-placeholder-text">
                    {ADVANCED_PROMPT_EXAMPLES[advancedPromptIndex]}
                  </span>
                </div>
              )}
            </label>

            <p className="advanced-prompt-footnote">
              Example: “Prefer Bangalore companies with strong engineering reviews, low toxicity signals, and backend-heavy teams.”
            </p>
          </div>
        </article>

        <article className="panel panel-wide">
          <div className="panel-header">
            <div>
              <p className="panel-kicker">Live Session</p>
              <h2>Runner logs and prompt preview</h2>
            </div>
          </div>

          <div className="console-grid">
            <div className="console-card">
              <span className="meta-label">Latest response</span>
              <pre>{dashboard.run.response || "No response yet."}</pre>
            </div>
            <div className="console-card">
              <span className="meta-label">Prompt preview</span>
              <pre>{dashboard.run.promptPreview || "Start a run to inspect the generated prompt."}</pre>
            </div>
            <div className="console-card console-card-wide">
              <span className="meta-label">Process logs</span>
              <pre>{dashboard.run.logs || "No logs yet."}</pre>
            </div>
          </div>
        </article>
      </section>
    </main>
  );
}

function Field({ label, value, onChange, type = "text" }) {
  return (
    <label className="field">
      <span>{label}</span>
      <input className="text-input" type={type} value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function Metric({ label, value }) {
  return (
    <div className="metric">
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

function updateApplicant(setDashboard, field, value) {
  setDashboard((current) => ({
    ...current,
    settings: {
      ...current.settings,
      applicant: {
        ...current.settings.applicant,
        [field]: value
      }
    }
  }));
}

function updateSettingsField(setDashboard, field, value) {
  setDashboard((current) => ({
    ...current,
    settings: {
      ...current.settings,
      [field]: value
    }
  }));
}

function formatDate(value) {
  if (!value) {
    return "—";
  }

  return new Date(value).toLocaleString();
}

async function graphQL(query, variables) {
  const response = await fetch("/api/graphql", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ query, variables })
  });

  const payload = await response.json();
  if (!response.ok || payload.errors?.length) {
    throw new Error(payload.errors?.[0]?.message || "GraphQL request failed.");
  }

  return payload.data;
}
