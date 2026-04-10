export default function MarketingHero({ status, session, pid }) {
  const HERO_WORDS = ["Turn", "your", "OpenClaw", "outreach", "workflow", "into", "a", "dashboard."];

  return (
    <section className="hero" id="top">
      <div className="hero-carousel" aria-hidden="true">
        <div className="hero-slide hero-slide-1" />
        <div className="hero-slide hero-slide-2" />
        <div className="hero-slide hero-slide-3" />
        <div className="hero-carousel-wash" />
      </div>
      <div className="hero-copy-block">
        <p className="eyebrow">ScoutClaw Control Room</p>
        <h1 className="hero-title" aria-label="Turn your OpenClaw outreach workflow into a dashboard.">
          {HERO_WORDS.map((word, index) => (
            <span className="hero-word" key={word} style={{ animationDelay: `${index * 90}ms` }}>
              {word}
            </span>
          ))}
        </h1>
        <p className="hero-copy">
          Upload a resume, tune filters, configure SMTP, and start or stop outreach runs from a single place.
        </p>
      </div>
      <div className="hero-status">
        <span className={`status-pill status-${status}`}>{status}</span>
        <span>Session: {session}</span>
        <span>PID: {pid || "not running"}</span>
      </div>
    </section>
  );
}

