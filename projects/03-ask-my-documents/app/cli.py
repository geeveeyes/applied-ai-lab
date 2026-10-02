import argparse
import json
from pathlib import Path

from .embedders import get_embedder
from .loader import load_folder
from .providers import generate
from .rag import Index, label

ROOT = Path(__file__).resolve().parent.parent


def main():
    p = argparse.ArgumentParser(description="Ask questions about a folder of .md/.txt/.pdf files.")
    p.add_argument("question")
    p.add_argument("--docs", default=str(ROOT / "sample_docs"))
    p.add_argument("--provider", default="mock", choices=["mock", "openai"])
    p.add_argument("--mode", default="hybrid", choices=["lexical", "dense", "hybrid"])
    p.add_argument("--json", action="store_true")
    args = p.parse_args()
    docs, errors = load_folder(args.docs)
    index, stats = Index.build(docs, get_embedder(args.provider), cache_path=ROOT / ".index" / f"cli-{args.provider}.json")
    hits = index.search(args.question, mode=args.mode)
    result, usage = generate(args.provider, args.question, hits)
    if args.json:
        print(json.dumps({**result, "sources": hits, "usage": usage, "ingest": stats, "errors": errors}, indent=2))
        return
    print(result["answer"], "\n")
    for h in hits:
        print(f"[{h['id']}] {label(h)}  (score {h['score']})")
    for e in errors:
        print(f"skipped {e['source']}: {e['error']}")


if __name__ == "__main__":
    main()
