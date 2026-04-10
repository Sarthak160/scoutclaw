import Link from "next/link";

const NAV_ITEMS = [
  { label: "About", href: "/about" },
  { label: "Pricing", href: "/pricing" },
  { label: "Support", href: "/support" }
];

export default function SiteNav() {
  return (
    <nav className="topbar">
      <Link className="topbar-brand" href="/">
        <span className="topbar-mark">SC</span>
        <span>ScoutClaw</span>
      </Link>
      <div className="topbar-links">
        {NAV_ITEMS.map((item) => (
          <Link className="topbar-link" key={item.href} href={item.href}>
            {item.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}

