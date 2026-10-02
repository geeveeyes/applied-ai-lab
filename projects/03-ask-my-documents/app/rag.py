"""Dependency-free RAG core: ingest -> chunk -> index -> retrieve -> cited answer.

POC retrieval is hybrid: BM25 (lexical) fused with hashed bag-of-words cosine
(a stand-in for dense embeddings) via reciprocal-rank fusion. A real embedding
provider plugs in at `embed()` in milestone 3.
"""
import hashlib
import math
import re
from collections import Counter
from pathlib import Path

SUPPORTED = {".md", ".txt"}
MAX_FILES = 50
MAX_FILE_BYTES = 500_000
CHUNK_CHARS = 700
OVERLAP_CHARS = 100
TOP_K = 4
MIN_COVERAGE = 0.4
DIM = 512
STOP = set("a an and are as at be by for from how in is it of on or that the to was what when where which who will with do does can i my".split())


def tokens(text):
    return [t for t in re.findall(r"[a-z0-9$]+", text.lower()) if t not in STOP]


def load_folder(folder):
    files = sorted(p for p in Path(folder).rglob("*") if p.suffix.lower() in SUPPORTED)[:MAX_FILES]
    docs = []
    for path in files:
        if path.stat().st_size > MAX_FILE_BYTES:
            continue
        docs.append({"source": str(path.relative_to(folder)), "text": path.read_text(errors="replace")})
    if not docs:
        raise ValueError("No .md or .txt documents found.")
    return docs


def chunk(doc):
    """Paragraph-aware chunks with overlap; each keeps the nearest heading."""
    heading, chunks, buf = "", [], ""
    def flush():
        nonlocal buf
        if buf.strip():
            chunks.append({"source": doc["source"], "heading": heading, "text": buf.strip()})
        buf = buf[-OVERLAP_CHARS:] if len(buf) > OVERLAP_CHARS else ""
    for para in re.split(r"\n\s*\n", doc["text"]):
        para = para.strip()
        if not para:
            continue
        if para.startswith("#"):
            flush(); buf = ""
            heading = para.lstrip("# ").strip()
            continue
        if len(buf) + len(para) > CHUNK_CHARS:
            flush()
        buf += ("\n\n" if buf else "") + para
    flush()
    return chunks


def embed(text):
    """Hashed bag-of-words unit vector. Deterministic, offline stand-in for an embedding model."""
    vec = [0.0] * DIM
    for tok in tokens(text):
        h = int(hashlib.md5(tok.encode()).hexdigest(), 16)
        vec[h % DIM] += 1.0 if (h >> 64) & 1 else -1.0
    norm = math.sqrt(sum(v * v for v in vec)) or 1.0
    return [v / norm for v in vec]


class Index:
    def __init__(self, docs):
        self.chunks = []
        for doc in docs:
            self.chunks.extend(chunk(doc))
        for i, c in enumerate(self.chunks):
            c["id"] = f"C{i + 1}"
            c["tf"] = Counter(tokens(c["heading"] + " " + c["text"]))
            c["vec"] = embed(c["heading"] + " " + c["text"])
        self.df = Counter(t for c in self.chunks for t in c["tf"])
        self.avg_len = sum(sum(c["tf"].values()) for c in self.chunks) / max(len(self.chunks), 1)

    def bm25(self, query):
        n, scores = len(self.chunks), []
        for c in self.chunks:
            length, s = sum(c["tf"].values()), 0.0
            for t in set(tokens(query)):
                if t in c["tf"]:
                    idf = math.log(1 + (n - self.df[t] + 0.5) / (self.df[t] + 0.5))
                    f = c["tf"][t]
                    s += idf * f * 2.2 / (f + 1.2 * (0.25 + 0.75 * length / self.avg_len))
            scores.append(s)
        return scores

    def dense(self, query):
        q = embed(query)
        return [sum(a * b for a, b in zip(q, c["vec"])) for c in self.chunks]

    def search(self, query, k=TOP_K):
        fused = Counter()
        for scores in (self.bm25(query), self.dense(query)):
            ranked = sorted(range(len(scores)), key=lambda i: -scores[i])
            for rank, i in enumerate(ranked):
                if scores[i] > 0:
                    fused[i] += 1 / (60 + rank)
        top = [i for i, _ in fused.most_common(k)]
        bm = self.bm25(query)
        return [{**{key: self.chunks[i][key] for key in ("id", "source", "heading", "text")}, "score": round(fused[i], 4), "lexical_hit": bm[i] > 0} for i in top]


def answer(question, hits):
    """Mock grounded answer: extractive, cited, and refuses when nothing lexically matches."""
    q = set(tokens(question))
    if not hits or not any(h["lexical_hit"] for h in hits):
        return {"answer": "I couldn't find this in your documents.", "citations": []}
    best, scored = [], []
    for h in hits:
        for sent in re.split(r"(?<=[.!?])\s+", h["text"]):
            overlap = len(q & set(tokens(sent)))
            if overlap:
                scored.append((overlap, h["id"], sent.strip()))
    scored.sort(key=lambda x: -x[0])
    # Relevance gate: the best sentence must cover a meaningful share of the question's terms.
    if not scored or scored[0][0] / max(len(q), 1) < MIN_COVERAGE:
        return {"answer": "I couldn't find this in your documents.", "citations": []}
    for _, cid, sent in scored[:2]:
        best.append((cid, sent))
    return {"answer": " ".join(f"{s} [{c}]" for c, s in best), "citations": sorted({c for c, _ in best})}
