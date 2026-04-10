import "./globals.css";

export const metadata = {
  title: "ScoutClaw",
  description: "Resume-driven OpenClaw workspace for outreach runs, filters, and live control."
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
