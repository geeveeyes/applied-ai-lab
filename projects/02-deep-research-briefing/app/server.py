import json
import os
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlparse

from .providers import complete
from .research import normalize, prepare

ROOT = Path(__file__).resolve().parent


def load_env():
    path = ROOT.parent / ".env"
    if path.exists():
        for line in path.read_text().splitlines():
            if line.strip() and not line.lstrip().startswith("#") and "=" in line:
                key, value = line.split("=", 1)
                os.environ.setdefault(key.strip(), value.strip().strip('"').strip("'"))


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT / "static"), **kwargs)

    def do_GET(self):
        if urlparse(self.path).path == "/health":
            self.send_json({"ok": True})
        else:
            super().do_GET()

    def do_POST(self):
        if urlparse(self.path).path != "/api/research":
            self.send_error(404)
            return
        try:
            length = int(self.headers.get("Content-Length", "0"))
            if length > 35000:
                raise ValueError("Request is too large.")
            data = json.loads(self.rfile.read(length))
            context = prepare(data.get("question"), data.get("sources"))
            provider = str(data.get("provider") or "mock")
            raw_result, usage = complete(provider, context)
            result = normalize(raw_result, context)
            self.send_json({"provider": provider, "result": result, "usage": usage})
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
    port = int(os.getenv("PORT", "8002"))
    server = ThreadingHTTPServer(("127.0.0.1", port), Handler)
    print(f"Deep Research Briefing Agent running at http://127.0.0.1:{port}", flush=True)
    server.serve_forever()


if __name__ == "__main__":
    main()
