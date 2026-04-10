export default function SupportSection({ standalone = false }) {
  return (
    <article className={`marketing-panel marketing-panel-wide ${standalone ? "standalone-section" : ""}`} id="support">
      <div className="section-head">
        <div>
          <p className="panel-kicker">Support</p>
          <h2>Get setup help without breaking your workflow.</h2>
        </div>
      </div>
      <div className="support-grid">
        <div className="support-card">
          <h3>Fast setup help</h3>
          <p>Need help wiring SMTP, prompts, or OpenClaw routing? We can turn confusing setup into a clean launch path.</p>
        </div>
        <div className="support-card">
          <h3>Prompt strategy</h3>
          <p>Use advanced prompt guidance to shape company fit, location bias, culture filters, and outreach tone.</p>
        </div>
        <div className="support-card">
          <h3>Operator support</h3>
          <p>Keep the frontend now, add backend billing and plan enforcement later without redesigning the whole surface.</p>
        </div>
      </div>
    </article>
  );
}

