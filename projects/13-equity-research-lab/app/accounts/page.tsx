import { SnapTradeAccounts } from "@/components/SnapTradeAccounts";

export default function AccountsPage() {
  return <>
    <section className="hero compact">
      <div><p className="eyebrow">CONNECTED ACCOUNTS</p><h1>See your accounts together.</h1>
        <p className="lede">Refresh read-only Fidelity and Robinhood data when you choose. Other institutions are left out of this view.</p></div>
    </section>
    <SnapTradeAccounts />
  </>;
}
