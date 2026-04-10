import SiteNav from "../ui/site-nav.js";
import PricingSection from "../ui/pricing-section.js";

export default function PricingPage() {
  return (
    <main className="shell">
      <SiteNav />
      <PricingSection standalone />
    </main>
  );
}

