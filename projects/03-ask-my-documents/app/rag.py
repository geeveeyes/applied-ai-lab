"""RAG core: chunk -> index (BM25 + vectors, cached by file hash) -> hybrid retrieve -> cited answer."""
import json
import math
import re
from collections import Counter
from pathlib import Path

from .embedders import tokens

CHUNK_CHARS = 700
OVERLAP_CHARS = 100
TOP_K = 4
MIN_COVERAGE = 0.4
MIN_CHUNK_COVERAGE = 0.3  # IDF-weighted share of question terms found in the best chunk
MAX_CHUNKS = 2000
CHUNK_VERSION = 1  # bump when chunking changes so cached vectors are discarded
MODES = ("lexical", "dense", "hybrid")
REFUSAL = "I couldn't find this in your documents."


def chunk_doc(doc):
    """Paragraph-aware chunks with overlap; each keeps its nearest heading and PDF page."""
    chunks = []
    for page, text in doc["pages"]:
        heading, buf = "", ""

        def flush():
            nonlocal buf
            if buf.strip():
                chunks.append({"source": doc["source"], "heading": heading, "page": page, "text": buf.strip()})
            buf = buf[-OVERLAP_CHARS:] if len(buf) > OVERLAP_CHARS else ""

        for para in re.split(r"\n\s*\n", text):
            para = para.strip()
            if not para:
                continue
            if para.startswith("#"):
                flush()
                buf = ""
                heading = para.lstrip("# ").strip()
                continue
            if len(buf) + len(para) > CHUNK_CHARS:
                flush()
            buf += ("\n\n" if buf else "") + para
        flush()
    return chunks


def load_cache(path):
    try:
        return json.loads(Path(path).read_text())
    except (OSError, ValueError):
        return {}


class Index:
    def __init__(self, chunks, embedder):
        self.embedder = embedder
        self.chunks = chunks
        for i, c in enumerate(self.chunks):
            c["id"] = f"C{i + 1}"
            c["tf"] = Counter(tokens(c["heading"] + " " + c["text"]))
        self.df = Counter(t for c in self.chunks for t in c["tf"])
        self.avg_len = sum(sum(c["tf"].values()) for c in self.chunks) / max(len(self.chunks), 1)

    @classmethod
    def build(cls, docs, embedder, cache_path=None):
        """Embed only files whose content hash changed. Returns (index, stats)."""
        cache = load_cache(cache_path) if cache_path else {}
        valid = cache.get("embedder") == embedder.id and cache.get("version") == CHUNK_VERSION
        old = cache.get("files", {}) if valid else {}
        chunks, files, pending, stats = [], {}, [], {"files_reused": 0, "files_embedded": 0, "chunks_embedded": 0, "embedding_tokens": 0}
        for doc in docs:
            hit = old.get(doc["source"])
            if hit and hit["hash"] == doc["hash"]:
                stats["files_reused"] += 1
                files[doc["source"]] = hit
                chunks.extend(dict(c) for c in hit["chunks"])
            else:
                fresh = chunk_doc(doc)
                pending.append((doc, fresh))
        total = len(chunks) + sum(len(f) for _, f in pending)
        if total > MAX_CHUNKS:
            raise ValueError(f"Too many chunks ({total}); the limit is {MAX_CHUNKS}.")
        if pending:
            texts = [c["heading"] + "\n" + c["text"] for _, fresh in pending for c in fresh]
            vectors, used = embedder.embed(texts)
            it = iter(vectors)
            for doc, fresh in pending:
                for c in fresh:
                    c["vec"] = [round(v, 5) for v in next(it)]
                files[doc["source"]] = {"hash": doc["hash"], "chunks": fresh}
                chunks.extend(dict(c) for c in fresh)
                stats["files_embedded"] += 1
            stats["chunks_embedded"], stats["embedding_tokens"] = len(texts), used
        if cache_path and (pending or valid is False or set(old) != set(files)):
            Path(cache_path).parent.mkdir(parents=True, exist_ok=True)
            Path(cache_path).write_text(json.dumps({"embedder": embedder.id, "version": CHUNK_VERSION, "files": files}))
        stats["chunks"] = len(chunks)
        return cls(chunks, embedder), stats

    def bm25(self, query):
        n, scores, qt = len(self.chunks), [], set(tokens(query))
        for c in self.chunks:
            length, s = sum(c["tf"].values()), 0.0
            for t in qt:
                if t in c["tf"]:
                    idf = math.log(1 + (n - self.df[t] + 0.5) / (self.df[t] + 0.5))
                    f = c["tf"][t]
                    s += idf * f * 2.2 / (f + 1.2 * (0.25 + 0.75 * length / self.avg_len))
            scores.append(s)
        return scores

    def dense(self, query):
        q = self.embedder.embed([query])[0][0]
        return [sum(a * b for a, b in zip(q, c["vec"])) for c in self.chunks]

    def search(self, query, k=TOP_K, mode="hybrid"):
        if mode not in MODES:
            raise ValueError("Unknown retrieval mode.")
        bm = self.bm25(query)
        signals = []
        if mode in ("lexical", "hybrid"):
            signals.append(bm)
        if mode in ("dense", "hybrid"):
            signals.append(self.dense(query))
        fused = Counter()
        for scores in signals:
            for rank, i in enumerate(sorted(range(len(scores)), key=lambda i: -scores[i])):
                if scores[i] > 0:
                    fused[i] += 1 / (60 + rank)
        top = [i for i, _ in fused.most_common(k)]
        qt = set(tokens(query))
        weight = {t: math.log(1 + (len(self.chunks) + 0.5) / (self.df[t] + 0.5)) for t in qt}
        total = sum(weight.values()) or 1.0
        coverage = lambda i: sum(w for t, w in weight.items() if t in self.chunks[i]["tf"]) / total
        return [{**{key: self.chunks[i][key] for key in ("id", "source", "heading", "page", "text")}, "score": round(fused[i], 4), "lexical_hit": bm[i] > 0, "coverage": round(coverage(i), 3)} for i in top]


def label(hit):
    page = f" p.{hit['page']}" if hit.get("page") else ""
    return f"{hit['source']}{page}" + (f" › {hit['heading']}" if hit["heading"] else "")


def mock_answer(question, hits):
    """Extractive, cited, and refuses unless a sentence covers enough of the question's terms."""
    q = set(tokens(question))
    if not hits or max(h["coverage"] for h in hits) < MIN_CHUNK_COVERAGE:
        return {"answer": REFUSAL, "citations": []}
    scored = []
    for h in hits:
        for sent in re.split(r"(?<=[.!?])\s+", h["text"]):
            overlap = len(q & set(tokens(sent)))
            if overlap:
                scored.append((overlap, h["id"], sent.strip()))
    scored.sort(key=lambda x: -x[0])
    if not scored or scored[0][0] / max(len(q), 1) < MIN_COVERAGE:
        return {"answer": REFUSAL, "citations": []}
    best = scored[:2]
    return {"answer": " ".join(f"{s} [{c}]" for _, c, s in best), "citations": sorted({c for _, c, _ in best})}


def validate(result, hits):
    """Drop citations that don't point at a retrieved chunk; an uncited answer becomes a refusal."""
    ids = {h["id"] for h in hits}
    cites = [c for c in result.get("citations", []) if c in ids]
    text = str(result.get("answer", "")).strip()
    text = re.sub(r"\[(C\d+)\]", lambda m: m.group(0) if m.group(1) in ids else "", text).strip()
    if not cites or not text:
        return {"answer": REFUSAL, "citations": []}
    return {"answer": text, "citations": sorted(set(cites), key=lambda c: int(c[1:]))}
