import SiteNav from "../ui/site-nav.js";
import SupportSection from "../ui/support-section.js";

export default function SupportPage() {
  return (
    <main className="shell">
      <SiteNav />
      <SupportSection standalone />
    </main>
  );
}

