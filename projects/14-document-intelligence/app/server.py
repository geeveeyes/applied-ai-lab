import json
import os
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, urlparse

from .pipeline import EXTRACTORS, process

ROOT = Path(__file__).resolve().parent
PROJECT = ROOT.parent


def load_env():
    path = PROJECT / ".env"
    if path.exists():
        for line in path.read_text().splitlines():
            if line.strip() and not line.lstrip().startswith("#") and "=" in line:
                key, value = line.split("=", 1)
                os.environ.setdefault(key.strip(), value.strip().strip('"').strip("'"))


def labels():
    return json.loads((PROJECT / "data" / "labels.json").read_text())


def sample_text(doc_id):
    if doc_id not in labels():
        raise ValueError("Unknown sample.")
    return (PROJECT / "data" / "contracts" / f"{doc_id}.txt").read_text()


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT / "static"), **kwargs)

    def do_GET(self):
        url = urlparse(self.path)
        try:
            if url.path == "/health":
                self.send_json({"ok": True})
            elif url.path == "/api/config":
                self.send_json({"extractors": EXTRACTORS, "samples": list(labels())})
            elif url.path == "/api/sample":
                doc_id = parse_qs(url.query).get("id", [""])[0]
                self.send_json({"id": doc_id, "text": sample_text(doc_id), "gold": labels()[doc_id]["fields"]})
            else:
                super().do_GET()
        except ValueError as error:
            self.send_json({"error": str(error)}, 400)

    def do_POST(self):
        if urlparse(self.path).path != "/api/extract":
            self.send_error(404)
            return
        try:
            length = int(self.headers.get("Content-Length", "0"))
            if length > 70000:
                raise ValueError("Request is too large.")
            data = json.loads(self.rfile.read(length))
            result = process(str(data.get("text") or ""), str(data.get("extractor") or "rules_v2"))
            sample = data.get("sample_id")
            if sample and sample in labels():
                result["gold"] = labels()[sample]["fields"]
            self.send_json(result)
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
    port = int(os.getenv("PORT", "8014"))
    server = ThreadingHTTPServer(("127.0.0.1", port), Handler)
    print(f"Document Intelligence Pipeline running at http://127.0.0.1:{port}", flush=True)
    server.serve_forever()


if __name__ == "__main__":
    main()
