import argparse
import json
from pathlib import Path

from .rag import Index, answer, load_folder

DEFAULT = Path(__file__).resolve().parent.parent / "sample_docs"


def main():
    p = argparse.ArgumentParser(description="Ask questions about a folder of .md/.txt files (mock mode).")
    p.add_argument("question")
    p.add_argument("--docs", default=str(DEFAULT))
    p.add_argument("--json", action="store_true")
    args = p.parse_args()
    index = Index(load_folder(args.docs))
    hits = index.search(args.question)
    result = {**answer(args.question, hits), "sources": hits}
    if args.json:
        print(json.dumps(result, indent=2))
        return
    print(result["answer"], "\n")
    for h in hits:
        print(f"[{h['id']}] {h['source']} › {h['heading']}  (score {h['score']})")


if __name__ == "__main__":
    main()
