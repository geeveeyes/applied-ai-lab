"""Ingestion and retrieval: BM25, vector search, hybrid fusion, reranking, ACL filtering."""
import json
import math
import time
from collections import Counter
from pathlib import Path

from .chunking import chunk_documents
from .embeddings import HashingEmbedder, cosine
from .text import concepts_of, tokens

MODES = ("keyword", "semantic", "hybrid")
ROLES = {
    "employee": ["all"],
    "engineer": ["all", "eng"],
    "finance": ["all", "finance"],
    "exec": ["all", "eng", "finance", "exec"],
}


def load_corpus(path):
    path = Path(path)
    if path.is_dir():
        docs = []
        for file in sorted(path.rglob("*")):
            if file.suffix.lower() in {".md", ".txt"} and file.is_file():
                docs.append({"id": file.stem, "source": file.parent.name or "files", "title": file.name, "groups": ["all"], "text": file.read_text(errors="replace")})
        if not docs:
            raise ValueError(f"No .md or .txt files found in {path}")
        return docs
    docs = json.loads(path.read_text())
    for doc in docs:
        missing = {"id", "source", "title", "groups", "text"} - set(doc)
        if missing:
            raise ValueError(f"Document {doc.get('id')} is missing {sorted(missing)}")
    return docs


class Index:
    def __init__(self, docs, strategy="paragraph", embedder=None):
        self.strategy = strategy
        self.embedder = embedder or HashingEmbedder()
        self.docs = docs
        self.chunks = []
        self.by_id = {}
        self.stats = {"chunks": 0, "embedded": 0, "skipped_unchanged": 0}
        self._vectors = {}
        self._cache = {}
        self.ingest(docs)

    def ingest(self, docs):
        """Chunk once, hash content, and embed only chunks not seen before."""
        self.docs = docs
        self.chunks = chunk_documents(docs, self.strategy)
        self.by_id = {c["id"]: c for c in self.chunks}
        self.embedder.fit([c["index_text"] for c in self.chunks])
        # The offline embedder's IDF depends on the corpus, so it re-embeds everything;
        # paid embedders skip chunks whose content hash was already embedded.
        offline = self.embedder.name == HashingEmbedder.name
        todo = self.chunks if offline else [c for c in self.chunks if (c["hash"], self.embedder.name) not in self._cache]
        for chunk, vector in zip(todo, self.embedder.embed_many([c["index_text"] for c in todo])):
            self._cache[(chunk["hash"], self.embedder.name)] = vector
        self._vectors = {c["id"]: self._cache[(c["hash"], self.embedder.name)] for c in self.chunks}
        self._tokens = {c["id"]: tokens(c["index_text"]) for c in self.chunks}
        self._tf = {cid: Counter(t) for cid, t in self._tokens.items()}
        df = Counter(term for t in self._tf.values() for term in t)
        n = len(self.chunks) or 1
        self._idf = {term: math.log(1 + (n - c + 0.5) / (c + 0.5)) for term, c in df.items()}
        self._avg = sum(len(t) for t in self._tokens.values()) / n or 1
        self.stats = {"chunks": len(self.chunks), "embedded": len(todo), "skipped_unchanged": len(self.chunks) - len(todo)}

    def visible(self, viewer):
        groups = set(ROLES.get(viewer, []))
        return {c["id"] for c in self.chunks if groups & set(c["groups"])}

    def _bm25(self, query, allowed, k1=1.5, b=0.75):
        q = tokens(query)
        scores = {}
        for cid in allowed:
            tf, length = self._tf[cid], len(self._tokens[cid])
            score = sum(self._idf.get(t, 0) * tf[t] * (k1 + 1) / (tf[t] + k1 * (1 - b + b * length / self._avg)) for t in q if t in tf)
            if score > 0:
                scores[cid] = score
        return sorted(scores, key=lambda cid: (-scores[cid], cid)), scores

    def _semantic(self, query, allowed):
        qv = self.embedder.embed(query)
        scores = {cid: cosine(qv, self._vectors[cid]) for cid in allowed}
        scores = {cid: s for cid, s in scores.items() if s > 0.02}
        return sorted(scores, key=lambda cid: (-scores[cid], cid)), scores

    def search(self, query, mode="hybrid", k=5, rerank=False, viewer="employee", pool=20):
        if mode not in MODES:
            raise ValueError(f"Unknown mode: {mode}")
        started = time.perf_counter()
        allowed = self.visible(viewer)
        if mode == "keyword":
            order, scores = self._bm25(query, allowed)
            signals = {cid: {"bm25": scores[cid]} for cid in order}
        elif mode == "semantic":
            order, scores = self._semantic(query, allowed)
            signals = {cid: {"cosine": scores[cid]} for cid in order}
        else:
            kw, kws = self._bm25(query, allowed)
            sem, sems = self._semantic(query, allowed)
            fused = Counter()
            for ranking in (kw[:pool], sem[:pool]):
                for rank, cid in enumerate(ranking, 1):
                    fused[cid] += 1 / (60 + rank)
            order = sorted(fused, key=lambda cid: (-fused[cid], cid))
            scores = fused
            signals = {cid: {"rrf": fused[cid], "bm25": kws.get(cid, 0.0), "cosine": sems.get(cid, 0.0)} for cid in order}
        if rerank:
            order, scores, signals = self._rerank(query, order[:pool], scores, signals)
        hits = [self._hit(cid, rank, scores[cid], signals[cid]) for rank, cid in enumerate(order[:k], 1)]
        return {"hits": hits, "latency_ms": (time.perf_counter() - started) * 1000, "candidates": len(order)}

    def _rerank(self, query, order, scores, signals):
        """Deterministic stand-in for a cross-encoder: query coverage, phrase match, title match."""
        q = list(dict.fromkeys(tokens(query)))
        bigrams = set(zip(q, q[1:]))
        top = max((scores[c] for c in order), default=1) or 1
        new_scores, new_signals = {}, {}
        for cid in order:
            chunk_tokens = self._tokens[cid]
            present = set(chunk_tokens) | {c for t in chunk_tokens for c in concepts_of(t)}
            covered = sum(1 for t in q if t in present or any(c in present for c in concepts_of(t)))
            coverage = covered / len(q) if q else 0
            pairs = set(zip(chunk_tokens, chunk_tokens[1:]))
            phrase = len(bigrams & pairs) / len(bigrams) if bigrams else 0
            title = set(tokens(self.by_id[cid]["title"]))
            title_cov = len(title & set(q)) / len(q) if q else 0
            new_scores[cid] = 0.55 * coverage + 0.2 * phrase + 0.1 * title_cov + 0.15 * scores[cid] / top
            new_signals[cid] = {**signals[cid], "coverage": coverage, "phrase": phrase}
        order = sorted(new_scores, key=lambda cid: (-new_scores[cid], cid))
        return order, new_scores, new_signals

    def _hit(self, cid, rank, score, signals):
        chunk = self.by_id[cid]
        return {"chunk_id": cid, "doc_id": chunk["doc_id"], "title": chunk["title"], "source": chunk["source"], "text": chunk["text"], "rank": rank, "score": round(score, 4), "signals": {k: round(v, 4) for k, v in signals.items()}}
