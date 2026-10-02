export type Doc = { source: string; text: string };
export type Chunk = { id: string; source: string; heading: string; page: number | null; text: string };

export const CHUNK_CHARS = 700;
export const OVERLAP_CHARS = 100;

/** Paragraph-aware chunks with overlap; each keeps its nearest heading. Mirrors the Python implementation. */
export function chunkDoc(doc: Doc): Omit<Chunk, "id">[] {
  const out: Omit<Chunk, "id">[] = [];
  let heading = "";
  let buf = "";
  const flush = () => {
    if (buf.trim()) out.push({ source: doc.source, heading, page: null, text: buf.trim() });
    buf = buf.length > OVERLAP_CHARS ? buf.slice(-OVERLAP_CHARS) : "";
  };
  for (let para of doc.text.split(/\n\s*\n/)) {
    para = para.trim();
    if (!para) continue;
    if (para.startsWith("#")) {
      flush();
      buf = "";
      heading = para.replace(/^#+\s*/, "").trim();
      continue;
    }
    if (buf.length + para.length > CHUNK_CHARS) flush();
    buf += (buf ? "\n\n" : "") + para;
  }
  flush();
  return out;
}
