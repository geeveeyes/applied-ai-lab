import Link from "next/link";
import { PROJECTS } from "@/lib/projects";

export default function Home() {
  return <>
    <h1>Applied AI Lab</h1>
    <p className="lede">One place for the lab&apos;s projects. Each project keeps its own data and spend limits.</p>
    <div className="grid">
      {PROJECTS.map((p) => {
        const body = <><span className="tag">PROJECT {p.n}</span><span className="pill">{p.status}</span><h2>{p.title}</h2><p>{p.blurb}</p></>;
        return p.href ? <Link key={p.slug} href={p.href} className="card">{body}</Link> : <div key={p.slug} className="card off">{body}</div>;
      })}
    </div>
  </>;
}
