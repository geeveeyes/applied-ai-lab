import json
import unittest
from pathlib import Path

from app.answer import answer, enforce_citations, prompt_for
from app.chunking import STRATEGIES, chunk_documents
from app.embeddings import OpenAIEmbedder
from app.index import Index, load_corpus
from evals.benchmark import answer_quality, evaluate

ROOT = Path(__file__).resolve().parent.parent
DOCS = load_corpus(ROOT / "data" / "corpus.json")
QA = json.loads((ROOT / "evals" / "qa.json").read_text())


class RetrievalTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.index = Index(DOCS, "structure")

    def test_hybrid_with_rerank_meets_quality_floor(self):
        scores = evaluate(self.index, QA, "hybrid", True, repeats=1)
        self.assertGreaterEqual(scores["context_recall"], 0.9)
        self.assertGreaterEqual(scores["mrr"], 0.85)

    def test_every_strategy_retrieves_most_facts(self):
        for strategy in STRATEGIES:
            scores = evaluate(Index(DOCS, strategy), QA, "hybrid", False, repeats=1)
            self.assertGreaterEqual(scores["context_recall"], 0.9, strategy)

    def test_semantic_ranks_paraphrased_question_first(self):
        question = "How soon must I report a stolen laptop?"
        semantic = [h["doc_id"] for h in self.index.search(question, "semantic", k=1, viewer="exec")["hits"]]
        self.assertEqual(semantic, ["confluence-security-basics"])

    def test_acl_filters_before_ranking(self):
        for mode in ("keyword", "semantic", "hybrid"):
            hits = self.index.search("Q3 ARR net revenue retention cash runway", mode, k=8, viewer="employee")["hits"]
            self.assertNotIn("email-board-update", {h["doc_id"] for h in hits}, mode)
        hits = self.index.search("Q3 ARR net revenue retention", "hybrid", k=3, viewer="exec")["hits"]
        self.assertEqual(hits[0]["doc_id"], "email-board-update")

    def test_incremental_ingest_reuses_embeddings_for_paid_embedders(self):
        class Fake:
            name = "fake"
            calls = 0
            def fit(self, texts): pass
            def embed(self, text): return {0: 1.0}
            def embed_many(self, texts):
                Fake.calls += len(texts)
                return [{0: 1.0} for _ in texts]
        index = Index(DOCS, "paragraph", Fake())
        first = Fake.calls
        index.ingest(DOCS)
        self.assertEqual(Fake.calls, first)
        self.assertEqual(index.stats["skipped_unchanged"], index.stats["chunks"])

    def test_chunk_ids_unique_and_documents_covered(self):
        for strategy in STRATEGIES:
            chunks = chunk_documents(DOCS, strategy)
            self.assertEqual(len({c["id"] for c in chunks}), len(chunks))
            self.assertEqual({c["doc_id"] for c in chunks}, {d["id"] for d in DOCS})


class AnswerTests(unittest.TestCase):
    HITS = [{"chunk_id": "a#0", "title": "A", "source": "confluence", "text": "Meals are reimbursed up to $75 per day.", "rank": 1}]

    def test_invalid_and_unsupported_claims_are_dropped(self):
        raw = {"claims": [
            {"text": "Meals are reimbursed up to $75 per day.", "citations": ["a#0"]},
            {"text": "Meals are reimbursed up to $75 per day.", "citations": ["zzz"]},
            {"text": "Employees get free pizza on Fridays.", "citations": ["a#0"]},
        ]}
        result = enforce_citations(raw, self.HITS)
        self.assertEqual(len(result["claims"]), 1)
        self.assertEqual([d["reason"] for d in result["dropped"]], ["no valid citation", "not supported by cited chunk"])

    def test_refuses_when_nothing_is_supported(self):
        result = enforce_citations({"claims": [{"text": "Invented fact about pets", "citations": ["a#0"]}]}, self.HITS)
        self.assertTrue(result["refused"])

    def test_answer_quality_floor_with_mock(self):
        stats = answer_quality(Index(DOCS, "structure"), QA)
        self.assertEqual(stats["valid_citations"], stats["claims"])
        self.assertEqual(stats["refused_correctly"], stats["refusal_expected"])
        self.assertGreaterEqual(stats["answer_has_fact"] / stats["answerable"], 0.6)

    def test_prompt_puts_instructions_and_context_before_question(self):
        prompt = prompt_for("What is the meal limit?", self.HITS)
        self.assertLess(prompt.index("Return JSON"), prompt.index("Context chunks"))
        self.assertLess(prompt.index("$75"), prompt.index("Question:"))

    def test_openai_embedder_batches_and_normalizes(self):
        import os
        os.environ["OPENAI_API_KEY"] = "test"
        calls = []
        def post(url, body, headers):
            calls.append(len(body["input"]))
            return {"data": [{"index": i, "embedding": [3.0, 4.0]} for i in reversed(range(len(body["input"])))]}
        vectors = OpenAIEmbedder().embed_many(["x"] * 70, post=post)
        self.assertEqual(calls, [64, 6])
        self.assertAlmostEqual(vectors[0][1], 0.8)


if __name__ == "__main__":
    unittest.main()
