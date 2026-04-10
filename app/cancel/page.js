import Link from "next/link";
import SiteNav from "../ui/site-nav.js";

export default function CancelPage() {
  return (
    <main className="shell">
      <SiteNav />
      <section className="marketing-panel standalone-section">
        <p className="panel-kicker">Checkout Cancelled</p>
        <h2>No worries. Your plan selection is still here when you’re ready.</h2>
        <p className="marketing-copy-muted">You can return to pricing and restart checkout at any time.</p>
        <Link className="primary-button inline-link-button" href="/pricing">
          Return to pricing
        </Link>
      </section>
    </main>
  );
}

