import json
import os
import tempfile
import threading
import unittest
import urllib.error
import urllib.request
from http.server import ThreadingHTTPServer
from pathlib import Path
from unittest import mock

from app import embedders, providers, server
from app.embedders import HashEmbedder, OpenAIEmbedder
from app.loader import load_folder
from app.rag import REFUSAL, Index

try:
    import pypdf  # noqa: F401
    HAVE_PYPDF = True
except ImportError:
    HAVE_PYPDF = False


def make_pdf(pages):
    """Minimal valid multi-page text PDF."""
    objs = ["<< /Type /Catalog /Pages 2 0 R >>", None, "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>"]
    kids = []
    for text in pages:
        page_n, content_n = len(objs) + 1, len(objs) + 2
        kids.append(f"{page_n} 0 R")
        stream = f"BT /F1 12 Tf 50 700 Td ({text}) Tj ET"
        objs.append(f"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents {content_n} 0 R /Resources << /Font << /F1 3 0 R >> >> >>")
        objs.append(f"<< /Length {len(stream)} >>\nstream\n{stream}\nendstream")
    objs[1] = f"<< /Type /Pages /Kids [{' '.join(kids)}] /Count {len(kids)} >>"
    out, offsets = b"%PDF-1.4\n", []
    for i, body in enumerate(objs, 1):
        offsets.append(len(out))
        out += f"{i} 0 obj\n{body}\nendobj\n".encode()
    xref = len(out)
    out += f"xref\n0 {len(objs) + 1}\n0000000000 65535 f \n".encode()
    out += b"".join(f"{o:010d} 00000 n \n".encode() for o in offsets)
    out += f"trailer\n<< /Size {len(objs) + 1} /Root 1 0 R >>\nstartxref\n{xref}\n%%EOF".encode()
    return out


class CountingEmbedder(HashEmbedder):
    def __init__(self):
        self.calls = []

    def embed(self, texts):
        self.calls.append(len(texts))
        return super().embed(texts)


class CacheTests(unittest.TestCase):
    def test_unchanged_folder_embeds_nothing_and_edits_embed_only_changed_file(self):
        with tempfile.TemporaryDirectory() as d:
            folder, cache = Path(d) / "docs", Path(d) / "idx.json"
            folder.mkdir()
            (folder / "a.md").write_text("# A\n\nAlpha facts about apples.")
            (folder / "b.md").write_text("# B\n\nBeta facts about bananas.")
            emb = CountingEmbedder()
            _, first = Index.build(load_folder(folder)[0], emb, cache)
            _, second = Index.build(load_folder(folder)[0], emb, cache)
            self.assertEqual((first["files_embedded"], second["files_embedded"], second["files_reused"]), (2, 0, 2))
            self.assertEqual(emb.calls, [2])  # second build made no embedding call
            (folder / "b.md").write_text("# B\n\nBeta facts about blueberries.")
            index, third = Index.build(load_folder(folder)[0], emb, cache)
            self.assertEqual((third["files_embedded"], third["files_reused"]), (1, 1))
            self.assertEqual(index.search("blueberries")[0]["source"], "b.md")

    def test_changing_embedder_invalidates_cache(self):
        with tempfile.TemporaryDirectory() as d:
            (Path(d) / "a.md").write_text("# A\n\nAlpha facts about apples.")
            cache = Path(d) / "idx.json"
            Index.build(load_folder(d)[0], HashEmbedder(), cache)
            other = CountingEmbedder()
            other.id = "other"
            _, stats = Index.build(load_folder(d)[0], other, cache)
            self.assertEqual(stats["files_embedded"], 1)


@unittest.skipUnless(HAVE_PYPDF, "pypdf not installed")
class PdfTests(unittest.TestCase):
    def test_pdf_chunks_cite_page_numbers(self):
        with tempfile.TemporaryDirectory() as d:
            (Path(d) / "report.pdf").write_bytes(make_pdf(["The warranty period is 18 months.", "Returns are accepted within 45 days."]))
            docs, errors = load_folder(d)
            self.assertEqual(errors, [])
            index, _ = Index.build(docs, HashEmbedder())
            hit = index.search("How many days do I have for returns?")[0]
            self.assertEqual((hit["source"], hit["page"]), ("report.pdf", 2))


class OpenAITests(unittest.TestCase):
    HITS = [{"id": "C1", "source": "a.md", "heading": "H", "page": None, "text": "The limit is $75 per day.", "score": 1, "lexical_hit": True, "coverage": 1}]

    def test_embedder_batches_and_normalizes(self):
        calls = []

        def fake_post(url, body, headers):
            calls.append(body["input"])
            return {"data": [{"index": i, "embedding": [3.0, 4.0]} for i in range(len(body["input"]))], "usage": {"total_tokens": 7}}

        with mock.patch.dict(os.environ, {"OPENAI_API_KEY": "k"}), mock.patch.object(embedders, "post", fake_post):
            vectors, used = OpenAIEmbedder().embed([f"t{i}" for i in range(100)])
        self.assertEqual([len(c) for c in calls], [96, 4])
        self.assertEqual((vectors[0], used), ([0.6, 0.8], 14))

    def test_missing_key_is_an_error_not_a_mock_fallback(self):
        with mock.patch.dict(os.environ, {}, clear=True):
            with self.assertRaisesRegex(ValueError, "OPENAI_API_KEY"):
                OpenAIEmbedder()
            with self.assertRaisesRegex(ValueError, "OPENAI_API_KEY"):
                providers.generate("openai", "q?", self.HITS)

    def _respond(self, payload):
        out = {"status": "completed", "output": [{"content": [{"type": "output_text", "text": json.dumps(payload)}]}],
               "usage": {"input_tokens": 100, "output_tokens": 20, "input_tokens_details": {"cached_tokens": 64}}}
        return mock.patch.object(providers, "post", lambda url, body, headers: (self.captured.update(body), out)[1])

    def setUp(self):
        self.captured = {}

    def test_generation_request_contract_and_usage(self):
        with mock.patch.dict(os.environ, {"OPENAI_API_KEY": "k"}), self._respond({"answerable": True, "answer": "$75 per day [C1]", "citations": ["C1", "C9"]}):
            result, usage = providers.generate("openai", "What is the meal limit?", self.HITS)
        self.assertEqual(result, {"answer": "$75 per day [C1]", "citations": ["C1"]})
        self.assertEqual(usage["cached_input_tokens"], 64)
        b = self.captured
        self.assertEqual((b["store"], b["text"]["format"]["strict"]), (False, True))
        self.assertTrue(b["prompt_cache_key"].startswith("applied-ai-lab:ask-my-documents:"))
        self.assertLess(b["input"].index("Context chunks"), b["input"].index("Question:"))  # stable prefix first, question last
        self.assertLessEqual(b["max_output_tokens"], 1500)

    def test_unanswerable_and_uncited_become_refusals(self):
        with mock.patch.dict(os.environ, {"OPENAI_API_KEY": "k"}):
            with self._respond({"answerable": False, "answer": "", "citations": []}):
                self.assertEqual(providers.generate("openai", "q?", self.HITS)[0]["answer"], REFUSAL)
            with self._respond({"answerable": True, "answer": "Made up", "citations": ["C7"]}):
                self.assertEqual(providers.generate("openai", "q?", self.HITS)[0]["answer"], REFUSAL)

    def test_truncated_output_raises(self):
        with mock.patch.dict(os.environ, {"OPENAI_API_KEY": "k"}), mock.patch.object(providers, "post", lambda *a: {"status": "incomplete"}):
            with self.assertRaisesRegex(ValueError, "cut off"):
                providers.generate("openai", "q?", self.HITS)

    def test_no_hits_skips_the_model_call(self):
        with mock.patch.object(providers, "post", side_effect=AssertionError("must not call")):
            self.assertEqual(providers.generate("openai", "q?", [])[0]["answer"], REFUSAL)

    def test_context_budget_is_enforced(self):
        big = [{**self.HITS[0], "id": f"C{i}", "text": "x" * 2500} for i in range(1, 6)]
        _, used = providers.build_context(big)
        self.assertLess(used, 5)


class ServerTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.httpd = ThreadingHTTPServer(("127.0.0.1", 0), server.Handler)
        cls.port = cls.httpd.server_address[1]
        threading.Thread(target=cls.httpd.serve_forever, daemon=True).start()

    @classmethod
    def tearDownClass(cls):
        cls.httpd.shutdown()

    def post(self, path, body):
        req = urllib.request.Request(f"http://127.0.0.1:{self.port}{path}", json.dumps(body).encode(), {"Content-Type": "application/json"})
        try:
            with urllib.request.urlopen(req) as r:
                return r.status, json.load(r)
        except urllib.error.HTTPError as e:
            return e.code, json.load(e)

    def test_ask_returns_cited_answer_with_sources(self):
        status, data = self.post("/api/ask", {"question": "How many vacation days do I get per year?", "provider": "mock"})
        self.assertEqual(status, 200)
        self.assertIn("20 days", data["answer"])
        self.assertTrue(set(data["citations"]) <= {s["id"] for s in data["sources"]})

    def test_validation_and_limits(self):
        self.assertEqual(self.post("/api/ask", {"question": "x" * 600, "provider": "mock"})[0], 400)
        self.assertEqual(self.post("/api/ask", {"question": "hi", "provider": "mock"})[0], 400)
        self.assertEqual(self.post("/api/ask", {"question": "valid question here", "mode": "bogus"})[0], 400)
        self.assertEqual(self.post("/api/ask", {"question": "valid question here", "provider": "anthropic"})[0], 400)
        self.assertEqual(self.post("/api/ask", {"question": "x" * 5000})[0], 400)

    def test_openai_requires_explicit_ingest_before_spending(self):
        server.STATE.pop("openai", None)
        status, data = self.post("/api/ask", {"question": "valid question here", "provider": "openai"})
        self.assertEqual(status, 400)
        self.assertIn("first", data["error"])

    def test_ingest_reports_stats(self):
        status, data = self.post("/api/ingest", {"provider": "mock"})
        self.assertEqual(status, 200)
        self.assertGreaterEqual(len(data["files"]), 10)

    def test_documents_folder_cannot_be_chosen_by_request(self):
        status, data = self.post("/api/ingest", {"provider": "mock", "folder": "/etc"})
        self.assertEqual(status, 200)
        self.assertNotIn("passwd", " ".join(data["files"]))


if __name__ == "__main__":
    unittest.main()
