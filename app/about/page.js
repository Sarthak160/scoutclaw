import SiteNav from "../ui/site-nav.js";
import AboutSection from "../ui/about-section.js";

export default function AboutPage() {
  return (
    <main className="shell">
      <SiteNav />
      <AboutSection standalone />
    </main>
  );
}

