"""python3 -m evals.report [--provider mock|openai]

Compares lexical, dense and hybrid retrieval and prints an end-to-end answer scorecard.
Mock uses hashed bag-of-words "embeddings"; use --provider openai for real embeddings and answers.
"""
import argparse
from pathlib import Path

from app.embedders import get_embedder
from app.evaluate import answer_metrics, load_cases, retrieval_metrics
from app.loader import load_folder
from app.rag import Index

DOCS = Path(__file__).resolve().parent.parent / "sample_docs"


def main():
    p = argparse.ArgumentParser()
    p.add_argument("--provider", default="mock", choices=["mock", "openai"])
    args = p.parse_args()
    cases = load_cases()
    docs, _ = load_folder(DOCS)
    index, stats = Index.build(docs, get_embedder(args.provider))
    print(f"{len(cases)} questions ({sum(1 for c in cases if not c['source'])} unanswerable), {stats['chunks']} chunks, embedder={index.embedder.id}\n")
    print(f"{'retrieval':<10} {'hit@4':>6} {'MRR':>6}")
    for mode in ("lexical", "dense", "hybrid"):
        m = retrieval_metrics(index, cases, mode)
        print(f"{mode:<10} {m['hit_at_k']:>6.2f} {m['mrr']:>6.2f}")
    a = answer_metrics(index, cases, args.provider)
    print(f"\nanswer correct {a['answer_correct']:.2f} | wrongly refused {a['wrongly_refused']:.2f} | correct refusals {a['correct_refusals']:.2f}")
    if args.provider != "mock":
        print("usage", a["usage"])


if __name__ == "__main__":
    main()
