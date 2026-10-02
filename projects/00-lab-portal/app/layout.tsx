import "./globals.css";
import Link from "next/link";

export const metadata = { title: "Applied AI Lab", description: "Private portal for the Applied AI Lab projects." };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>
    <header className="nav"><Link href="/" className="brand">Applied AI Lab</Link><nav><Link href="/documents">Ask My Documents</Link></nav></header>
    <main>{children}</main>
  </body></html>;
}
