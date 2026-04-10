export default function AboutSection({ standalone = false }) {
  return (
    <article className={`marketing-panel marketing-panel-wide ${standalone ? "standalone-section" : ""}`} id="about">
      <div className="marketing-copy">
        <p className="panel-kicker">About</p>
        <h2>Job search orchestration with a human-quality control layer.</h2>
        <p>
          ScoutClaw turns OpenClaw into a focused outreach workspace. It helps candidates search smarter, rank better-fit companies, shape recruiter messaging, and carry context from resume to outreach without a dozen tabs open.
        </p>
      </div>
      <div className="about-stats">
        <div className="about-stat">
          <span className="about-stat-value">Resume-first</span>
          <span className="about-stat-label">Search signals, company filters, and outreach context come from your actual profile.</span>
        </div>
        <div className="about-stat">
          <span className="about-stat-value">AI-guided</span>
          <span className="about-stat-label">Advanced prompt rules can steer location, culture, company quality, and lead selection.</span>
        </div>
        <div className="about-stat">
          <span className="about-stat-value">Operator-safe</span>
          <span className="about-stat-label">You stay in control of sends, targeting, and the final outreach workflow.</span>
        </div>
      </div>
    </article>
  );
}

