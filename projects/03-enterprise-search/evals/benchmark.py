"""Compare chunking strategies x retrieval modes x rerank on the QA set.

    python3 -m evals.benchmark            # table
    python3 -m evals.benchmark --json     # machine-readable
"""
import json
import statistics
import sys
from pathlib import Path

from app.answer import answer
from app.index import Index, load_corpus
from app.chunking import STRATEGIES

ROOT = Path(__file__).resolve().parent.parent
K = 3


def load():
    return load_corpus(ROOT / "data" / "corpus.json"), json.loads((ROOT / "evals" / "qa.json").read_text())


def norm(text):
    return " ".join(text.lower().split())


def evaluate(index, qa, mode, rerank, k=K, repeats=5):
    recalls, precisions, rr, latencies = [], [], [], []
    for item in qa:
        if not item["gold"] or item.get("expect_refusal"):
            continue
        viewer = item.get("viewer", "exec")
        hits = None
        for _ in range(repeats):
            result = index.search(item["q"], mode=mode, k=k, rerank=rerank, viewer=viewer)
            latencies.append(result["latency_ms"])
            hits = result["hits"]
        blob = norm(" ".join(h["text"] for h in hits))
        recalls.append(sum(norm(f) in blob for f in item["facts"]) / len(item["facts"]))
        precisions.append(sum(h["doc_id"] in item["gold"] for h in hits) / k)
        first = next((i for i, h in enumerate(hits, 1) if h["doc_id"] in item["gold"]), None)
        rr.append(1 / first if first else 0.0)
    latencies.sort()
    p95 = latencies[min(len(latencies) - 1, int(0.95 * len(latencies)))]
    return {"context_recall": statistics.mean(recalls), "context_precision": statistics.mean(precisions), "mrr": statistics.mean(rr), "p95_ms": p95, "questions": len(recalls)}


def answer_quality(index, qa, mode="hybrid", rerank=True):
    """Citation validity, refusals on unanswerable/restricted questions, and fact presence in answers."""
    stats = {"answerable": 0, "answer_has_fact": 0, "refusal_expected": 0, "refused_correctly": 0, "claims": 0, "valid_citations": 0}
    for item in qa:
        hits = index.search(item["q"], mode=mode, k=K, rerank=rerank, viewer=item.get("viewer", "exec"))["hits"]
        result, _ = answer(item["q"], hits)
        valid = {h["chunk_id"] for h in hits}
        for claim in result["claims"]:
            stats["claims"] += 1
            stats["valid_citations"] += all(c in valid for c in claim["citations"]) and bool(claim["citations"])
        if item.get("expect_refusal"):
            stats["refusal_expected"] += 1
            stats["refused_correctly"] += result["refused"]
        elif item["facts"]:
            stats["answerable"] += 1
            stats["answer_has_fact"] += all(norm(f) in norm(result["answer"]) for f in item["facts"])
    return stats


def main():
    docs, qa = load()
    rows = []
    for strategy in STRATEGIES:
        index = Index(docs, strategy)
        for mode in ("keyword", "semantic", "hybrid"):
            for rerank in (False, True):
                rows.append({"chunking": strategy, "mode": mode, "rerank": rerank, **evaluate(index, qa, mode, rerank)})
    quality = answer_quality(Index(docs, "structure"), qa)
    if "--json" in sys.argv:
        print(json.dumps({"retrieval": rows, "answers": quality}, indent=1))
        return
    print(f"{'chunking':<10} {'mode':<9} {'rerank':<6} {'recall@3':>8} {'prec@3':>7} {'MRR':>6} {'p95 ms':>7}")
    for r in rows:
        print(f"{r['chunking']:<10} {r['mode']:<9} {str(r['rerank']):<6} {r['context_recall']:>8.2f} {r['context_precision']:>7.2f} {r['mrr']:>6.2f} {r['p95_ms']:>7.2f}")
    print(f"\nAnswers (structure chunking, hybrid + rerank, mock answerer): {quality}")


if __name__ == "__main__":
    main()
