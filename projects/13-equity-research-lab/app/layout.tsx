import "./globals.css";
import Link from "next/link";

export const metadata = { title: "Equity Research Lab", description: "Evidence-first stock research, prediction snapshots and retrospectives." };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>
    <header className="nav"><Link href="/" className="brand">Equity Research Lab</Link><nav><Link href="/research">Archive</Link><Link href="/performance">Performance</Link><Link href="/analysts">Analysts</Link></nav></header>
    <main>{children}</main>
    <footer>Evidence first. Predictions frozen. Learn from every call.</footer>
  </body></html>;
}
