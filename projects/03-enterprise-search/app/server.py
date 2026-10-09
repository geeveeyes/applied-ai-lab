import json
import os
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlparse

from .answer import answer
from .chunking import STRATEGIES
from .embeddings import HashingEmbedder, OpenAIEmbedder
from .index import MODES, ROLES, Index, load_corpus

ROOT = Path(__file__).resolve().parent
PROJECT = ROOT.parent
MAX_QUESTION = 500
INDEXES = {}


def load_env():
    path = PROJECT / ".env"
    if path.exists():
        for line in path.read_text().splitlines():
            if line.strip() and not line.lstrip().startswith("#") and "=" in line:
                key, value = line.split("=", 1)
                os.environ.setdefault(key.strip(), value.strip().strip('"').strip("'"))


def build_indexes():
    corpus = os.getenv("CORPUS_PATH") or str(PROJECT / "data" / "corpus.json")
    docs = load_corpus(corpus)
    for strategy in STRATEGIES:
        embedder = OpenAIEmbedder() if os.getenv("EMBEDDINGS") == "openai" else HashingEmbedder()
        INDEXES[strategy] = Index(docs, strategy, embedder)
    return docs


def run_query(data):
    question = str(data.get("question") or "").strip()
    if len(question) < 3:
        raise ValueError("Enter a question.")
    if len(question) > MAX_QUESTION:
        raise ValueError(f"Question is limited to {MAX_QUESTION} characters.")
    strategy, mode, viewer = data.get("chunking", "structure"), data.get("mode", "hybrid"), data.get("viewer", "employee")
    if strategy not in INDEXES or mode not in MODES or viewer not in ROLES:
        raise ValueError("Unknown chunking, mode, or viewer.")
    k = max(1, min(int(data.get("top_k") or 4), 8))
    found = INDEXES[strategy].search(question, mode=mode, k=k, rerank=bool(data.get("rerank", True)), viewer=viewer)
    provider = str(data.get("provider") or "mock")
    result, usage = answer(question, found["hits"], provider) if data.get("answer", True) else (None, None)
    return {"question": question, "hits": found["hits"], "latency_ms": round(found["latency_ms"], 2), "result": result, "usage": usage, "provider": provider}


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT / "static"), **kwargs)

    def do_GET(self):
        path = urlparse(self.path).path
        if path == "/health":
            self.send_json({"ok": True})
        elif path == "/api/config":
            first = INDEXES["structure"]
            self.send_json({"modes": MODES, "chunking": STRATEGIES, "viewers": list(ROLES), "embedder": first.embedder.name, "documents": len(first.docs), "chunks": {s: i.stats["chunks"] for s, i in INDEXES.items()}})
        else:
            super().do_GET()

    def do_POST(self):
        if urlparse(self.path).path != "/api/ask":
            self.send_error(404)
            return
        try:
            length = int(self.headers.get("Content-Length", "0"))
            if length > 5000:
                raise ValueError("Request is too large.")
            self.send_json(run_query(json.loads(self.rfile.read(length))))
        except (ValueError, json.JSONDecodeError) as error:
            self.send_json({"error": str(error)}, 400)
        except Exception as error:
            self.send_json({"error": str(error)}, 502)

    def send_json(self, data, status=200):
        body = json.dumps(data).encode()
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, *args):
        pass


def main():
    load_env()
    docs = build_indexes()
    port = int(os.getenv("PORT", "8003"))
    server = ThreadingHTTPServer(("127.0.0.1", port), Handler)
    print(f"Enterprise Search ({len(docs)} documents) running at http://127.0.0.1:{port}", flush=True)
    server.serve_forever()


if __name__ == "__main__":
    main()
