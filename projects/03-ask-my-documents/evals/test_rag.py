import json
import unittest
from pathlib import Path

from app.rag import Index, answer, chunk, load_folder

ROOT = Path(__file__).resolve().parent.parent
CASES = json.loads((ROOT / "evals" / "cases.json").read_text())
INDEX = Index(load_folder(ROOT / "sample_docs"))


class RagTests(unittest.TestCase):
    def test_chunks_keep_heading_and_source(self):
        chunks = chunk({"source": "a.md", "text": "# Title\n\n## Part\n\nSome body text here."})
        self.assertEqual(chunks[0]["heading"], "Part")
        self.assertEqual(chunks[0]["source"], "a.md")

    def test_retrieval_hit_at_k_and_mrr(self):
        answerable = [c for c in CASES if c["source"]]
        ranks = []
        for c in answerable:
            hits = INDEX.search(c["q"])
            rank = next((i + 1 for i, h in enumerate(hits) if h["source"] == c["source"] and c["contains"] in h["text"]), None)
            ranks.append(rank)
        hit_rate = sum(r is not None for r in ranks) / len(ranks)
        mrr = sum(1 / r for r in ranks if r) / len(ranks)
        print(f"\nhit@4={hit_rate:.2f} MRR={mrr:.2f}")
        self.assertGreaterEqual(hit_rate, 0.8)
        self.assertGreaterEqual(mrr, 0.7)

    def test_answers_cite_retrieved_chunks_only(self):
        for c in CASES:
            hits = INDEX.search(c["q"])
            result = answer(c["q"], hits)
            self.assertTrue(set(result["citations"]) <= {h["id"] for h in hits})

    def test_refuses_when_not_in_documents(self):
        case = next(c for c in CASES if not c["source"])
        self.assertEqual(answer(case["q"], INDEX.search(case["q"]))["citations"], [])

    def test_empty_folder_rejected(self):
        with self.assertRaises(ValueError):
            load_folder(ROOT / "evals")


if __name__ == "__main__":
    unittest.main()
