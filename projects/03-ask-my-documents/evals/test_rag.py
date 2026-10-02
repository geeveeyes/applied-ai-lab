import json
import tempfile
import unittest
from pathlib import Path

from app.embedders import HashEmbedder
from app.evaluate import answer_metrics, load_cases, retrieval_metrics
from app.loader import load_folder
from app.rag import REFUSAL, Index, chunk_doc, validate

ROOT = Path(__file__).resolve().parent.parent
CASES = load_cases()
DOCS, _ = load_folder(ROOT / "sample_docs")
INDEX, _ = Index.build(DOCS, HashEmbedder())


class CoreTests(unittest.TestCase):
    def test_chunks_keep_heading_and_source(self):
        chunks = chunk_doc({"source": "a.md", "pages": [(None, "# Title\n\n## Part\n\nSome body text here.")]})
        self.assertEqual((chunks[0]["heading"], chunks[0]["source"]), ("Part", "a.md"))

    def test_chunks_carry_pdf_page(self):
        chunks = chunk_doc({"source": "a.pdf", "pages": [(1, "First page text."), (2, "Second page text.")]})
        self.assertEqual([c["page"] for c in chunks], [1, 2])

    def test_eval_set_is_big_enough(self):
        self.assertGreaterEqual(len(CASES), 25)

    def test_retrieval_quality_floor(self):
        m = retrieval_metrics(INDEX, CASES, "hybrid")
        print(f"\nhybrid hit@4={m['hit_at_k']:.2f} MRR={m['mrr']:.2f}")
        self.assertGreaterEqual(m["hit_at_k"], 0.9)
        self.assertGreaterEqual(m["mrr"], 0.8)

    def test_hybrid_not_worse_than_lexical_mrr(self):
        self.assertGreaterEqual(retrieval_metrics(INDEX, CASES, "hybrid")["mrr"] + 0.05, retrieval_metrics(INDEX, CASES, "lexical")["mrr"])

    def test_mock_answer_quality_floor(self):
        m = answer_metrics(INDEX, CASES, "mock")
        print(f"answer_correct={m['answer_correct']:.2f} correct_refusals={m['correct_refusals']:.2f}")
        self.assertGreaterEqual(m["answer_correct"], 0.75)
        self.assertEqual(m["correct_refusals"], 1.0)

    def test_validate_drops_invalid_citations(self):
        hits = [{"id": "C1"}, {"id": "C2"}]
        self.assertEqual(validate({"answer": "Yes [C1] [C9]", "citations": ["C1", "C9"]}, hits), {"answer": "Yes [C1]", "citations": ["C1"]})
        self.assertEqual(validate({"answer": "Unsupported", "citations": ["C9"]}, hits)["answer"], REFUSAL)

    def test_unreadable_files_are_reported_not_fatal(self):
        with tempfile.TemporaryDirectory() as d:
            (Path(d) / "good.md").write_text("# Good\n\nSome useful text about widgets.")
            (Path(d) / "bad.pdf").write_bytes(b"not a pdf")
            docs, errors = load_folder(d)
            self.assertEqual([x["source"] for x in docs], ["good.md"])
            self.assertEqual([e["source"] for e in errors], ["bad.pdf"])

    def test_empty_or_missing_folder_rejected(self):
        with tempfile.TemporaryDirectory() as d, self.assertRaises(ValueError):
            load_folder(d)
        with self.assertRaises(ValueError):
            load_folder(ROOT / "nope")


if __name__ == "__main__":
    unittest.main()
