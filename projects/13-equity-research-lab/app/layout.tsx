import "./globals.css";
import { MainNavigation } from "@/components/MainNavigation";
import { PortfolioSessionProvider } from "@/components/PortfolioSession";

export const metadata = { title: "Equity Research Lab", description: "Evidence-first stock research, prediction snapshots and retrospectives." };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>
    <MainNavigation />
    <PortfolioSessionProvider><main>{children}</main></PortfolioSessionProvider>
    <footer>Evidence first. Predictions frozen. Learn from every call.</footer>
  </body></html>;
}
