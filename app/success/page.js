import Link from "next/link";
import SiteNav from "../ui/site-nav.js";

export default function SuccessPage() {
  return (
    <main className="shell">
      <SiteNav />
      <section className="marketing-panel standalone-section">
        <p className="panel-kicker">Checkout Success</p>
        <h2>Payment captured. We can wire entitlement logic next.</h2>
        <p className="marketing-copy-muted">Stripe checkout completed successfully. Backend plan activation can be connected here in the next pass.</p>
        <Link className="primary-button inline-link-button" href="/pricing">
          Back to pricing
        </Link>
      </section>
    </main>
  );
}

