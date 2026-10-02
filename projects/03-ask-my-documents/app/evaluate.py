"""Retrieval + answer evaluation shared by the unit tests and `python3 -m evals.report`."""
import json
from pathlib import Path

from .providers import generate
from .rag import REFUSAL

ROOT = Path(__file__).resolve().parent.parent
CASES = ROOT / "evals" / "cases.json"


def load_cases():
    return json.loads(CASES.read_text())


def retrieval_metrics(index, cases, mode, k=4):
    """hit@k and MRR over answerable cases; a hit is a chunk from the right file containing the fact."""
    ranks = []
    for c in (c for c in cases if c["source"]):
        hits = index.search(c["q"], k=k, mode=mode)
        ranks.append(next((i + 1 for i, h in enumerate(hits) if h["source"] == c["source"] and c["contains"].lower() in h["text"].lower()), None))
    n = max(len(ranks), 1)
    return {"mode": mode, "hit_at_k": sum(r is not None for r in ranks) / n, "mrr": sum(1 / r for r in ranks if r) / n, "n": len(ranks)}


def answer_metrics(index, cases, provider, mode="hybrid", k=4):
    """End-to-end: answerable questions should cite the right chunk and contain the fact; others should refuse."""
    correct = refused_ok = refused_bad = unanswerable = answerable = 0
    usage = {"input_tokens": 0, "cached_input_tokens": 0, "output_tokens": 0}
    for c in cases:
        hits = index.search(c["q"], k=k, mode=mode)
        result, u = generate(provider, c["q"], hits)
        for key in usage:
            usage[key] += (u or {}).get(key, 0)
        refused = result["answer"] == REFUSAL
        if c["source"]:
            answerable += 1
            cited = [h for h in hits if h["id"] in result["citations"]]
            correct += (not refused) and any(h["source"] == c["source"] and c["contains"].lower() in h["text"].lower() for h in cited)
            refused_bad += refused
        else:
            unanswerable += 1
            refused_ok += refused
    return {
        "provider": provider, "answer_correct": correct / max(answerable, 1),
        "wrongly_refused": refused_bad / max(answerable, 1),
        "correct_refusals": refused_ok / max(unanswerable, 1), "usage": usage,
    }
