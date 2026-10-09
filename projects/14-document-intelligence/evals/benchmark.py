"""Per-field precision/recall/F1, error breakdown, and cost for each extractor.

    python3 -m evals.benchmark                      # rules_v1 and rules_v2
    python3 -m evals.benchmark --extractor openai   # needs OPENAI_API_KEY (paid)
"""
import json
import sys
from collections import defaultdict
from pathlib import Path

from app.pipeline import process
from app.schema import FIELDS

ROOT = Path(__file__).resolve().parent.parent


def load():
    labels = json.loads((ROOT / "data" / "labels.json").read_text())
    return {doc: (path.read_text(), labels[doc]) for doc in labels if (path := ROOT / "data" / "contracts" / f"{doc}.txt").exists()}


def score(extractor, corpus=None, post=None):
    corpus = corpus or load()
    counts = {f: {"tp": 0, "fp": 0, "fn": 0} for f in FIELDS}
    by_variant = defaultdict(lambda: [0, 0])
    by_decoy = {True: [0, 0], False: [0, 0]}
    flagged = cost = 0
    for doc, (text, meta) in corpus.items():
        result = process(text, extractor, post)
        flagged += len(result["issues"])
        cost += result["est_cost_usd"]
        for field, gold in meta["fields"].items():
            got = result["record"][field]
            c = counts[field]
            if got is not None and got == gold:
                c["tp"] += 1
            else:
                c["fp"] += got is not None
                c["fn"] += gold is not None
            ok = got == gold
            by_variant[f"{field}:{meta['variants'][field]}"][0] += ok
            by_variant[f"{field}:{meta['variants'][field]}"][1] += 1
            by_decoy[meta["decoy"]][0] += ok
            by_decoy[meta["decoy"]][1] += 1
    return {"extractor": extractor, "fields": {f: _prf(c) for f, c in counts.items()}, "micro": _prf({k: sum(c[k] for c in counts.values()) for k in ("tp", "fp", "fn")}),
            "accuracy_by_variant": {k: v[0] / v[1] for k, v in sorted(by_variant.items())}, "accuracy_decoy": by_decoy[True][0] / by_decoy[True][1], "accuracy_clean": by_decoy[False][0] / by_decoy[False][1],
            "validation_issues": flagged, "est_cost_per_1000_docs_usd": cost / len(corpus) * 1000, "documents": len(corpus)}


def _prf(c):
    p = c["tp"] / (c["tp"] + c["fp"]) if c["tp"] + c["fp"] else 0.0
    r = c["tp"] / (c["tp"] + c["fn"]) if c["tp"] + c["fn"] else 0.0
    return {"precision": p, "recall": r, "f1": 2 * p * r / (p + r) if p + r else 0.0}


def main():
    names = [sys.argv[sys.argv.index("--extractor") + 1]] if "--extractor" in sys.argv else ["rules_v1", "rules_v2"]
    results = [score(n) for n in names]
    if "--json" in sys.argv:
        print(json.dumps(results, indent=1))
        return
    for r in results:
        m = r["micro"]
        print(f"\n== {r['extractor']}  micro P {m['precision']:.2f} R {m['recall']:.2f} F1 {m['f1']:.2f}  | decoy docs {r['accuracy_decoy']:.2f} vs clean {r['accuracy_clean']:.2f}  | est ${r['est_cost_per_1000_docs_usd']:.2f}/1000 docs")
        print(f"{'field':<26}{'P':>6}{'R':>6}{'F1':>6}")
        for f, s in r["fields"].items():
            print(f"{f:<26}{s['precision']:>6.2f}{s['recall']:>6.2f}{s['f1']:>6.2f}")
        weak = [(k, v) for k, v in r["accuracy_by_variant"].items() if v < 0.8]
        print("weakest phrasings:", ", ".join(f"{k} {v:.0%}" for k, v in weak) or "none")


if __name__ == "__main__":
    main()
