import "./globals.css";
import Link from "next/link";
import { PortfolioSessionProvider } from "@/components/PortfolioSession";

export const metadata = { title: "Equity Research Lab", description: "Evidence-first stock research, prediction snapshots and retrospectives." };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>
    <header className="nav"><Link href="/" className="brand">Equity Research Lab</Link><nav><Link href="/watchlist">Watchlist</Link><Link href="/opportunities">Find stocks</Link><Link href="/amzn">Diversify a holding</Link><Link href="/accounts">Connected accounts</Link><Link href="/holdings">My holdings</Link><Link href="/portfolio">Portfolio Lab</Link><Link href="/research">Archive</Link><Link href="/performance">Performance</Link></nav></header>
    <PortfolioSessionProvider><main>{children}</main></PortfolioSessionProvider>
    <footer>Evidence first. Predictions frozen. Learn from every call.</footer>
  </body></html>;
}
