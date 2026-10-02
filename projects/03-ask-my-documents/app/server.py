import json
import os
import threading
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlparse

from .embedders import get_embedder
from .loader import load_folder
from .providers import generate
from .rag import MODES, Index

ROOT = Path(__file__).resolve().parent
PROJECT = ROOT.parent
MAX_BODY = 4000
MAX_QUESTION = 500
LOCK = threading.Lock()
STATE = {}  # provider -> {"index", "stats", "errors"}


def docs_dir():
    return Path(os.getenv("DOCS_DIR") or PROJECT / "sample_docs")


def load_env():
    path = PROJECT / ".env"
    if path.exists():
        for line in path.read_text().splitlines():
            if line.strip() and not line.lstrip().startswith("#") and "=" in line:
                key, value = line.split("=", 1)
                os.environ.setdefault(key.strip(), value.strip().strip('"').strip("'"))


def ingest(provider):
    """(Re)build the index; unchanged files reuse cached vectors. The folder is fixed server-side."""
    docs, errors = load_folder(docs_dir())
    index, stats = Index.build(docs, get_embedder(provider), cache_path=PROJECT / ".index" / f"{provider}.json")
    with LOCK:
        STATE[provider] = {"index": index, "stats": stats, "errors": errors}
    return {"provider": provider, "stats": stats, "errors": errors, "files": [d["source"] for d in docs]}


def ask(provider, question, mode):
    question = " ".join(str(question or "").split())
    if len(question) < 3:
        raise ValueError("Ask a question of at least 3 characters.")
    if len(question) > MAX_QUESTION:
        raise ValueError(f"Questions are limited to {MAX_QUESTION} characters.")
    if mode not in MODES:
        raise ValueError("Unknown retrieval mode.")
    if provider not in STATE:
        if provider != "mock":
            raise ValueError("Index this folder with OpenAI first (this embeds your documents and uses API credits).")
        ingest("mock")
    index = STATE[provider]["index"]
    hits = index.search(question, mode=mode)
    result, usage = generate(provider, question, hits)
    return {"provider": provider, "mode": mode, **result, "sources": hits, "usage": usage}


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT / "static"), **kwargs)

    def do_GET(self):
        path = urlparse(self.path).path
        if path == "/health":
            self.send_json({"ok": True})
        elif path == "/api/status":
            self.send_json({"folder": docs_dir().name, "openai_configured": bool(os.getenv("OPENAI_API_KEY")),
                            "indexed": {p: s["stats"]["chunks"] for p, s in STATE.items()}})
        else:
            super().do_GET()

    def do_POST(self):
        path = urlparse(self.path).path
        if path not in ("/api/ask", "/api/ingest"):
            self.send_error(404)
            return
        try:
            length = int(self.headers.get("Content-Length", "0"))
            if length > MAX_BODY:
                raise ValueError("Request is too large.")
            data = json.loads(self.rfile.read(length) or b"{}")
            provider = str(data.get("provider") or "mock")
            if path == "/api/ingest":
                self.send_json(ingest(provider))
            else:
                self.send_json(ask(provider, data.get("question"), str(data.get("mode") or "hybrid")))
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


def main():
    load_env()
    port = int(os.getenv("PORT", "8003"))
    server = ThreadingHTTPServer(("127.0.0.1", port), Handler)
    print(f"Ask My Documents running at http://127.0.0.1:{port}", flush=True)
    server.serve_forever()


if __name__ == "__main__":
    main()
