import { Chunk, Doc, chunkDoc } from "./chunk";
import { tokens } from "./tokens";

export const TOP_K = 4;
export const HASH_DIM = 512;
export const MODES = ["lexical", "dense", "hybrid"] as const;
export type Mode = (typeof MODES)[number];
export type Hit = Chunk & { score: number; lexicalHit: boolean; coverage: number };

function fnv1a(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  return h >>> 0;
}

/** Deterministic offline stand-in for an embedding model: hashed bag-of-words unit vector. */
export function hashEmbed(text: string): number[] {
  const v = new Array(HASH_DIM).fill(0);
  for (const t of tokens(text)) {
    const h = fnv1a(t);
    v[h % HASH_DIM] += (h >>> 16) & 1 ? 1 : -1;
  }
  const norm = Math.sqrt(v.reduce((a, b) => a + b * b, 0)) || 1;
  return v.map((x) => x / norm);
}

export class Index {
  chunks: (Chunk & { tf: Map<string, number>; len: number; vec: number[] })[];
  df = new Map<string, number>();
  avgLen: number;

  constructor(docs: Doc[]) {
    this.chunks = docs.flatMap(chunkDoc).map((c, i) => {
      const toks = tokens(c.heading + " " + c.text);
      const tf = new Map<string, number>();
      for (const t of toks) tf.set(t, (tf.get(t) ?? 0) + 1);
      return { ...c, id: `C${i + 1}`, tf, len: toks.length, vec: hashEmbed(c.heading + "\n" + c.text) };
    });
    for (const c of this.chunks) for (const t of c.tf.keys()) this.df.set(t, (this.df.get(t) ?? 0) + 1);
    this.avgLen = this.chunks.reduce((a, c) => a + c.len, 0) / Math.max(this.chunks.length, 1);
  }

  private bm25(query: string): number[] {
    const n = this.chunks.length;
    const qt = [...new Set(tokens(query))];
    return this.chunks.map((c) => {
      let s = 0;
      for (const t of qt) {
        const f = c.tf.get(t);
        if (!f) continue;
        const df = this.df.get(t) ?? 0;
        s += Math.log(1 + (n - df + 0.5) / (df + 0.5)) * f * 2.2 / (f + 1.2 * (0.25 + 0.75 * c.len / this.avgLen));
      }
      return s;
    });
  }

  private dense(query: string): number[] {
    const q = hashEmbed(query);
    return this.chunks.map((c) => c.vec.reduce((a, x, i) => a + x * q[i], 0));
  }

  search(query: string, k = TOP_K, mode: Mode = "hybrid"): Hit[] {
    if (!MODES.includes(mode)) throw new Error("Unknown retrieval mode.");
    const bm = this.bm25(query);
    const signals: number[][] = [];
    if (mode !== "dense") signals.push(bm);
    if (mode !== "lexical") signals.push(this.dense(query));
    const fused = new Map<number, number>();
    for (const scores of signals) {
      scores.map((_, i) => i).sort((a, b) => scores[b] - scores[a]).forEach((i, rank) => {
        if (scores[i] > 0) fused.set(i, (fused.get(i) ?? 0) + 1 / (60 + rank));
      });
    }
    const qt = new Set(tokens(query));
    const weight = new Map([...qt].map((t) => [t, Math.log(1 + (this.chunks.length + 0.5) / ((this.df.get(t) ?? 0) + 0.5))]));
    const total = [...weight.values()].reduce((a, b) => a + b, 0) || 1;
    return [...fused.entries()].sort((a, b) => b[1] - a[1]).slice(0, k).map(([i, score]) => {
      const c = this.chunks[i];
      const coverage = [...weight].reduce((a, [t, w]) => a + (c.tf.has(t) ? w : 0), 0) / total;
      return { id: c.id, source: c.source, heading: c.heading, page: c.page, text: c.text, score: Math.round(score * 1e4) / 1e4, lexicalHit: bm[i] > 0, coverage: Math.round(coverage * 1e3) / 1e3 };
    });
  }
}
